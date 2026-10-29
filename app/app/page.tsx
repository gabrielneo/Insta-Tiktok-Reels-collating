"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  FlaskConical,
  Info,
  Loader2,
  NotebookPen,
  PlayCircle,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import RecommendationsTable from "@/components/RecommendationsTable";
import MapExportPanel, { placeKey } from "@/components/MapExportPanel";
import { useGuidedTour, type TourStep } from "@/components/GuidedTour";
import FailureReason from "@/components/FailureReason";
import SetupGuideDialog from "@/components/SetupGuideDialog";
import { isSupportedLink, MAX_LINKS_PER_BATCH } from "@/components/linkCheck";
import { estimateExtraction, formatRange, formatSeconds } from "@/lib/estimate";
import {
  DEMO_FAILED,
  DEMO_GEOCODE_MS,
  DEMO_LINKS,
  DEMO_RECOMMENDATIONS,
  DEMO_STEPS,
  sleep,
} from "@/lib/demoData";
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
  const [demoMode, setDemoMode] = useState(false);
  const [demoStep, setDemoStep] = useState<{ index: number; label: string } | null>(null);
  // Closing the intro banner hides it until the page is reloaded.
  const [introDismissed, setIntroDismissed] = useState(false);

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

  const resetWorkspace = () => {
    setRecommendations([]);
    setFailedUrls([]);
    setUsedFallback(false);
    setErrorMessage(null);
  };

  // The demo plays a real run with sample data, entirely in the browser.
  const prepareDemo = () => {
    resetWorkspace();
    setDemoMode(true);
    setPendingUrls([]);
    setBulkInput(DEMO_LINKS.join("\n"));
  };

  const runDemoExtraction = async () => {
    setIsLoading(true);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
    for (const [index, step] of DEMO_STEPS.entries()) {
      setDemoStep({ index, label: step.label });
      await sleep(step.ms);
    }
    setRecommendations(DEMO_RECOMMENDATIONS);
    setFailedUrls(DEMO_FAILED);
    setBulkInput("");
    setDemoStep(null);
    setIsLoading(false);
    setStartedAt(null);
  };

  // Shortcut that skips the guide and just shows the sample results.
  const handleStartDemo = async () => {
    prepareDemo();
    await runDemoExtraction();
  };

  // --- Guided demo ---------------------------------------------------------
  // The guide drives the demo itself: each step's `before` action fills in
  // links, runs the extraction or presses a button, so newcomers watch the
  // whole process happen one step at a time. Refs keep Back/Next from
  // re-running a stage that already happened.
  const demoPhase = useRef<"idle" | "prepared" | "running" | "done">("idle");
  const demoRun = useRef<Promise<void> | null>(null);

  const ensurePrepared = async () => {
    if (demoPhase.current === "idle") {
      prepareDemo();
      demoPhase.current = "prepared";
      await sleep(150);
    }
  };
  const ensureExtracting = async () => {
    await ensurePrepared();
    if (demoPhase.current === "prepared") {
      demoPhase.current = "running";
      demoRun.current = runDemoExtraction().then(() => {
        demoPhase.current = "done";
      });
      await sleep(150);
    }
  };
  const ensureExtracted = async () => {
    await ensureExtracting();
    await demoRun.current;
    await sleep(150);
  };
  const pressFindOnMap = async () => {
    await ensureExtracted();
    const button = document.querySelector<HTMLButtonElement>('[data-tour="map-find"]');
    if (button && !button.disabled && !button.textContent?.includes("All places found")) {
      button.click();
      await sleep(DEMO_GEOCODE_MS + 500);
    }
  };

  const guidedDemoSteps: TourStep[] = [
    {
      target: "demo-banner",
      title: "Welcome to the guided demo",
      content:
        "We'll run Fieldnotes on 5 sample videos and explain each step as it happens. Just press Next; we'll do the clicking for you. It takes about 2 minutes, needs no keys and costs nothing.",
      placement: "bottom",
    },
    {
      target: "paste-box",
      title: "Step 1 · Paste your links",
      content:
        "We've pasted 5 sample links: 3 Instagram Reels and 2 TikToks. With your own videos, open Instagram or TikTok, tap Share → Copy link on a saved video, and paste it here, one per line, up to 50 at a time.",
      placement: "right",
      before: ensurePrepared,
    },
    {
      target: "extract",
      title: "Step 2 · Press Extract places",
      content:
        "This sends the links off to be read. Press Next and we'll press it for you.",
      placement: "right",
      before: ensurePrepared,
    },
    {
      target: "demo-progress",
      title: "Watch it work",
      content:
        "Fieldnotes fetches each video's caption, then an AI model reads it and writes down every place it mentions. The demo is sped up: a real run of 5 links takes a minute or two, and 50 links can take up to half an hour. Keep the tab open while it runs.",
      placement: "right",
      before: ensureExtracting,
    },
    {
      target: "results",
      title: "Step 3 · Your list of places",
      content:
        "Every place mentioned in the videos gets its own row: the name, the category, where it is, what to order or do, how pricey it is, and any tips. The Source link takes you back to the original video.",
      placement: "top",
      before: ensureExtracted,
    },
    {
      target: "filters",
      title: "Search and filter",
      content:
        "Type a name or city in the search box, or tap a category to see only food spots, sights, shopping and so on. Tap All to see everything again.",
      placement: "bottom",
      before: ensureExtracted,
    },
    {
      target: "failed-links",
      title: "When a video can't be read",
      content:
        "Sometimes a video is private or deleted. Those links are listed here with a plain-English explanation of what happened and what to do. The code in the small badge helps if you need to look it up.",
      placement: "right",
      before: ensureExtracted,
    },
    {
      target: "map-panel",
      title: "Step 4 · Put it on a map",
      content:
        "Fieldnotes can find each place on Google Maps. Press Next and we'll press Find on Google Maps for you.",
      placement: "bottom",
      before: ensureExtracted,
    },
    {
      target: "map-panel",
      title: "Found on the map",
      content:
        "7 places were found. One wasn't, because the video never named the stall. Each found place now has an Open map link in the table. Download for My Maps saves a file you can import into your own Google My Maps.",
      placement: "bottom",
      before: pressFindOnMap,
    },
    {
      target: "export-excel",
      title: "Step 5 · Keep a copy",
      content:
        "Export to Excel saves the list (with map links) to your computer. Results only live in this browser tab, so export before you close it.",
      placement: "bottom",
      before: ensureExtracted,
    },
    {
      target: "demo-banner",
      title: "That's the whole process!",
      content:
        "Feel free to keep exploring the sample results. To use your own videos, add your API keys to the .env.local file on your own computer; the README's \"Use it on your real videos\" section shows how. Keys never go into this website.",
      placement: "bottom",
    },
  ];

  const guidedDemo = useGuidedTour({ steps: guidedDemoSteps });

  const handleStartGuidedDemo = () => {
    demoPhase.current = "idle";
    demoRun.current = null;
    guidedDemo.start();
  };

  const handleExitDemo = () => {
    resetWorkspace();
    setDemoMode(false);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Real links replace the sample data rather than mixing with it.
    if (demoMode) {
      resetWorkspace();
      setDemoMode(false);
    }

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

  // Display-only values for the redesigned UI (no new state).
  const unsupportedUrls = allUrls.filter((url) => !isSupportedLink(url));
  const overLimit = allUrls.length > MAX_LINKS_PER_BATCH;
  const runProgress = Math.min(95, Math.max(3, (elapsedSeconds / Math.max(expected[1], 1)) * 100));
  const failedGroups = Array.from(
    failedUrls.reduce((groups, f) => {
      groups.set(f.reason, [...(groups.get(f.reason) ?? []), f.reel_url]);
      return groups;
    }, new Map<string, string[]>())
  );
  const inputHintIds = [
    "links-hint",
    unsupportedUrls.length > 0 ? "links-unsupported" : "",
    overLimit ? "links-over-limit" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-paper">
      <a
        href="#links-input"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-body focus:shadow-lift"
      >
        Skip to the link box
      </a>

      {/* Header */}
      <header className="border-b border-line bg-card/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex min-w-0 items-center gap-3">
            {/* Icon and title both go home; the icon is skipped by keyboard and
                screen readers so they get one "Fieldnotes" link, not two. */}
            <Link
              href="/"
              tabIndex={-1}
              aria-hidden="true"
              className="flex h-10 w-10 flex-shrink-0 -rotate-3 items-center justify-center rounded-lg bg-pine text-white shadow-card transition-transform hover:rotate-0 hover:scale-105"
            >
              <NotebookPen className="h-5 w-5" strokeWidth={2} />
            </Link>
            <div className="min-w-0">
              <h1 className="font-serif text-display font-semibold tracking-tight text-ink">
                <Link href="/" className="rounded-sm transition-colors hover:text-pine" title="Back to the home page">
                  Fieldnotes
                </Link>
              </h1>
              <p className="text-meta text-ink-soft sm:text-body">
                Your saved Reels and TikToks, turned into a list of places to eat and go.
              </p>
            </div>
          </div>
          <div className="flex flex-shrink-0 items-center gap-3">
            <SetupGuideDialog />
            {recommendations.length > 0 && (
              <p className="hidden flex-shrink-0 rotate-2 sm:block rounded-md border-2 border-pine/70 px-2.5 py-1 text-center font-serif text-pine">
                <span className="block text-section font-semibold leading-none">{recommendations.length}</span>
                <span className="text-meta">places</span>
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Guided demo: first thing new visitors see */}
      {(demoMode || (!isLoading && recommendations.length === 0 && !introDismissed)) && (
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-8 sm:pt-8">
          {demoMode ? (
            <div
              data-tour="demo-banner"
              className="flex flex-col gap-3 rounded-xl bg-saffron-bg px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              role="status"
            >
              <div className="flex items-start gap-2.5">
                <FlaskConical className="mt-0.5 h-4 w-4 flex-shrink-0 text-saffron-text" strokeWidth={2} aria-hidden="true" />
                <div className="text-body text-ink-soft">
                  <p className="font-semibold text-saffron-text">You&rsquo;re viewing the demo</p>
                  <p className="mt-0.5">
                    These are sample places. Nothing was scraped and no keys were used. Explore
                    freely, or replay the guide. To use your own videos, add your keys to{" "}
                    <code className="rounded-sm bg-card px-1 py-px font-mono text-meta">.env.local</code> on
                    your computer (see the README).
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 flex-wrap gap-2">
                <button
                  onClick={handleStartGuidedDemo}
                  disabled={guidedDemo.running || isLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-saffron-text/30 bg-card px-3 py-1.5 text-body font-medium text-ink transition-colors hover:border-saffron-text disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Replay guide
                </button>
                <button
                  onClick={handleExitDemo}
                  disabled={guidedDemo.running || isLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-saffron-text/30 bg-card px-3 py-1.5 text-body font-medium text-ink transition-colors hover:border-saffron-text disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                  Exit demo
                </button>
              </div>
            </div>
          ) : (
            <div
              data-tour="demo-banner"
              className="relative rounded-xl border border-pine/20 bg-pine-tint/60 p-5 pr-12 sm:p-6 sm:pr-14"
            >
              <button
                type="button"
                onClick={() => setIntroDismissed(true)}
                aria-label="Close the guided demo banner"
                title="Close"
                className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-card hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex h-12 w-12 flex-shrink-0 rotate-3 items-center justify-center rounded-lg bg-saffron text-ink shadow-card">
                  <PlayCircle className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-serif text-section font-semibold text-ink">
                    New here? Take the 2-minute guided demo
                  </h2>
                  <p className="mt-1 text-body text-ink-soft">
                    We&rsquo;ll run Fieldnotes on 5 sample Reels and TikToks and explain each step as it
                    happens: pasting links, reading the videos, browsing the places, putting them on a map
                    and saving a copy. No keys, no sign-ups, no cost.
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
                  <button
                    onClick={handleStartGuidedDemo}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-pine px-4 py-2.5 text-body font-semibold text-white shadow-card transition-colors hover:bg-pine-dark"
                  >
                    <PlayCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                    Start the guided demo
                  </button>
                  <button
                    onClick={handleStartDemo}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-line bg-card px-4 py-2.5 text-body font-medium text-ink transition-colors hover:border-pine hover:text-pine"
                  >
                    Skip to sample results
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {guidedDemo.Tour}

      {/* Split-pane workspace: input first (left / top), results second */}
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-8 sm:py-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start">
        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6">
          <section className="rounded-xl border border-line bg-card p-5 shadow-card" aria-labelledby="links-label" data-tour="paste-box">
            <div className="flex items-baseline justify-between gap-3">
              <label
                id="links-label"
                htmlFor="links-input"
                className="font-serif text-section font-semibold text-ink"
              >
                Paste your links
              </label>
              <span
                className={`flex-shrink-0 text-meta tabular-nums ${
                  overLimit ? "font-semibold text-berry-text" : "text-ink-faint"
                }`}
              >
                {allUrls.length} / {MAX_LINKS_PER_BATCH} links
              </span>
            </div>
            <p id="links-hint" className="mt-1 text-body text-ink-soft">
              One Instagram Reel or TikTok link per line.
            </p>

            <textarea
              id="links-input"
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder={
                "https://www.instagram.com/reel/abc123/\nhttps://vm.tiktok.com/ZMabc123/"
              }
              rows={8}
              spellCheck={false}
              aria-describedby={inputHintIds}
              aria-invalid={unsupportedUrls.length > 0 || overLimit}
              className="ruled-paper mt-3 w-full resize-y rounded-md border border-line bg-card px-3 pb-2 pt-2 font-mono text-[0.8125rem] text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/25"
            />

            {unsupportedUrls.length > 0 && (
              <div
                id="links-unsupported"
                className="mt-2 rounded-md bg-berry-bg px-3 py-2 text-meta text-ink-soft"
              >
                <p className="font-semibold text-berry-text">
                  {unsupportedUrls.length} link{unsupportedUrls.length === 1 ? " isn't" : "s aren't"}{" "}
                  supported and will be skipped:
                </p>
                <ul className="mt-1 space-y-0.5">
                  {unsupportedUrls.slice(0, 3).map((url) => (
                    <li key={url} className="truncate font-mono">
                      {url}
                    </li>
                  ))}
                  {unsupportedUrls.length > 3 && <li>and {unsupportedUrls.length - 3} more</li>}
                </ul>
                <p className="mt-1">
                  Use links like <span className="font-mono">instagram.com/reel/…</span> or{" "}
                  <span className="font-mono">tiktok.com/@user/video/…</span>
                </p>
              </div>
            )}
            {overLimit && (
              <p id="links-over-limit" className="mt-2 rounded-md bg-berry-bg px-3 py-2 text-meta text-berry-text">
                That&rsquo;s {allUrls.length} links. Up to {MAX_LINKS_PER_BATCH} can run at once, so
                split the rest into another batch.
              </p>
            )}

            {/* Quick add */}
            <div className="mt-4 border-t border-dashed border-line pt-4">
              <label htmlFor="quick-add" className="text-meta font-semibold text-ink-soft">
                Or add one at a time
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="quick-add"
                  type="url"
                  value={quickAddInput}
                  onChange={(e) => setQuickAddInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleQuickAdd();
                    }
                  }}
                  placeholder="Paste a link and press Enter"
                  className="min-w-0 flex-1 rounded-md border border-line bg-card px-3 py-2 text-body text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/25"
                />
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickAddInput.trim()}
                  className="inline-flex items-center justify-center rounded-md border border-line bg-card px-3 text-ink-soft transition-colors hover:border-pine hover:text-pine disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Add link"
                >
                  <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              {pendingUrls.length > 0 && (
                <ul className="mt-2.5 flex flex-col gap-1.5" aria-label="Links added one at a time">
                  {pendingUrls.map((url) => (
                    <li
                      key={url}
                      className="flex items-center justify-between gap-2 rounded-md bg-sunken px-2.5 py-1.5 text-meta text-ink-soft"
                    >
                      <span className={`truncate font-mono ${isSupportedLink(url) ? "" : "text-berry-text"}`}>
                        {url}
                      </span>
                      <button
                        onClick={() => handleRemovePending(url)}
                        className="flex-shrink-0 rounded-sm p-0.5 text-ink-faint hover:text-berry-text"
                        aria-label={`Remove ${url}`}
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              onClick={handleSubmit}
              data-tour="extract"
              disabled={isLoading || allUrls.length === 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-pine px-4 py-2.5 text-lead font-semibold text-white shadow-card transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin-slow" strokeWidth={2} aria-hidden="true" />
                  Extracting places…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Extract places
                  {allUrls.length > 0 && (
                    <span className="font-normal text-white/85">({allUrls.length})</span>
                  )}
                </>
              )}
            </button>

            {/* Before / during a run */}
            {isLoading && demoStep ? (
              <div data-tour="demo-progress" className="mt-3 rounded-lg bg-saffron-bg px-3.5 py-3" role="status" aria-live="polite">
                <p className="text-meta font-semibold uppercase tracking-[0.08em] text-saffron-text">
                  Demo run · sped up
                </p>
                <ol className="mt-2 space-y-1.5 text-body">
                  {DEMO_STEPS.map((step, index) => {
                    const done = index < demoStep.index;
                    const current = index === demoStep.index;
                    return (
                      <li
                        key={step.label}
                        className={`flex items-center gap-2 ${
                          done ? "text-pine" : current ? "font-medium text-ink" : "text-ink-faint"
                        }`}
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center" aria-hidden="true">
                          {done ? (
                            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                          ) : current ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin-slow" strokeWidth={2} />
                          ) : (
                            <Circle className="h-3 w-3" strokeWidth={2} />
                          )}
                        </span>
                        <span>
                          <span className="sr-only">{done ? "Done: " : current ? "In progress: " : "Up next: "}</span>
                          {step.label}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                <p className="mt-2 text-meta text-ink-soft">
                  A real run of 5 links takes{" "}
                  {formatRange(estimateExtraction(DEMO_LINKS.length, { ai: true, apify: true, maps: true }))}.
                </p>
              </div>
            ) : isLoading ? (
              <div className="mt-3 rounded-lg border border-line bg-sunken/60 px-3.5 py-3">
                <p className="sr-only" role="status">
                  Extracting places from {allUrls.length} links. Expected {formatRange(expected)}. Keep
                  this tab open.
                </p>
                <div className="flex items-baseline justify-between gap-2" aria-hidden="true">
                  <p className="text-body font-semibold text-ink">Reading your videos…</p>
                  <p className="text-meta tabular-nums text-ink-soft">
                    {formatSeconds(elapsedSeconds)} <span className="text-ink-faint">of ~{formatRange(expected).replace(/^about /, "")}</span>
                  </p>
                </div>
                <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-pine transition-[width] duration-1000 ease-out"
                    style={{ width: `${runProgress}%` }}
                  />
                  <div className="animate-progress-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                </div>
                <p className="mt-2 flex items-start gap-1.5 text-meta text-ink-soft">
                  <Info className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                  Keep this tab open. Each video is scraped, then read by the AI model. Results appear
                  together when the batch finishes.
                </p>
              </div>
            ) : (
              allUrls.length > 0 && (
                <p className="mt-2.5 flex items-start gap-1.5 text-meta text-ink-soft">
                  <Clock className="mt-px h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span>
                    Expected time for {allUrls.length} link{allUrls.length === 1 ? "" : "s"}:{" "}
                    <strong className="font-semibold text-ink">{formatRange(expected)}</strong>
                    {status && !status.ai && " (no AI model set, so you'll get sample results only)"}.
                    {allUrls.length > 50 && " Max 50 links per batch, so split the rest into another run."}
                  </span>
                </p>
              )
            )}

            {errorMessage && (
              <div role="alert" className="mt-3 flex items-start gap-2.5 rounded-lg bg-berry-bg px-3.5 py-3 text-body text-ink-soft">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-berry-text" strokeWidth={2} aria-hidden="true" />
                <p>
                  <FailureReason reason={errorMessage} />
                </p>
              </div>
            )}

            <details className="group mt-4 border-t border-line pt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-meta font-medium text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  className="h-3.5 w-3.5 transition-transform group-open:rotate-90"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                What to expect
              </summary>
              <ul className="mt-2.5 space-y-2 text-meta text-ink-soft">
                {[
                  ["Batch size", "Up to 50 links at a time, scraped 5 at a time."],
                  ["Time", "20–60 s per group of 5, plus 5–20 s per video for the AI. 50 links take about 8–27 minutes."],
                  ["Captions only", "Audio and on-screen text aren't read, so a place never named in the caption won't show up."],
                  ["Some videos can't be read", "Private, deleted or region-locked videos show up as failed."],
                  ["Cost", "Scraping uses Apify credit; the AI uses your provider's credit."],
                ].map(([term, detail]) => (
                  <li key={term}>
                    <span className="font-semibold text-ink">{term}.</span> {detail}
                  </li>
                ))}
              </ul>
            </details>
          </section>

          {usedFallback && (
            <div className="rounded-xl bg-saffron-bg px-4 py-3.5 text-body text-ink-soft" role="status">
              <p className="flex items-center gap-1.5 font-semibold text-saffron-text">
                <FlaskConical className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                Sample results
              </p>
              <p className="mt-1">
                No AI model is set up, so these entries are made up. To read your real videos, set{" "}
                <code className="rounded-sm bg-card px-1 py-px font-mono text-meta">AI_PROVIDER</code>,{" "}
                <code className="rounded-sm bg-card px-1 py-px font-mono text-meta">AI_MODEL</code> and{" "}
                <code className="rounded-sm bg-card px-1 py-px font-mono text-meta">AI_API_KEY</code>, plus{" "}
                <code className="rounded-sm bg-card px-1 py-px font-mono text-meta">APIFY_API_TOKEN</code> to
                fetch captions.
              </p>
            </div>
          )}

          {failedGroups.length > 0 && (
            <section data-tour="failed-links" className="rounded-xl border border-line bg-card p-4 shadow-card" aria-labelledby="failed-title">
              <h2 id="failed-title" className="font-serif text-lead font-semibold text-ink">
                {failedUrls.length} link{failedUrls.length === 1 ? "" : "s"} couldn&rsquo;t be read
              </h2>
              <p className="mt-0.5 text-meta text-ink-soft">Here&rsquo;s what happened and how to fix it.</p>
              <ul className="mt-3 flex flex-col gap-3">
                {failedGroups.map(([reason, urls]) => (
                  <li key={reason} className="rounded-lg bg-berry-bg/70 px-3 py-2.5">
                    <p className="flex items-start gap-2 text-body text-ink">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-berry-text" strokeWidth={2} aria-hidden="true" />
                      <span>
                        <FailureReason reason={reason} />
                      </span>
                    </p>
                    <ul className="mt-1.5 space-y-0.5 pl-6 text-meta text-ink-soft">
                      {urls.slice(0, 3).map((url) => (
                        <li key={url} className="truncate font-mono">
                          {url}
                        </li>
                      ))}
                    </ul>
                    {urls.length > 3 && (
                      <details className="pl-6 text-meta text-ink-soft">
                        <summary className="cursor-pointer font-medium hover:text-ink">
                          Show {urls.length - 3} more
                        </summary>
                        <ul className="mt-0.5 space-y-0.5">
                          {urls.slice(3).map((url) => (
                            <li key={url} className="truncate font-mono">
                              {url}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* Results workspace */}
        <section className="flex min-w-0 flex-col gap-4" aria-label="Results">
          {recommendations.length > 0 && (
            <div data-tour="map-panel">
              <MapExportPanel
                recommendations={recommendations}
                status={status}
                demoMode={demoMode}
                onGeocoded={handleGeocoded}
              />
            </div>
          )}
          {isLoading && recommendations.length === 0 ? (
            <div
              aria-hidden="true"
              className="flex flex-col gap-3 rounded-xl border border-line bg-card p-5 shadow-card"
            >
              <p className="font-serif text-section font-semibold text-ink">Writing up your notebook…</p>
              <p className="text-body text-ink-soft">
                Places will appear here as soon as the batch finishes.
              </p>
              <div className="mt-2 flex flex-col gap-2.5">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center gap-3 rounded-md bg-sunken/70 px-4 py-3">
                    <div className="h-3 w-32 rounded-full bg-line" />
                    <div className="h-3 w-16 rounded-full bg-line/80" />
                    <div className="hidden h-3 flex-1 rounded-full bg-line/60 sm:block" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div data-tour="results">
              <RecommendationsTable recommendations={recommendations} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
