"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Clock, Download, ExternalLink, Loader2, MapPin } from "lucide-react";
import type { GeocodeResult, Recommendation, ServiceStatus } from "@/lib/types";
import { estimateGeocoding, formatRange } from "@/lib/estimate";
import { exportToMyMapsCsv } from "@/lib/myMapsExport";

// Must match MAX_PLACES_PER_REQUEST in app/api/geocode/route.ts.
const PLACES_PER_REQUEST = 25;

export function placeKey(rec: Pick<Recommendation, "place_name" | "location">): string {
  return `${rec.place_name.trim().toLowerCase()}|${rec.location.trim().toLowerCase()}`;
}

interface MapExportPanelProps {
  recommendations: Recommendation[];
  status: ServiceStatus | null;
  onGeocoded: (results: Map<string, GeocodeResult>) => void;
}

export default function MapExportPanel({ recommendations, status, onGeocoded }: MapExportPanelProps) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportedCount, setExportedCount] = useState<number | null>(null);

  // One lookup per distinct place that hasn't been found yet.
  const pending = useMemo(() => {
    const byKey = new Map<string, Pick<Recommendation, "place_name" | "location">>();
    for (const rec of recommendations) {
      if (rec.geo?.status !== "found") byKey.set(placeKey(rec), rec);
    }
    return Array.from(byKey.entries());
  }, [recommendations]);

  const counts = useMemo(() => {
    const c = { found: 0, not_found: 0, error: 0, unchecked: 0 };
    for (const rec of recommendations) c[rec.geo?.status ?? "unchecked"]++;
    return c;
  }, [recommendations]);

  // Distinct lookup failure reasons, so the fix is visible without hovering rows.
  const failureReasons = useMemo(() => {
    const reasons = new Set<string>();
    for (const rec of recommendations) if (rec.geo?.status === "error") reasons.add(rec.geo.reason);
    return Array.from(reasons);
  }, [recommendations]);

  const mapsReady = status?.maps === true;
  const isRunning = progress !== null;

  const handleFind = async () => {
    setError(null);
    setExportedCount(null);
    setProgress({ done: 0, total: pending.length });
    const results = new Map<string, GeocodeResult>();
    try {
      for (let i = 0; i < pending.length; i += PLACES_PER_REQUEST) {
        const chunk = pending.slice(i, i + PLACES_PER_REQUEST);
        const response = await fetch("/api/geocode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ places: chunk.map(([, place]) => place) }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error ?? "Google Maps lookup failed.");
        chunk.forEach(([key], idx) => results.set(key, data.results[idx]));
        onGeocoded(new Map(results));
        setProgress({ done: Math.min(i + chunk.length, pending.length), total: pending.length });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Maps lookup failed.");
    } finally {
      setProgress(null);
    }
  };

  const handleExport = () => setExportedCount(exportToMyMapsCsv(recommendations));

  return (
    <div className="rounded-lg border border-line bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-pine/10 text-pine">
          <MapPin className="h-4 w-4" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-base font-semibold text-ink">Put it on a map</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Look up every place on Google Maps, then import the pins into your own{" "}
            <a
              href="https://www.google.com/maps/d/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pine hover:underline"
            >
              Google My Maps
            </a>{" "}
            map.
          </p>
        </div>
      </div>

      {!mapsReady ? (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-brass/30 bg-brass/5 px-3 py-2 text-xs text-brass-dark">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
          <span>
            Google Maps lookup isn&rsquo;t set up. Add{" "}
            <code className="rounded bg-paper px-1 py-0.5">GOOGLE_MAPS_API_KEY</code> to{" "}
            <code className="rounded bg-paper px-1 py-0.5">.env.local</code> (a Google Cloud key with
            the Places API (New) enabled) and restart the server.
          </span>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleFind}
              disabled={isRunning || pending.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin-slow" strokeWidth={2} />
                  Finding {progress.done}/{progress.total}…
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" strokeWidth={2} />
                  {pending.length === 0
                    ? "All places found"
                    : `Find ${pending.length} place${pending.length === 1 ? "" : "s"} on Google Maps`}
                </>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={isRunning || counts.found === 0}
              className="inline-flex items-center gap-2 rounded-md border border-line bg-paper px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-pine/40 hover:text-pine disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              Download for My Maps (.csv)
            </button>
          </div>

          {pending.length > 0 && !isRunning && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
              <Clock className="h-3.5 w-3.5" strokeWidth={2} />
              Expected time: {formatRange(estimateGeocoding(pending.length))}. One Google lookup per
              place.
            </p>
          )}

          {(counts.found > 0 || counts.not_found > 0 || counts.error > 0) && (
            <p className="mt-2 text-xs text-ink-soft">
              <span className="font-medium text-pine">{counts.found} found</span>
              {counts.not_found > 0 && <> · {counts.not_found} not found</>}
              {counts.error > 0 && <span className="text-clay"> · {counts.error} failed</span>}
              {counts.unchecked > 0 && <> · {counts.unchecked} not checked yet</>}
            </p>
          )}

          {failureReasons.map((reason) => (
            <div
              key={reason}
              className="mt-2 flex items-start gap-2 rounded-md border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              <span>{reason}</span>
            </div>
          ))}

          {exportedCount !== null && (
            <div className="mt-3 rounded-md border border-pine/25 bg-pine/5 px-3 py-2 text-xs text-ink-soft">
              <p className="font-medium text-pine-dark">
                Downloaded {exportedCount} place{exportedCount === 1 ? "" : "s"}. To add them to My Maps:
              </p>
              <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
                <li>
                  Open{" "}
                  <a
                    href="https://www.google.com/maps/d/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-pine hover:underline"
                  >
                    Google My Maps <ExternalLink className="h-3 w-3" strokeWidth={2} />
                  </a>{" "}
                  and create a map (or open an existing one).
                </li>
                <li>Click <strong>Add layer</strong>, then <strong>Import</strong> in the new layer.</li>
                <li>Upload the downloaded .csv file.</li>
                <li>Tick <strong>Latitude</strong> and <strong>Longitude</strong> for pin positions, then pick <strong>Name</strong> as the title.</li>
                <li>Optional: style the layer by <strong>Category</strong> to colour-code the pins.</li>
              </ol>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              <span>{error}</span>
            </div>
          )}
        </>
      )}

      <details className="mt-4 text-xs text-ink-soft">
        <summary className="cursor-pointer font-medium text-ink-soft hover:text-ink">
          Limitations — read before you rely on the pins
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>
            <strong>No automatic upload.</strong> Google My Maps has no public API for adding pins,
            so you import the downloaded file yourself (about 30 seconds).
          </li>
          <li>
            <strong>Matches are a best guess.</strong> Each place is searched by name plus location.
            Chains, closed venues, or places listed as &ldquo;Unknown&rdquo; location can land on the
            wrong branch or city, so check the pins.
          </li>
          <li>
            <strong>Lookups cost money past the free tier.</strong> Every place is a billable Places
            API request on your Google Cloud account. Google includes a monthly free allowance; see{" "}
            <a
              href="https://developers.google.com/maps/billing-and-pricing/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pine hover:underline"
            >
              current pricing
            </a>
            . Duplicates are looked up only once.
          </li>
          <li>
            <strong>Coordinates are short-lived.</strong> Google&rsquo;s terms allow keeping
            latitude/longitude from the Places API for up to 30 days. Re-run the lookup for an older
            list instead of reusing an old file.
          </li>
          <li>
            <strong>My Maps limits.</strong> Up to 2,000 rows per imported layer and 10 layers per
            map. Split bigger lists across layers (for example, one per city).
          </li>
          <li>
            <strong>Nothing is saved.</strong> Results live in this browser tab. Refreshing the page
            clears them, so export before you close it.
          </li>
        </ul>
      </details>
    </div>
  );
}
