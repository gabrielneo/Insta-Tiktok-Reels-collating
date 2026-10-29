import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import type { GeocodeResult } from "@/lib/types";
import { describeError } from "@/lib/errorMessages";

// ---------------------------------------------------------------------------
// Geocoding via Google Places API (New) — Text Search
// ---------------------------------------------------------------------------
// Turns "place name + location" into coordinates, an address and a Google
// Maps link. Each lookup is a billable Places API call, so requests are
// capped and duplicates should be removed by the caller.
//
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search

export const maxDuration = 60;

const MAX_PLACES_PER_REQUEST = 25;
const PARALLEL_LOOKUPS = 5;
const MAX_FIELD_CHARS = 200;

// Only request what we use — the field mask decides which billing SKU applies.
const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.googleMapsUri",
].join(",");

interface PlaceQuery {
  place_name: string;
  location: string;
}

function parsePlaces(raw: unknown): PlaceQuery[] | null {
  if (!Array.isArray(raw)) return null;
  const places: PlaceQuery[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const { place_name, location } = item as Record<string, unknown>;
    if (typeof place_name !== "string" || !place_name.trim()) return null;
    places.push({
      place_name: place_name.trim().slice(0, MAX_FIELD_CHARS),
      location: typeof location === "string" ? location.trim().slice(0, MAX_FIELD_CHARS) : "",
    });
  }
  return places;
}

async function geocodePlace(apiKey: string, place: PlaceQuery): Promise<GeocodeResult> {
  const hasLocation = place.location && place.location.toLowerCase() !== "unknown";
  const textQuery = hasLocation ? `${place.place_name}, ${place.location}` : place.place_name;

  let response: Response;
  try {
    response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery, pageSize: 1 }),
    });
  } catch {
    return { status: "error", reason: describeError("GOOGLE_PLACES_CONNECTION_ERROR")! };
  }

  if (!response.ok) {
    // Google's error body can describe the key's project; keep it server-side.
    const detail = await response.text().catch(() => "");
    console.error(`[geocode] GOOGLE_PLACES_ERROR: ${response.status} ${detail.slice(0, 200)}`);
    return { status: "error", reason: describeError(`GOOGLE_PLACES_ERROR: ${response.status}`)! };
  }

  const data = await response.json().catch(() => null);
  const match = data?.places?.[0];
  const lat = match?.location?.latitude;
  const lng = match?.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number" || typeof match?.id !== "string") {
    return { status: "not_found" };
  }

  return {
    status: "found",
    lat,
    lng,
    place_id: match.id,
    matched_name: typeof match.displayName?.text === "string" ? match.displayName.text : place.place_name,
    formatted_address: typeof match.formattedAddress === "string" ? match.formattedAddress : "",
    maps_url:
      typeof match.googleMapsUri === "string"
        ? match.googleMapsUri
        : `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(match.id)}&query=${encodeURIComponent(textQuery)}`,
  };
}

export async function POST(request: NextRequest) {
  if (!env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { error: "Google Maps lookup isn't set up. Add GOOGLE_MAPS_API_KEY to .env.local and restart." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const places = parsePlaces(body?.places);
  if (!places || places.length === 0) {
    return NextResponse.json(
      { error: "Provide a non-empty `places` array of { place_name, location }." },
      { status: 400 }
    );
  }
  if (places.length > MAX_PLACES_PER_REQUEST) {
    return NextResponse.json(
      { error: `Send at most ${MAX_PLACES_PER_REQUEST} places per request.` },
      { status: 400 }
    );
  }

  const results: GeocodeResult[] = [];
  for (let i = 0; i < places.length; i += PARALLEL_LOOKUPS) {
    const batch = places.slice(i, i + PARALLEL_LOOKUPS);
    results.push(...(await Promise.all(batch.map((p) => geocodePlace(env.GOOGLE_MAPS_API_KEY!, p)))));
  }

  return NextResponse.json({ results });
}
