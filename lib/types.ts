export const CATEGORIES = [
  "Food & Drink",
  "Adventure",
  "Culture",
  "Shopping",
  "Sightseeing",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRICE_RANGES = ["$", "$$", "$$$", "$$$$", "N/A"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

export interface Recommendation {
  reel_url: string;
  place_name: string;
  category: Category;
  location: string;
  recommended_activities: string;
  price_range: PriceRange;
  rating_or_notes: string;
  /** Set after "Find on Google Maps" runs for this entry. */
  geo?: GeocodeResult;
}

export type GeocodeResult =
  | {
      status: "found";
      lat: number;
      lng: number;
      place_id: string;
      matched_name: string;
      formatted_address: string;
      maps_url: string;
    }
  | { status: "not_found" }
  | { status: "error"; reason: string };

/** Which optional services the server has keys for (never the keys themselves). */
export interface ServiceStatus {
  ai: boolean;
  apify: boolean;
  maps: boolean;
}

export interface ParseReelsSuccess {
  results: Recommendation[];
  failed: { reel_url: string; reason: string }[];
  usedFallback: boolean;
}

export interface ParseReelsError {
  error: string;
}
