import { NextRequest, NextResponse } from "next/server";
import {
  CATEGORIES,
  PRICE_RANGES,
  type Recommendation,
  type Category,
  type PriceRange,
} from "@/lib/types";
import { z } from "zod";
import { env } from "@/lib/env";
import { generateJson, isAiConfigured } from "@/lib/llm";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
// This route is written to work out of the box with no keys configured
// (it returns clearly-labelled fallback sample data), and to upgrade
// automatically to real extraction once AI_PROVIDER is set. Any supported
// model can do the extraction — see lib/aiProviders.ts.
//
// Real ingestion can optionally use APIFY_API_TOKEN when you want to fetch
// reel captions/transcripts via an Apify actor. The rest of the pipeline
// (LLM structuring, validation, response shape) does not need to change.
//
// All keys come from the validated `env` object (lib/env.ts) — never read
// process.env directly in this file.

const MAX_URLS_PER_REQUEST = 50;
const MAX_APIFY_URLS_PER_RUN = 5;
// Sized for the smallest context windows among supported providers.
const MAX_AI_INPUT_CHARS = 18000;
const MIN_AI_CHUNK_CHARS = 2000;

// ---------------------------------------------------------------------------
// Supported platforms
// ---------------------------------------------------------------------------
// Each platform has its own Apify actor. `getVideoId` pulls the id out of a
// submitted link so scraped items can be matched back to it; short links
// (vm.tiktok.com/...) carry no id and fall back to positional matching.
type Platform = "instagram" | "tiktok";

const PLATFORMS: Record<
  Platform,
  {
    pattern: RegExp;
    getVideoId: (url: string) => string;
    actorId: string;
    buildInput: (urls: string[]) => Record<string, unknown>;
  }
> = {
  instagram: {
    pattern: /^https?:\/\/(www\.)?instagram\.com\/(reel|p|reels)\/[^/\s]+\/?/i,
    getVideoId: (url) => url.match(/\/(?:reel|p|reels)\/([^/?\s]+)/)?.[1] ?? "",
    actorId: "apify~instagram-scraper",
    buildInput: (urls) => ({
      directUrls: urls,
      resultsType: "details",
      maxItems: urls.length,
    }),
  },
  tiktok: {
    // www.tiktok.com/@user/video/123, /@user/photo/123, tiktok.com/t/abc,
    // vm.tiktok.com/abc and vt.tiktok.com/abc
    pattern:
      /^https?:\/\/((www|m)\.)?tiktok\.com\/(@[^/\s]+\/(video|photo)\/\d+|t\/[^/\s]+)|^https?:\/\/(vm|vt)\.tiktok\.com\/[^/\s]+/i,
    getVideoId: (url) => url.match(/\/(?:video|photo)\/(\d+)/)?.[1] ?? "",
    actorId: "clockworks~tiktok-scraper",
    // Captions only: every paid add-on (downloads, comments, AI summaries) off.
    buildInput: (urls) => ({
      postURLs: urls,
      scrapeRelatedVideos: false,
      commentsPerPost: 0,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
      shouldDownloadSlideshowImages: false,
      shouldDownloadAvatars: false,
      shouldDownloadMusicCovers: false,
    }),
  },
};

function detectPlatform(url: string): Platform | null {
  for (const [platform, config] of Object.entries(PLATFORMS)) {
    if (config.pattern.test(url)) return platform as Platform;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Types for the request body
// ---------------------------------------------------------------------------
interface ParseReelsRequestBody {
  urls?: unknown;
}

// ---------------------------------------------------------------------------
// Step 1: "Ingestion" — retrieve caption/transcript text for each video.
// ---------------------------------------------------------------------------
// Real integration point: swap this for an Apify actor run, a third-party
// transcription API, or your own scraper. It should return the raw text
// (caption + spoken transcript, if available) associated with the video.

function getItemText(item: Record<string, unknown>): string {
  const text =
    typeof item.caption === "string"
      ? item.caption
      : typeof item.text === "string"
        ? item.text
        : typeof item.description === "string"
          ? item.description
          : "";

  return text.trim();
}

async function fetchReelTranscripts(urls: string[]): Promise<Map<string, string>> {
  const transcripts = new Map<string, string>();

  if (!env.APIFY_API_TOKEN) {
    for (const url of urls) {
      const platform = detectPlatform(url) ?? "instagram";
      const videoId = PLATFORMS[platform].getVideoId(url) || "unknown";
      transcripts.set(
        url,
        `[Simulated ingestion for ${platform} video ${videoId}] ` +
          `Caption and transcript text would appear here once a scraping provider ` +
          `(e.g. Apify's Instagram or TikTok Scraper, or a transcription API) is connected.`
      );
    }
    return transcripts;
  }

  const urlsByPlatform = new Map<Platform, string[]>();
  for (const url of urls) {
    const platform = detectPlatform(url);
    if (platform) urlsByPlatform.set(platform, [...(urlsByPlatform.get(platform) ?? []), url]);
  }

  for (const [platform, platformUrls] of urlsByPlatform) {
    const config = PLATFORMS[platform];
    const items = await runApifyActor(config.actorId, config.buildInput(platformUrls));

    const itemsByVideoId = new Map<string, Record<string, unknown>>();
    for (const item of items) {
      const videoId = getItemVideoId(item, config.getVideoId);
      if (videoId) itemsByVideoId.set(videoId, item);
    }

    for (const [index, url] of platformUrls.entries()) {
      const item =
        itemsByVideoId.get(config.getVideoId(url)) ??
        (items.length === platformUrls.length ? items[index] : undefined);
      if (item) {
        const text = getItemText(item);
        if (text) transcripts.set(url, text);
      }
    }
  }

  return transcripts;
}

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  // Token goes in the Authorization header, not the query string, so it
  // never lands in proxy/access logs or error traces that include the URL.
  const response = await fetch(
    `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.APIFY_API_TOKEN}`,
      },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`APIFY_ERROR: ${response.status} ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const items: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
  return items.filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null
  );
}

// Instagram items carry `shortCode`, TikTok items a numeric `id`; otherwise
// read the id out of whichever URL field the actor returned.
function getItemVideoId(
  item: Record<string, unknown>,
  getVideoId: (url: string) => string
): string {
  if (typeof item.shortCode === "string") return item.shortCode;
  if (typeof item.id === "string" && /^\d+$/.test(item.id)) return item.id;
  for (const field of ["url", "inputUrl", "webUrl", "webVideoUrl", "submittedVideoUrl"]) {
    const value = item[field];
    if (typeof value === "string" && getVideoId(value)) return getVideoId(value);
  }
  return "";
}

// ---------------------------------------------------------------------------
// Step 2: Structured extraction via whichever AI model is configured
// ---------------------------------------------------------------------------
// Anthropic enforces this schema; other providers are steered by the prompt
// and the result is normalized below either way.
const ExtractionSchema = z.object({
  items: z.array(
    z.object({
      place_name: z.string(),
      category: z.enum(CATEGORIES),
      location: z.string(),
      recommended_activities: z.string(),
      price_range: z.enum(PRICE_RANGES),
      rating_or_notes: z.string(),
    })
  ),
});

const EXTRACTION_SYSTEM_PROMPT = `You extract structured recommendations from short-form video captions/transcripts (Instagram Reels and TikTok videos) about food spots, places, and activities.

Return ONLY a JSON object of the shape: { "items": Recommendation[] }.
A single video may mention zero, one, or several distinct places/activities — return one object per distinct place.

Each Recommendation object must have exactly these fields:
- place_name: string, the specific name of the place or activity (never empty; if truly unnamed, describe it briefly, e.g. "Rooftop bar in Shibuya")
- category: one of "Food & Drink", "Adventure", "Culture", "Shopping", "Sightseeing"
- location: string, city/region/country if mentioned, else "Unknown"
- recommended_activities: string, what to do/order/try there, in one short sentence
- price_range: one of "$", "$$", "$$$", "$$$$", "N/A"
- rating_or_notes: string, any tips, warnings, or standout notes mentioned; "" if none

If the text contains no identifiable place or activity, return { "items": [] } for that reel.
Do not invent specific facts (prices, hours) that are not implied by the text — use "N/A" or reasonable general phrasing instead.`;

async function extractTranscriptChunk(
  reelUrl: string,
  transcript: string
): Promise<Recommendation[]> {
  const parsed = (await generateJson({
    system: EXTRACTION_SYSTEM_PROMPT,
    user: `Video URL: ${reelUrl}\n\nCaption/transcript text:\n${transcript}`,
    schema: ExtractionSchema,
  })) as { items?: unknown } | null;

  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  return items
    .map((item) => normalizeRecommendation(item, reelUrl))
    .filter((item): item is Recommendation => item !== null);
}

function splitTranscript(transcript: string, maxChars: number): string[] {
  const chunks: string[] = [];
  let remaining = transcript.trim();

  while (remaining.length > maxChars) {
    const boundary = Math.max(
      remaining.lastIndexOf("\n", maxChars),
      remaining.lastIndexOf(" ", maxChars)
    );
    const splitAt = boundary > 0 ? boundary : maxChars;
    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function isContextLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("413") ||
    message.includes("context") ||
    message.includes("maximum length") ||
    message.includes("token limit") ||
    message.includes("too many tokens") ||
    message.includes("request too large") ||
    message.includes("reduce the length") ||
    message.includes("prompt is too long") ||
    message.includes("input is too long")
  );
}

async function extractChunkWithRetry(
  reelUrl: string,
  transcript: string
): Promise<Recommendation[]> {
  try {
    return await extractTranscriptChunk(reelUrl, transcript);
  } catch (error) {
    if (!isContextLimitError(error) || transcript.length <= MIN_AI_CHUNK_CHARS) {
      throw error;
    }

    const smallerChunks = splitTranscript(transcript, Math.floor(transcript.length / 2));
    const results: Recommendation[] = [];
    for (const chunk of smallerChunks) {
      results.push(...(await extractChunkWithRetry(reelUrl, chunk)));
    }
    return results;
  }
}

async function extractWithLLM(
  reelUrl: string,
  transcript: string,
  onChunkComplete?: (results: Recommendation[]) => void
): Promise<Recommendation[]> {
  const results: Recommendation[] = [];
  for (const chunk of splitTranscript(transcript, MAX_AI_INPUT_CHARS)) {
    const chunkResults = await extractChunkWithRetry(reelUrl, chunk);
    results.push(...chunkResults);
    onChunkComplete?.(chunkResults);
  }

  const uniqueResults = new Map<string, Recommendation>();
  for (const result of results) {
    const key = `${result.place_name.toLowerCase()}|${result.location.toLowerCase()}`;
    uniqueResults.set(key, result);
  }
  return Array.from(uniqueResults.values());
}

// ---------------------------------------------------------------------------
// Validation / normalization helpers — guarantee the strict schema
// regardless of what the model (or fallback path) produces.
// ---------------------------------------------------------------------------
function normalizeRecommendation(
  raw: unknown,
  reelUrl: string
): Recommendation | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;

  const place_name =
    typeof item.place_name === "string" && item.place_name.trim()
      ? item.place_name.trim()
      : null;
  if (!place_name) return null;

  const category: Category = CATEGORIES.includes(item.category as Category)
    ? (item.category as Category)
    : "Sightseeing";

  const price_range: PriceRange = PRICE_RANGES.includes(
    item.price_range as PriceRange
  )
    ? (item.price_range as PriceRange)
    : "N/A";

  return {
    reel_url: reelUrl,
    place_name,
    category,
    location:
      typeof item.location === "string" && item.location.trim()
        ? item.location.trim()
        : "Unknown",
    recommended_activities:
      typeof item.recommended_activities === "string"
        ? item.recommended_activities.trim()
        : "",
    price_range,
    rating_or_notes:
      typeof item.rating_or_notes === "string"
        ? item.rating_or_notes.trim()
        : "",
  };
}

// ---------------------------------------------------------------------------
// Fallback sample data — lets the UI be exercised end-to-end with zero
// configuration. Clearly attributed back to the submitted URL so it's
// obvious in the table which rows are simulated.
// ---------------------------------------------------------------------------
const FALLBACK_TEMPLATES: Omit<Recommendation, "reel_url">[] = [
  {
    place_name: "Joe's Bakery",
    category: "Food & Drink",
    location: "Tokyo, Japan",
    recommended_activities: "Try the matcha croissant and iced dark roast.",
    price_range: "$$",
    rating_or_notes: "Must go early to avoid 40-min queues.",
  },
  {
    place_name: "Blue Ridge Overlook Trail",
    category: "Adventure",
    location: "Asheville, NC, USA",
    recommended_activities: "Sunrise hike, roughly 3 miles round trip.",
    price_range: "N/A",
    rating_or_notes: "Trailhead parking fills up by 7am on weekends.",
  },
  {
    place_name: "Fondazione Prada",
    category: "Culture",
    location: "Milan, Italy",
    recommended_activities: "See the rotating contemporary art exhibits.",
    price_range: "$$",
    rating_or_notes: "Closed on Tuesdays; check the current exhibit online.",
  },
  {
    place_name: "Chatuchak Weekend Market",
    category: "Shopping",
    location: "Bangkok, Thailand",
    recommended_activities: "Browse vintage clothing and local ceramics stalls.",
    price_range: "$",
    rating_or_notes: "Bargaining is expected; bring cash in small bills.",
  },
  {
    place_name: "Neuschwanstein Castle",
    category: "Sightseeing",
    location: "Bavaria, Germany",
    recommended_activities: "Book the guided interior tour in advance.",
    price_range: "$$$",
    rating_or_notes: "Tickets often sell out days ahead in summer.",
  },
];

function buildFallbackResult(reelUrl: string, index: number): Recommendation {
  const template = FALLBACK_TEMPLATES[index % FALLBACK_TEMPLATES.length];
  return { ...template, reel_url: reelUrl };
}

// Upstream error messages carry raw provider response bodies (needed for
// the token-limit retry check). Log those server-side and send the client
// only the error code and HTTP status, e.g. "AI_ERROR: 401".
function toClientReason(err: unknown, fallback: string): string {
  if (!(err instanceof Error)) return fallback;
  console.error(`[parse-reels] ${err.message}`);
  return err.message.match(/^[A-Z_]+(: \d{3})?/)?.[0] ?? fallback;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let body: ParseReelsRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const rawUrls = body.urls;
  if (!Array.isArray(rawUrls) || rawUrls.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty array of Instagram Reel or TikTok video URLs under `urls`." },
      { status: 400 }
    );
  }

  const cleanedUrls = Array.from(
    new Set(
      rawUrls
        .filter((u): u is string => typeof u === "string")
        .map((u) => u.trim())
        .filter(Boolean)
    )
  );

  if (cleanedUrls.length === 0) {
    return NextResponse.json(
      { error: "No valid URLs were found in the request." },
      { status: 400 }
    );
  }

  // Each URL costs paid Apify + AI provider calls, so cap the batch size.
  if (cleanedUrls.length > MAX_URLS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Submit at most ${MAX_URLS_PER_REQUEST} URLs per request.` },
      { status: 400 }
    );
  }

  const validUrls: string[] = [];
  const failed: { reel_url: string; reason: string }[] = [];
  for (const url of cleanedUrls) {
    if (detectPlatform(url)) {
      validUrls.push(url);
    } else {
      failed.push({ reel_url: url, reason: "Not a recognized Instagram Reel or TikTok video URL." });
    }
  }

  if (validUrls.length === 0) {
    return NextResponse.json(
      { error: "None of the submitted URLs look like Instagram Reel or TikTok links." },
      { status: 400 }
    );
  }

  const usedFallback = !isAiConfigured();
  const results: Recommendation[] = [];
  const resultKeys = new Set<string>();

  const storeResults = (newResults: Recommendation[]) => {
    for (const result of newResults) {
      const key = `${result.reel_url}|${result.place_name.toLowerCase()}|${result.location.toLowerCase()}`;
      if (!resultKeys.has(key)) {
        resultKeys.add(key);
        results.push(result);
      }
    }
  };

  for (let i = 0; i < validUrls.length; i += MAX_APIFY_URLS_PER_RUN) {
    const batch = validUrls.slice(i, i + MAX_APIFY_URLS_PER_RUN);

    if (usedFallback) {
      for (const [offset, url] of batch.entries()) {
        storeResults([buildFallbackResult(url, i + offset)]);
      }
      continue;
    }

    let transcripts: Map<string, string>;
    try {
      transcripts = await fetchReelTranscripts(batch);
    } catch (err) {
      const reason = toClientReason(err, "Apify ingestion error.");
      for (const url of batch) {
        failed.push({ reel_url: url, reason });
      }
      continue;
    }

    for (const url of batch) {
      let extractedCount = 0;

      try {
        const transcript = transcripts.get(url);
        if (!transcript) {
          throw new Error("APIFY_EMPTY_RESPONSE");
        }

        await extractWithLLM(url, transcript, (chunkResults) => {
          extractedCount += chunkResults.length;
          storeResults(chunkResults);
        });

        if (extractedCount === 0) {
          failed.push({
            reel_url: url,
            reason: "No identifiable place or activity found in this reel.",
          });
        }
      } catch (err) {
        failed.push({
          reel_url: url,
          reason: toClientReason(err, "Unknown extraction error."),
        });
      }
    }
  }

  return NextResponse.json({
    results,
    failed,
    usedFallback,
  });
}
