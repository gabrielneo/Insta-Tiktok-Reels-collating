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
}

export interface ParseReelsSuccess {
  results: Recommendation[];
  failed: { reel_url: string; reason: string }[];
  usedFallback: boolean;
}

export interface ParseReelsError {
  error: string;
}
