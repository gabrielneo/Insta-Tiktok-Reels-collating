"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
} from "lucide-react";
import type { GeocodeResult, Recommendation, ServiceStatus } from "@/lib/types";
import { estimateGeocoding, formatRange } from "@/lib/estimate";
import { exportToMyMapsCsv } from "@/lib/myMapsExport";
import { DEMO_GEO, DEMO_GEOCODE_MS, sleep } from "@/lib/demoData";
import FailureReason from "./FailureReason";

// Must match MAX_PLACES_PER_REQUEST in app/api/geocode/route.ts.
const PLACES_PER_REQUEST = 25;

export function placeKey(rec: Pick<Recommendation, "place_name" | "location">): string {
  return `${rec.place_name.trim().toLowerCase()}|${rec.location.trim().toLowerCase()}`;
}

interface MapExportPanelProps {
  recommendations: Recommendation[];
  status: ServiceStatus | null;
  /** Use built-in sample coordinates instead of calling Google. */
  demoMode?: boolean;
  onGeocoded: (results: Map<string, GeocodeResult>) => void;
}

export default function MapExportPanel({
  recommendations,
  status,
  demoMode = false,
  onGeocoded,
}: MapExportPanelProps) {
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

  const mapsReady = demoMode || status?.maps === true;
  const isRunning = progress !== null;

  const handleFind = async () => {
    setError(null);
    setExportedCount(null);
    setProgress({ done: 0, total: pending.length });
    const results = new Map<string, GeocodeResult>();
    try {
      if (demoMode) {
        for (const [index, [key, place]] of pending.entries()) {
          await sleep(DEMO_GEOCODE_MS / pending.length);
          results.set(key, DEMO_GEO[place.place_name] ?? { status: "not_found" });
          setProgress({ done: index + 1, total: pending.length });
        }
        onGeocoded(new Map(results));
        return;
      }
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
    <section
      aria-labelledby="map-panel-title"
      className="rounded-xl border border-line bg-card p-5 shadow-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-pine-tint text-pine">
          <MapPin className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="map-panel-title" className="font-serif text-section font-semibold text-ink">
            Put it on a map
          </h2>
          <p className="mt-0.5 text-body text-ink-soft">
            Find every place on Google Maps, then import the pins into your own{" "}
            <a
              href="https://www.google.com/maps/d/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-pine underline underline-offset-2 hover:text-pine-dark"
            >
              Google My Maps<span className="sr-only"> (opens in a new tab)</span>
            </a>
            .
          </p>
        </div>
      </div>

      {!mapsReady ? (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-saffron-bg px-3.5 py-3 text-body text-ink-soft">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-saffron-text" strokeWidth={2} aria-hidden="true" />
          <p>
            <span className="font-semibold text-saffron-text">Map lookup isn&rsquo;t set up yet.</span>{" "}
            Add <code className="rounded-sm bg-card px-1 py-px font-mono text-meta">GOOGLE_MAPS_API_KEY</code> to{" "}
            <code className="rounded-sm bg-card px-1 py-px font-mono text-meta">.env.local</code> (a Google
            Cloud key with Places API (New) enabled), then restart the server.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleFind}
              data-tour="map-find"
              disabled={isRunning || pending.length === 0}
              className="inline-flex items-center gap-2 rounded-md bg-pine px-4 py-2 text-body font-medium text-white shadow-card transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin-slow" strokeWidth={2} aria-hidden="true" />
                  Finding places…
                </>
              ) : pending.length === 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  All places found
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Find on Google Maps
                  <span className="font-normal text-white/85">
                    ({pending.length} place{pending.length === 1 ? "" : "s"})
                  </span>
                </>
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={isRunning || counts.found === 0}
              className="inline-flex items-center gap-2 rounded-md border border-pine bg-card px-4 py-2 text-body font-medium text-pine transition-colors hover:bg-pine-tint disabled:cursor-not-allowed disabled:border-line disabled:text-ink-faint"
            >
              <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Download for My Maps
              <span className="text-meta font-normal text-ink-soft">.csv</span>
            </button>
          </div>

          {isRunning && (
            <div className="mt-3" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-meta text-ink-soft">
                <span>Looking up places on Google Maps…</span>
                <span className="font-medium tabular-nums text-ink">
                  {progress.done} / {progress.total}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div
                  className="h-full rounded-full bg-pine transition-[width] duration-500"
                  style={{ width: `${progress.total ? Math.max(4, (progress.done / progress.total) * 100) : 4}%` }}
                />
              </div>
            </div>
          )}

          {pending.length > 0 && !isRunning && (
            <p className="mt-2 flex items-center gap-1.5 text-meta text-ink-faint">
              <Clock className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
              {demoMode
                ? "Demo: uses built-in sample coordinates, so no Google key or cost."
                : `Expected time: ${formatRange(estimateGeocoding(pending.length))}. One Google lookup per place.`}
            </p>
          )}

          {(counts.found > 0 || counts.not_found > 0 || counts.error > 0) && (
            <ul className="mt-3 flex flex-wrap gap-1.5 text-meta" aria-label="Lookup results">
              <li className="rounded-full bg-pine-tint px-2.5 py-0.5 font-medium text-pine">
                {counts.found} found
              </li>
              {counts.not_found > 0 && (
                <li className="rounded-full bg-sunken px-2.5 py-0.5 text-ink-soft">
                  {counts.not_found} not found
                </li>
              )}
              {counts.error > 0 && (
                <li className="rounded-full bg-berry-bg px-2.5 py-0.5 font-medium text-berry-text">
                  {counts.error} failed
                </li>
              )}
              {counts.unchecked > 0 && (
                <li className="rounded-full bg-sunken px-2.5 py-0.5 text-ink-soft">
                  {counts.unchecked} not checked yet
                </li>
              )}
            </ul>
          )}

          {failureReasons.map((reason) => (
            <div
              key={reason}
              role="alert"
              className="mt-3 flex items-start gap-2.5 rounded-lg bg-berry-bg px-3.5 py-3 text-body text-ink-soft"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-berry-text" strokeWidth={2} aria-hidden="true" />
              <p>
                <FailureReason reason={reason} />
              </p>
            </div>
          ))}

          {exportedCount !== null && (
            <div className="mt-3 rounded-lg border border-pine/25 bg-pine-tint/60 px-4 py-3 text-body text-ink-soft" role="status">
              <p className="flex items-center gap-1.5 font-semibold text-pine-dark">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                Downloaded {exportedCount} place{exportedCount === 1 ? "" : "s"}. Now add them to My Maps:
              </p>
              <ol className="mt-2 space-y-1.5">
                {[
                  <>
                    Open{" "}
                    <a
                      href="https://www.google.com/maps/d/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-pine underline underline-offset-2"
                    >
                      Google My Maps
                      <ExternalLink className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>{" "}
                    and create or open a map.
                  </>,
                  <>
                    Click <strong className="text-ink">Add layer</strong>, then{" "}
                    <strong className="text-ink">Import</strong>.
                  </>,
                  <>Upload the .csv you just downloaded.</>,
                  <>
                    Tick <strong className="text-ink">Latitude</strong> and{" "}
                    <strong className="text-ink">Longitude</strong>, then choose{" "}
                    <strong className="text-ink">Name</strong> as the title.
                  </>,
                  <>
                    Optional: style by <strong className="text-ink">Category</strong> to colour-code
                    the pins.
                  </>,
                ].map((step, index) => (
                  <li key={index} className="flex gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-pine text-[0.6875rem] font-semibold text-white"
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className="sr-only">Step {index + 1}: </span>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {error && (
            <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-lg bg-berry-bg px-3.5 py-3 text-body text-ink-soft">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-berry-text" strokeWidth={2} aria-hidden="true" />
              <p>
                <FailureReason reason={error} />
              </p>
            </div>
          )}
        </>
      )}

      <details className="group mt-4 border-t border-line pt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-meta font-medium text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
          <ChevronRight
            className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
            strokeWidth={2}
            aria-hidden="true"
          />
          Good to know before you rely on the pins
        </summary>
        <dl className="mt-3 grid gap-x-6 gap-y-2.5 text-meta text-ink-soft sm:grid-cols-2">
          {[
            ["No automatic upload", "My Maps has no API for adding pins, so you import the file yourself (about 30 seconds)."],
            ["Matches are a best guess", "Chains, closed venues or “Unknown” locations can land on the wrong branch. Check the pins."],
            ["Lookups can cost money", "Each distinct place is one Places API request, after Google’s monthly free allowance."],
            ["Coordinates are short-lived", "Google lets you keep them for up to 30 days. Re-run the lookup for an old list."],
            ["My Maps limits", "Up to 2,000 rows per layer and 10 layers per map. Split big lists, e.g. one layer per city."],
            ["Nothing is saved", "Results live in this tab. Refreshing clears them, so export first."],
          ].map(([term, detail]) => (
            <div key={term}>
              <dt className="font-semibold text-ink">{term}</dt>
              <dd>{detail}</dd>
            </div>
          ))}
          <div className="sm:col-span-2">
            <dd>
              See{" "}
              <a
                href="https://developers.google.com/maps/billing-and-pricing/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-pine underline underline-offset-2"
              >
                Google&rsquo;s current pricing<span className="sr-only"> (opens in a new tab)</span>
              </a>
              . Duplicates are only looked up once.
            </dd>
          </div>
        </dl>
      </details>
    </section>
  );
}
