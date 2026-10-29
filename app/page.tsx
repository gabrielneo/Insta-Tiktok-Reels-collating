"use client";

import { useEffect, useState } from "react";
import { Compass, Plus, Loader2, AlertTriangle, Info, X, Clock } from "lucide-react";
import RecommendationsTable from "@/components/RecommendationsTable";
import MapExportPanel, { placeKey } from "@/components/MapExportPanel";
import { estimateExtraction, formatRange, formatSeconds } from "@/lib/estimate";
import type { GeocodeResult, Recommendation, ServiceStatus } from "@/lib/types";

interface FailedUrl {
  reel_url: string;
  reason: string;
}

export default function Home() {
  const [bulkInput, setBulkInput] = useState("");
  const [quickAddInput, setQuickAddInput] = useState("");
  const [pendingUrls, setPendingUrls] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [failedUrls, setFailedUrls] = useState<FailedUrl[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    fetch("/api/status")
      .then((response) => (response.ok ? response.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setElapsedSeconds((Date.now() - startedAt) / 1000), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const handleGeocoded = (results: Map<string, GeocodeResult>) => {
    setRecommendations((prev) =>
      prev.map((rec) => {
        const geo = results.get(placeKey(rec));
        return geo ? { ...rec, geo } : rec;
      })
    );
  };

  const bulkUrls = bulkInput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const allUrls = Array.from(new Set([...pendingUrls, ...bulkUrls]));
  const expected = estimateExtraction(allUrls.length, status);

  const handleQuickAdd = () => {
    const trimmed = quickAddInput.trim();
    if (!trimmed) return;
    setPendingUrls((prev) => Array.from(new Set([...prev, trimmed])));
    setQuickAddInput("");
  };

  const handleRemovePending = (url: string) => {
    setPendingUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (allUrls.length === 0) {
      setErrorMessage("Add at least one Instagram Reel or TikTok link before extracting.");
      return;
    }

    setIsLoading(true);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
    try {
      const response = await fetch("/api/parse-reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: allUrls }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data?.error ?? "Something went wrong while extracting.");
        return;
      }

      setRecommendations((prev) => [...prev, ...data.results]);
      setFailedUrls(data.failed ?? []);
      setUsedFallback(Boolean(data.usedFallback));

      // Clear inputs on success so the workspace is ready for the next batch.
      setBulkInput("");
      setPendingUrls([]);
    } catch {
      setErrorMessage(
        "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      setIsLoading(false);
      setStartedAt(null);
    }
  };

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-line bg-paper px-6 py-5 sm:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-pine text-white">
              <Compass className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-semibold leading-none text-ink">
                Fieldnotes
              </h1>
              <p className="mt-1 text-xs text-ink-soft">
                Turn saved reels and TikToks into a place you can actually plan from.
              </p>
            </div>
          </div>
          {recommendations.length > 0 && (
            <div className="hidden text-right sm:block">
              <p className="text-2xl font-semibold text-ink">
                {recommendations.length}
              </p>
              <p className="text-xs text-ink-soft">entries logged</p>
            </div>
          )}
        </div>
      </header>

      {/* Body: input panel + results workspace */}
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 sm:px-10 lg:flex-row">
        {/* Input panel */}
        <section className="flex w-full flex-col gap-5 lg:w-[360px] lg:flex-shrink-0">
          <div className="rounded-lg border border-line bg-card p-5">
            <h2 className="font-serif text-base font-semibold text-ink">
              Add Instagram Reel or TikTok links
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              One URL per line. Paste as many as you've got.
            </p>

            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={
                "https://www.instagram.com/reel/abc123/\nhttps://www.tiktok.com/@foodie/video/7300000000000000000"
              }
              rows={8}
              className="mt-3 w-full resize-none rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
            />

            <div className="mt-4 border-t border-line pt-4">
              <label className="text-xs font-medium text-ink-soft">
                Quick add a single link
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={quickAddInput}
                  onChange={(e) => setQuickAddInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  placeholder="Instagram Reel or TikTok link"
                  className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
                />
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickAddInput.trim()}
                  className="inline-flex items-center justify-center rounded-md border border-line bg-paper px-3 text-ink-soft transition-colors hover:border-pine/40 hover:text-pine disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Add link"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>

              {pendingUrls.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1.5">
                  {pendingUrls.map((url) => (
                    <li
                      key={url}
                      className="flex items-center justify-between gap-2 rounded-md bg-paper px-2.5 py-1.5 text-xs text-ink-soft"
                    >
                      <span className="truncate">{url}</span>
                      <button
                        onClick={() => handleRemovePending(url)}
                        className="flex-shrink-0 text-ink-faint hover:text-clay"
                        aria-label={`Remove ${url}`}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || allUrls.length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-pine px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin-slow" strokeWidth={2} />
                  Extracting from {allUrls.length} link{allUrls.length === 1 ? "" : "s"}…
                </>
              ) : (
                <>
                  Extract Recommendations
                  {allUrls.length > 0 && ` (${allUrls.length})`}
                </>
              )}
            </button>

            {isLoading ? (
              <div className="mt-3 rounded-md border border-line bg-paper px-3 py-2 text-xs text-ink-soft">
                <p className="flex items-center gap-1.5 font-medium text-ink">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                  {formatSeconds(elapsedSeconds)} elapsed · expected {formatRange(expected)}
                </p>
                <p className="mt-1">
                  Keep this tab open. Each video is scraped and then read by the AI model, so big
                  batches take a while. Results appear all at once when the batch finishes.
                </p>
              </div>
            ) : (
              allUrls.length > 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-faint">
                  <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                  <span>
                    Expected time for {allUrls.length} link{allUrls.length === 1 ? "" : "s"}:{" "}
                    {formatRange(expected)}
                    {status && !status.ai && " (demo mode, no AI model set)"}.
                    {allUrls.length > 50 && " Max 50 links per batch, so split the rest into another run."}
                  </span>
                </p>
              )
            )}

            <details className="mt-3 text-xs text-ink-soft">
              <summary className="cursor-pointer font-medium hover:text-ink">
                What to expect
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Up to 50 links per batch. Links are scraped 5 at a time.</li>
                <li>
                  Scraping a group of 5 usually takes 20–60 seconds, plus about 5–20 seconds per video
                  for the AI model. 50 links can take about 8–27 minutes.
                </li>
                <li>
                  Only the caption is read, not the audio or on-screen text. A video that never names
                  the place in its caption won&rsquo;t produce a result.
                </li>
                <li>Private, deleted or region-locked videos can&rsquo;t be scraped and show as failed.</li>
                <li>Scraping uses Apify credit and the AI model uses your provider&rsquo;s credit.</li>
              </ul>
            </details>

            {errorMessage && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {usedFallback && (
            <div className="flex items-start gap-2 rounded-lg border border-brass/30 bg-brass/5 px-4 py-3 text-xs text-brass-dark">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
              <span>
                No AI model is configured, so these are simulated sample
                entries. Set <code className="rounded bg-paper px-1 py-0.5">AI_PROVIDER</code>,{" "}
                <code className="rounded bg-paper px-1 py-0.5">AI_MODEL</code> and{" "}
                <code className="rounded bg-paper px-1 py-0.5">AI_API_KEY</code> to
                extract real recommendations from your videos, and optionally add
                <code className="rounded bg-paper px-1 py-0.5">APIFY_API_TOKEN</code> to fetch the captions.
              </span>
            </div>
          )}

          {failedUrls.length > 0 && (
            <div className="rounded-lg border border-line bg-card p-4">
              <p className="text-xs font-medium text-ink-soft">
                {failedUrls.length} link{failedUrls.length === 1 ? "" : "s"}{" "}
                couldn&rsquo;t be processed
              </p>
              {/* Grouped by reason so one bad key doesn't repeat the same advice 50 times. */}
              <ul className="mt-2 flex flex-col gap-3">
                {Array.from(
                  failedUrls.reduce((groups, f) => {
                    groups.set(f.reason, [...(groups.get(f.reason) ?? []), f.reel_url]);
                    return groups;
                  }, new Map<string, string[]>())
                ).map(([reason, urls]) => (
                  <li key={reason} className="text-xs">
                    <p className="flex items-start gap-1.5 text-clay">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} />
                      <span>{reason}</span>
                    </p>
                    <ul className="mt-1 flex flex-col gap-0.5 pl-5 text-ink-faint">
                      {urls.map((url) => (
                        <li key={url} className="truncate">
                          {url}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Results workspace */}
        <section className="flex min-w-0 flex-1 flex-col gap-4">
          {recommendations.length > 0 && (
            <MapExportPanel
              recommendations={recommendations}
              status={status}
              onGeocoded={handleGeocoded}
            />
          )}
          <RecommendationsTable recommendations={recommendations} />
        </section>
      </div>
    </main>
  );
}
