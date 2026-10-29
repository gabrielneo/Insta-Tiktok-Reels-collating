# Fieldnotes 🍜 — turn your saved food reels and TikToks into an actual list

> **Too lazy to rewatch every video? Got hundreds of food reels and TikToks
> saved in your collection that you'll "definitely check out one day"? A foodie
> like me?**
>
> Same. So I built this.

Every time I scrolled Instagram or TikTok I'd save another *"top 5 hidden
ramen spots"* or *"you HAVE to try this café"* video. Months later I had a
huge collection and no idea what was in it. When I actually wanted somewhere
to eat, I'd have to sit and rewatch video after video just to find a name and
an address.

**Fieldnotes does the watching for you.** Paste in a batch of Instagram Reel
or TikTok links and an AI model reads each one's caption and pulls out every
place it mentions: the name, where it is, what to order, roughly how pricey it
is, and any tips. Everything lands in one searchable table you can filter and
export to Excel.

```
 your saved videos         Fieldnotes                     your list
 ┌──────────────┐      ┌────────────────┐      ┌──────────────────────────────┐
 │ IG reel      │      │ 1. fetch the   │      │ Ichiran Ramen · Tokyo · $$   │
 │ TikTok video │ ───▶ │    captions    │ ───▶ │ Café Kitsuné · Paris · $$    │
 │ IG reel      │      │ 2. AI picks out│      │ Hawker 101 · Singapore · $   │
 │ ...          │      │    the places  │      │ ...search · filter · export  │
 └──────────────┘      └────────────────┘      └──────────────────────────────┘
```

## What you get

- 📱 **Instagram Reels and TikTok:** mix both in the same batch
- 📋 **Bulk paste:** drop in up to 50 links at once
- 🍽️ **Every spot pulled out:** one reel that mentions five places gives you five rows
- 🔎 **Search and filter** by name, location or category (Food & Drink, Adventure, Culture, Shopping, Sightseeing)
- 📊 **Export to Excel** for trip planning, or to share with the group chat
- 🗺️ **Put it on a map:** find every place on Google Maps and import the pins into your own Google My Maps
- 🤖 **Use any AI model you like:** Claude, GPT, Gemini, Llama, Mistral, DeepSeek, or a free local model with Ollama

## See the demo first (no keys, no cost)

Using your own videos needs API keys (see the next section). To see what the
app does before you sign up for anything, run the built-in demo:

```bash
npm install
npm run dev
```

Open http://localhost:3000 for the landing page and click **Try now**, or go straight to the app at http://localhost:3000/app and click
**Start the guided demo** at the top of the page. A step-by-step guide runs Fieldnotes on 5 sample Reels and TikToks
and explains each step as it happens. You only press **Next**; the guide does
the clicking:

1. **Paste:** sample links appear in the box, with how to copy your own
2. **Extract:** the guide presses **Extract places** and you watch each stage
   (checking links, fetching captions, the AI reading them), sped up
3. **Browse:** 8 sample places across Tokyo, Bangkok, Singapore and Kuala
   Lumpur, with search and category filters, plus one failed link so you can
   see how errors are explained
4. **Map it:** the guide presses **Find on Google Maps** and shows the pins
   found (and one place that can't be found)
5. **Keep a copy:** where to export to Excel or Google My Maps

Afterwards you can keep exploring the sample results, replay the guide, or
click **Skip to sample results** to jump straight to the end. Keyboard users
can do the whole guide with Tab, Enter and Esc.

The demo runs entirely in your browser with made-up data. It doesn't use any
keys in `.env.local`, scrape anything, or cost anything. The sample links
don't open real videos. Click **Exit demo**, or paste your own links, to leave
it.

## Use it on your real videos

Your API keys only ever go into the `.env.local` file on your own computer.
The app never asks you to type them into a web page. To run it on your own
saved videos, you need three keys: **Apify** to read the videos, an **AI
model** to summarise them, and **Google Maps** (with Places API (New) turned
on) to put your places on the map.

```bash
cp .env.example .env.local    # .env.local is git-ignored, so your keys stay on your machine
```

Then fill in `.env.local`:

```bash
# Pick any AI provider. The full list with example models and key links is in .env.example
AI_PROVIDER=anthropic
AI_MODEL=claude-opus-5-5
AI_API_KEY=<your key>

# Fetches the Instagram and TikTok captions
APIFY_API_TOKEN=<your apify token>
```

Restart `npm run dev` and you're set. If something's wrong in the file, the
server won't start and tells you exactly which variable to fix.

### Which AI models work?

Pretty much all of them. Set `AI_PROVIDER` to one of:

| Provider | `AI_PROVIDER` | Notes |
|---|---|---|
| Anthropic Claude | `anthropic` | Uses the official SDK; output is checked against the schema |
| OpenAI | `openai` | |
| Google Gemini | `gemini` | |
| SambaNova | `sambanova` | |
| Groq | `groq` | Very fast |
| OpenRouter | `openrouter` | Hundreds of models through one key |
| Mistral | `mistral` | |
| DeepSeek | `deepseek` | |
| Ollama | `ollama` | Free, runs on your own machine, no key needed |
| Anything else | `custom` | Any OpenAI-compatible API. Set `AI_BASE_URL` too |

Want to add another provider? It's one entry in `lib/aiProviders.ts`.

## Get the links from your saved food collection

Copying links one by one gets old fast. Both apps let you download your saved
posts, so you can grab a whole "Food" collection in one go.

### Instagram

1. **Request your data.** In the app or on the web, go to **Settings and
   privacy → Accounts Center → Your information and permissions → Download
   your information**.
2. **Pick only your saves.** Choose to select types of information and tick
   **Saved** (saved posts and collections). Choose **HTML** if you'll pick
   links by eye, or **JSON** if you'll pull them out with a command. Set the
   date range to **All time**.
3. **Download and unzip.** Instagram emails you a link, usually within minutes
   to a few hours. Unzip it and look in the `saved` folder for
   `saved_posts` (everything you've saved) and `saved_collections` (grouped by
   collection name).

To use one collection (say, "Food"), open `saved_collections.html` in your
browser and copy the links listed under that collection.

To pull every saved link out of the JSON export at once:

```bash
grep -rhoE 'https://www\.instagram\.com/(p|reel|reels)/[A-Za-z0-9_-]+/?' path/to/unzipped/folder | sort -u > instagram-links.txt
```

### TikTok

1. **Request your data.** Go to **Profile → ☰ menu → Settings and privacy →
   Account → Download your data**.
2. **Choose the format.** Pick **JSON** (or TXT), select your data, and tap
   **Request data**. It can take from a few hours to a few days; check the
   **Download data** tab.
3. **Download and unzip.** Your saved videos are listed as **Favorite
   Videos** in the export.

To pull every TikTok link out of the export:

```bash
grep -rhoE 'https://www\.tiktok(v)?\.com/[^" ]+' path/to/unzipped/folder | sort -u > tiktok-links.txt
```

TikTok's export lists your favourites but may not split them into your named
collections. If you only want one collection, open it in the app and use
**Share → Copy link** on each video.

### Paste them into Fieldnotes

Open the `.txt` file, copy up to **50 links** at a time, and paste them into
the box on the left. Instagram and TikTok links can be mixed in one batch.

Good to know:
- Exports only contain links and collection names. The venue, address and tips
  come from each video's caption, which is what Fieldnotes reads.
- Export menus move around between app versions. If a step doesn't match what
  you see, search the app's settings for "Download your information" or
  "Download your data".

## Put your places on a map

Once your list is extracted, the **Put it on a map** panel above the table can
turn it into pins on your own [Google My Maps](https://www.google.com/maps/d/)
map.

1. Add a Google Maps key to `.env.local` and restart:
   ```bash
   GOOGLE_MAPS_API_KEY=<your key>
   ```
   In [Google Cloud Console](https://console.cloud.google.com), enable
   **Places API (New)**, create an API key, restrict it to that API, and set a
   budget alert. `.env.example` has the step-by-step.
2. Click **Find N places on Google Maps.** Each place is searched by name plus
   location. The table's **Map** column fills in with a link to the match, and
   Excel exports gain Address, Latitude, Longitude and Google Maps Link columns.
3. Click **Download for My Maps (.csv)**, then in My Maps: **Add layer →
   Import**, upload the file, tick **Latitude** and **Longitude** for the pin
   positions, and choose **Name** as the title. Style the layer by
   **Category** to colour-code the pins.

### Limitations

- **No automatic upload.** Google My Maps has no public API for adding pins,
  so you import the file yourself. It takes about 30 seconds.
- **Matches are a best guess.** Chains, closed venues, or places with an
  "Unknown" location can match the wrong branch or city. Check the pins.
- **Lookups are billable.** Each distinct place is one Places API request on
  your Google Cloud account, after Google's monthly free allowance. Check
  [current pricing](https://developers.google.com/maps/billing-and-pricing/pricing).
- **Coordinates are short-lived.** Google's terms let you keep latitude and
  longitude from the Places API for up to 30 days, so re-run the lookup for an
  old list instead of reusing an old file.
- **My Maps limits:** up to 2,000 rows per imported layer and 10 layers per map.
- **Nothing is saved.** Results only live in your browser tab. Export before
  you refresh or close it.

## How long it takes

The page shows an estimate before you start and a timer while it runs. Rough
guide:

| Step | Typical time |
|---|---|
| Scraping captions (Apify) | 20–60 s per group of 5 links |
| AI summarising | 5–20 s per video, depending on provider and model |
| A full batch of 50 links | about 8–27 minutes |
| Finding places on Google Maps | under a second per place |
| The built-in demo | about 5 seconds |

Keep the tab open while it runs; results appear when the whole batch finishes.
If you deploy the app, note that hosting platforms cut off long requests (the
extraction route asks for 5 minutes), so run large batches locally or split
them into smaller ones.

## How it works

1. **Ingestion** (`fetchReelTranscripts` in `app/api/parse-reels/route.ts`):
   each link is recognised as Instagram or TikTok and sent, in groups of
   five, to the matching Apify scraper (`apify~instagram-scraper` or
   `clockworks~tiktok-scraper`, captions only with every paid add-on off).
   Each caption is matched back to the link you submitted. Without an Apify
   token, placeholder text is used instead.

   Accepted links: `instagram.com/reel/…`, `/reels/…`, `/p/…`, and
   `tiktok.com/@user/video/…`, `/@user/photo/…`, `tiktok.com/t/…`,
   `vm.tiktok.com/…`, `vt.tiktok.com/…`, and `tiktokv.com/share/video/…` (the format in TikTok data exports). To add another platform, add an
   entry to `PLATFORMS` in the route.
2. **Summarising** (`extractWithLLM`): each caption is sent to your chosen
   model through `lib/llm.ts`, which asks for a JSON list of places. Long
   captions are split into chunks, and a chunk is halved and retried if a
   model says it's too long.
3. **Clean-up** (`normalizeRecommendation`): whatever the model returns is
   checked and reshaped into the fixed format below, so a model that goes
   off-script can't break the table.

Every recommendation ends up in this shape:

```ts
{
  reel_url: string;
  place_name: string;
  category: "Food & Drink" | "Adventure" | "Culture" | "Shopping" | "Sightseeing";
  location: string;
  recommended_activities: string;
  price_range: "$" | "$$" | "$$$" | "$$$$" | "N/A";
  rating_or_notes: string;
}
```

## Landing page

`/` is a scroll-driven 3D landing page; the app itself lives at `/app`.

- The 3D scene (`components/landing/Scene.tsx`) is built entirely in code with
  React Three Fiber and drei: reel cards, a notebook, category tokens, and a
  map with pins. There are no model files to download.
- Scrolling is smoothed with Lenis and drives the camera through GSAP
  ScrollTrigger. Each page section is a "chapter" with its own camera shot.
- Devices get the scene they can handle (`components/landing/deviceTier.ts`):
  - **Full:** desktops get post-processing and soft shadows.
  - **Lighter:** phones and modest laptops get a lighter scene. It drops
    resolution if the frame rate dips, and falls back to a still image if
    the device keeps struggling.
  - **Still illustration:** with reduced motion, Data Saver or no WebGL.
- All text and buttons are real HTML on top of the canvas, so the page works
  with screen readers and keyboards whatever the device.

GSAP is free to use but under its own [Standard licence](https://gsap.com/standard-license),
not MIT. Everything else the landing page uses is MIT or Zlib.

## Project structure

```
app/
  page.tsx                  — 3D landing page
  app/page.tsx              — the app: input panel + results workspace
  layout.tsx                — fonts, metadata
  api/parse-reels/route.ts  — ingestion + AI extraction + validation
  api/geocode/route.ts      — Google Places lookups for the map export
  api/status/route.ts       — tells the page which services are configured (no secrets)
components/
  RecommendationsTable.tsx  — search, category filters, export
  MapExportPanel.tsx        — Google Maps lookup, limitations, My Maps export
  GuidedTour.tsx            — the guided demo's step-by-step tooltips (react-joyride)
  landing/                  — landing page: Landing, Scene (3D), StaticScene, deviceTier, scrollState
lib/
  aiProviders.ts            — list of supported AI providers and their settings
  llm.ts                    — one "give me JSON" call that works with any provider
  env.ts / envSchema.ts     — loads and checks .env values at startup
  excelExport.ts            — builds the .xlsx export in the browser (SheetJS)
  demoData.ts               — sample links, results and map pins for the built-in demo
  myMapsExport.ts           — builds the CSV for Google My Maps import
  estimate.ts               — time estimates shown in the UI
  types.ts                  — shared Recommendation type
instrumentation.ts          — runs the env check when the server boots
```

## Keeping your keys safe

- Your keys live only in `.env.local`, which git ignores. Server code reads
  them through `lib/env.ts`, which is marked server-only, so they can't end up
  in the browser.
- Install [gitleaks](https://github.com/gitleaks/gitleaks) (`brew install gitleaks`)
  before your first commit. A pre-commit hook then blocks any commit that
  contains a key.
- `npm run scan:secrets` scans the whole git history for leaked keys.
- GitHub Actions runs the same secret scan plus `npm audit` on every push and pull request.
- Leaked a key anyway? Revoke it at your provider first, then remove it from
  git history with [git-filter-repo](https://github.com/newren/git-filter-repo).
- Found a security issue? See [SECURITY.md](SECURITY.md).

## Troubleshooting

### Page shows a 500 error: `Can't resolve '@vercel/turbopack-next/internal/font/google/font'`

The app loads its fonts (Inter and Source Serif 4) from Google Fonts. If the
dev server can't reach Google the first time it starts (common on a phone
hotspot or flaky Wi-Fi), Turbopack stores the failed download and keeps
showing this error, even after your connection is back.

Stop the server (`Ctrl + C`), clear the build cache, and start again:

```bash
rm -rf .next      # build cache only; safe to delete, rebuilt automatically
npm run dev
```

If it keeps happening on an unreliable connection, use the webpack bundler
instead. It starts a little slower but handles font downloads differently:

```bash
npm run dev -- --webpack
```

### `Another next dev server is already running`

Only one dev server can run per project folder. Use the one already running at
the address shown, or stop it with the `kill <PID>` command in the message.

### Server won't start: `Invalid environment configuration`

A value in `.env.local` is missing or malformed. The message names each
variable to fix and never prints its value. See `.env.example` for the
expected format.

### Error messages on failed links or map lookups

Failed links are grouped by reason, and each message says what to do. The code
in brackets at the end tells you which service failed:

| Code | What it means | What to do |
|---|---|---|
| `AI_ERROR 401` / `403` | The AI provider rejected your key | Check `AI_API_KEY` in `.env.local` is filled in, copied fully and still active for `AI_PROVIDER`, then restart |
| `AI_ERROR 404` | Model not found | Check `AI_MODEL` matches your provider's model name exactly |
| `AI_ERROR 400` / `422` | Request rejected | Check `AI_MODEL` is a chat model your provider offers |
| `AI_ERROR 402` / `429` | Rate limited or out of credit | Wait a minute, or check your provider's billing |
| `AI_ERROR 5xx` | Provider outage | Try again in a few minutes |
| `AI_CONNECTION_ERROR` | Couldn't reach the provider | Check your connection, `AI_BASE_URL`, and that Ollama or your local server is running |
| `AI_REFUSED` | The model declined this caption | Try a different `AI_MODEL` |
| `AI_TRUNCATED` / `AI_EMPTY_RESPONSE` / `AI_INVALID_JSON` | The model's answer was cut off or unreadable | Try again, or try a different `AI_MODEL` |
| `APIFY_ERROR 401` / `403` | Apify rejected your token | Check `APIFY_API_TOKEN` in `.env.local`, then restart |
| `APIFY_ERROR 402` | Out of Apify credit | Check billing at console.apify.com |
| `APIFY_ERROR 408` | Scraping timed out | Try fewer links at once |
| `APIFY_CONNECTION_ERROR` | Couldn't reach Apify | Check your connection |
| `APIFY_EMPTY_RESPONSE` | No caption came back | The video may be private, deleted, region-locked, or have no caption |
| `GOOGLE_PLACES_ERROR 400` / `401` / `403` | Google rejected your Maps key | Check `GOOGLE_MAPS_API_KEY`, and that **Places API (New)** (not the older "Places API") and billing are enabled for its project |
| `GOOGLE_PLACES_ERROR 429` | Maps quota used up | Wait, or raise the quota in Google Cloud Console |
| `GOOGLE_PLACES_CONNECTION_ERROR` | Couldn't reach Google Maps | Check your connection |

To see the app without any keys, click **Start the guided demo** at the top of the home page.

## Good to know

- One reel can give you zero, one or several places. Reels with no
  identifiable place are listed as "failed" with the reason.
- The Excel export runs entirely in your browser and includes whatever is
  currently filtered in the table.
- The free SheetJS build exports a plain header row; coloured headers need
  SheetJS Pro.
- `reel_url` in the data and the Excel "Source Link" column holds the original
  link for both Instagram and TikTok.
- Respect Instagram's and TikTok's terms and creators' work. This is for
  organising videos you've saved for yourself.

## License

[MIT](LICENSE). Use it, fork it, and go eat somewhere good.
