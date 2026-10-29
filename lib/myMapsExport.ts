import type { Recommendation } from "./types";

// ---------------------------------------------------------------------------
// Google My Maps export
// ---------------------------------------------------------------------------
// My Maps has no public API for adding places, so we produce a CSV in the
// shape its "Import" dialog understands: it auto-detects the Latitude and
// Longitude columns for pin positions and lets you pick Name as the title.

const HEADERS = [
  "Name",
  "Latitude",
  "Longitude",
  "Category",
  "Address",
  "Price",
  "What to try",
  "Notes",
  "Google Maps link",
  "Source video",
];

// Spreadsheet apps run cells starting with these characters as formulas.
// Scraped captions are untrusted, so neutralise them (text columns only).
const FORMULA_START = /^[=+\-@\t\r]/;

function textCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Returns how many places were exported (only entries with coordinates). */
export function exportToMyMapsCsv(recommendations: Recommendation[]): number {
  const rows: string[] = [];
  const seen = new Set<string>();

  for (const rec of recommendations) {
    const geo = rec.geo;
    if (geo?.status !== "found" || seen.has(geo.place_id)) continue;
    seen.add(geo.place_id);
    rows.push(
      [
        textCell(rec.place_name),
        geo.lat.toFixed(6),
        geo.lng.toFixed(6),
        textCell(rec.category),
        textCell(geo.formatted_address),
        textCell(rec.price_range),
        textCell(rec.recommended_activities),
        textCell(rec.rating_or_notes),
        textCell(geo.maps_url),
        textCell(rec.reel_url),
      ].join(",")
    );
  }
  if (rows.length === 0) return 0;

  const csv = [HEADERS.join(","), ...rows].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Fieldnotes_MyMaps_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return rows.length;
}
