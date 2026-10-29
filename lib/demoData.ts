import type { GeocodeResult, Recommendation } from "./types";

// ---------------------------------------------------------------------------
// Built-in demo
// ---------------------------------------------------------------------------
// Runs entirely in the browser: no scraping, no AI calls, no Google lookups,
// no keys and no cost. It walks through the same steps as a real run so new
// users can see the whole flow before setting anything up.
//
// The links are made-up examples (they won't open real videos). The places
// are real, well-known spots so the map export lands somewhere sensible.

export const DEMO_LINKS = [
  "https://www.instagram.com/reel/DEMO-tokyo-eats/",
  "https://www.tiktok.com/@demo.foodie/video/7000000000000000001",
  "https://www.instagram.com/reel/DEMO-sg-hawkers/",
  "https://www.tiktok.com/@demo.foodie/video/7000000000000000002",
  "https://www.instagram.com/reel/DEMO-private-video/",
];

export const DEMO_STEPS = [
  { label: "Checking 5 links (3 Instagram, 2 TikTok)…", ms: 700 },
  { label: "Fetching captions with Apify…", ms: 1600 },
  { label: "AI is reading each caption and picking out places…", ms: 1800 },
  { label: "Tidying up the results…", ms: 500 },
];

const [tokyoReel, bangkokTikTok, singaporeReel, kualaLumpurTikTok, privateReel] = DEMO_LINKS;

export const DEMO_RECOMMENDATIONS: Recommendation[] = [
  {
    reel_url: tokyoReel,
    place_name: "Ichiran Ramen Shibuya",
    category: "Food & Drink",
    location: "Shibuya, Tokyo, Japan",
    recommended_activities: "Tonkotsu ramen in a solo booth; add extra garlic and a soft egg.",
    price_range: "$$",
    rating_or_notes: "Open 24 hours. Queue is shortest after 10pm.",
  },
  {
    reel_url: tokyoReel,
    place_name: "Tsukiji Outer Market",
    category: "Food & Drink",
    location: "Chuo City, Tokyo, Japan",
    recommended_activities: "Tamagoyaki on a stick, fresh uni and a tuna rice bowl.",
    price_range: "$$",
    rating_or_notes: "Go before 10am; many stalls close by early afternoon.",
  },
  {
    reel_url: bangkokTikTok,
    place_name: "Chatuchak Weekend Market",
    category: "Shopping",
    location: "Bangkok, Thailand",
    recommended_activities: "Coconut ice cream, mango sticky rice, and vintage stalls.",
    price_range: "$",
    rating_or_notes: "Weekends only. Bring cash and expect to bargain.",
  },
  {
    reel_url: singaporeReel,
    place_name: "Maxwell Food Centre",
    category: "Food & Drink",
    location: "Chinatown, Singapore",
    recommended_activities: "Hainanese chicken rice and a cup of sugarcane juice.",
    price_range: "$",
    rating_or_notes: "Popular stalls sell out by early afternoon.",
  },
  {
    reel_url: singaporeReel,
    place_name: "Lau Pa Sat",
    category: "Food & Drink",
    location: "Downtown Core, Singapore",
    recommended_activities: "Satay Street opens in the evening; order mixed satay sets.",
    price_range: "$",
    rating_or_notes: "Satay Street starts around 7pm.",
  },
  {
    reel_url: singaporeReel,
    place_name: "Gardens by the Bay",
    category: "Sightseeing",
    location: "Marina Bay, Singapore",
    recommended_activities: "Supertree Grove light show after dinner.",
    price_range: "N/A",
    rating_or_notes: "The outdoor gardens and light show are free.",
  },
  {
    reel_url: kualaLumpurTikTok,
    place_name: "Jalan Alor Night Food Street",
    category: "Food & Drink",
    location: "Bukit Bintang, Kuala Lumpur, Malaysia",
    recommended_activities: "Grilled chicken wings, char kuey teow and durian.",
    price_range: "$",
    rating_or_notes: "Liveliest after 7pm.",
  },
  {
    reel_url: kualaLumpurTikTok,
    place_name: "Hidden noodle stall near the night market",
    category: "Food & Drink",
    location: "Unknown",
    recommended_activities: "Curry laksa recommended by the creator.",
    price_range: "$",
    rating_or_notes: "Caption never names the stall, so it can't be found on the map.",
  },
];

export const DEMO_FAILED = [
  {
    reel_url: privateReel,
    reason:
      "No caption could be fetched. The video may be private, deleted, region-locked, or have no caption. (APIFY_EMPTY_RESPONSE)",
  },
];

const found = (lat: number, lng: number, address: string, name: string): GeocodeResult => ({
  status: "found",
  lat,
  lng,
  place_id: `demo-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  matched_name: name,
  formatted_address: address,
  maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${address}`)}`,
});

/** Map lookup results the demo "finds", keyed by place name. */
export const DEMO_GEO: Record<string, GeocodeResult> = {
  "Ichiran Ramen Shibuya": found(35.6614, 139.701, "Jinnan, Shibuya City, Tokyo, Japan", "Ichiran Ramen Shibuya"),
  "Tsukiji Outer Market": found(35.6655, 139.7707, "Tsukiji, Chuo City, Tokyo, Japan", "Tsukiji Outer Market"),
  "Chatuchak Weekend Market": found(13.7999, 100.5505, "Chatuchak, Bangkok, Thailand", "Chatuchak Weekend Market"),
  "Maxwell Food Centre": found(1.2803, 103.8448, "1 Kadayanallur St, Singapore", "Maxwell Food Centre"),
  "Lau Pa Sat": found(1.2806, 103.8504, "18 Raffles Quay, Singapore", "Lau Pa Sat"),
  "Gardens by the Bay": found(1.2816, 103.8636, "18 Marina Gardens Dr, Singapore", "Gardens by the Bay"),
  "Jalan Alor Night Food Street": found(3.1455, 101.7089, "Jalan Alor, Bukit Bintang, Kuala Lumpur, Malaysia", "Jalan Alor"),
  "Hidden noodle stall near the night market": { status: "not_found" },
};

export const DEMO_GEOCODE_MS = 1500;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
