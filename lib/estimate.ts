import type { ServiceStatus } from "./types";

// ---------------------------------------------------------------------------
// Rough duration estimates shown before and during long-running steps
// ---------------------------------------------------------------------------
// Based on typical timings, not guarantees: Apify scraper runs start a fresh
// browser each time, and AI response times vary a lot by provider and model.

const APIFY_BATCH_SIZE = 5;
const APIFY_SECONDS_PER_BATCH = [20, 60] as const;
const AI_SECONDS_PER_VIDEO = [5, 20] as const;
const GEOCODE_SECONDS_PER_PLACE = [0.3, 1] as const;

export type Range = readonly [number, number];

export function estimateExtraction(linkCount: number, status: ServiceStatus | null): Range {
  if (linkCount === 0 || (status && !status.ai)) return [0, 2]; // demo mode is near-instant
  const batches = Math.ceil(linkCount / APIFY_BATCH_SIZE);
  const scrape: Range = status?.apify === false ? [0, 0] : [
    batches * APIFY_SECONDS_PER_BATCH[0],
    batches * APIFY_SECONDS_PER_BATCH[1],
  ];
  return [
    scrape[0] + linkCount * AI_SECONDS_PER_VIDEO[0],
    scrape[1] + linkCount * AI_SECONDS_PER_VIDEO[1],
  ];
}

export function estimateGeocoding(placeCount: number): Range {
  return [
    Math.max(1, placeCount * GEOCODE_SECONDS_PER_PLACE[0]),
    Math.max(2, placeCount * GEOCODE_SECONDS_PER_PLACE[1]),
  ];
}

export function formatSeconds(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m}m ${rest}s` : `${m}m`;
}

export function formatRange([low, high]: Range): string {
  if (high <= 5) return "a few seconds";
  if (high < 60) return `${formatSeconds(low)}–${formatSeconds(high)}`;
  const lowMin = Math.max(1, Math.round(low / 60));
  const highMin = Math.max(lowMin + 1, Math.round(high / 60));
  return `about ${lowMin}–${highMin} min`;
}
