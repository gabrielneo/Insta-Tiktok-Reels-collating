"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search, Download, ExternalLink, MapPin, NotebookPen, Info, X } from "lucide-react";
import { CATEGORIES, type Category, type Recommendation } from "@/lib/types";
import { exportRecommendationsToExcel } from "@/lib/excelExport";
import { CATEGORY_STYLES } from "./categoryStyles";
import PriceBadge from "./PriceBadge";

interface RecommendationsTableProps {
  recommendations: Recommendation[];
}

function platformOf(url: string): string {
  return /tiktok/i.test(url) ? "TikTok" : /instagram/i.test(url) ? "Instagram" : "Video";
}

export default function RecommendationsTable({
  recommendations,
}: RecommendationsTableProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return recommendations.filter((rec) => {
      const matchesCategory =
        activeCategory === "All" || rec.category === activeCategory;
      const matchesQuery =
        q.length === 0 ||
        rec.place_name.toLowerCase().includes(q) ||
        rec.location.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [recommendations, query, activeCategory]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: recommendations.length };
    for (const cat of CATEGORIES) counts[cat] = 0;
    for (const rec of recommendations) {
      counts[rec.category] = (counts[rec.category] ?? 0) + 1;
    }
    return counts;
  }, [recommendations]);

  const handleExport = () => {
    exportRecommendationsToExcel(filtered);
  };

  if (recommendations.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-card/60 px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sunken text-ink-faint">
          <NotebookPen className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <h2 className="font-serif text-section font-semibold text-ink">Your notebook is empty</h2>
        <p className="max-w-sm text-body text-ink-soft">
          Paste Reel or TikTok links on the left and extract them. Every place they mention will be
          written up here.
        </p>
      </div>
    );
  }

  const hasFilters = query.trim().length > 0 || activeCategory !== "All";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Toolbar: search, filter chips, export */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <label htmlFor="results-search" className="sr-only">
              Search places or locations
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={2}
              aria-hidden="true"
            />
            <input
              id="results-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search place or location"
              className="w-full rounded-md border border-line bg-card py-2 pl-9 pr-3 text-body text-ink shadow-card placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-2 focus:ring-pine/25"
            />
          </div>

          <button
            onClick={handleExport}
            data-tour="export-excel"
            disabled={filtered.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-pine bg-card px-4 py-2 text-body font-medium text-pine shadow-card transition-colors hover:bg-pine-tint disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Export to Excel
            <span className="text-meta font-normal text-ink-soft">({filtered.length})</span>
          </button>
        </div>

        <div role="group" aria-label="Filter by category" data-tour="filters" className="flex flex-wrap gap-1.5">
          {(["All", ...CATEGORIES] as const).map((cat) => {
            const isActive = activeCategory === cat;
            const style = cat === "All" ? null : CATEGORY_STYLES[cat];
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-meta font-medium transition-colors ${
                  isActive
                    ? style?.active ?? "border-ink bg-ink text-white"
                    : "border-line bg-card text-ink-soft hover:border-ink-faint hover:text-ink"
                }`}
              >
                {style && (
                  <span
                    aria-hidden="true"
                    className={`h-2 w-2 rounded-full ${isActive ? "bg-white/90" : style.dot}`}
                  />
                )}
                {cat}
                <span className={isActive ? "text-white/85" : "text-ink-faint"}>
                  {categoryCounts[cat] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Result count + "nothing is saved" reminder */}
      <div className="flex flex-col gap-1 text-meta text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p aria-live="polite">
          Showing <strong className="font-semibold text-ink">{filtered.length}</strong> of{" "}
          {recommendations.length} places
        </p>
        <p className="flex items-center gap-1.5 text-ink-faint">
          <Info className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          Results live in this tab only. Export before you close it.
        </p>
      </div>

      {/* Table: scrolls sideways inside its own box, never the page */}
      <p className="-mb-2 flex items-center justify-end gap-1 text-meta text-ink-faint 2xl:hidden" aria-hidden="true">
        Scroll sideways for more columns
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
      </p>
      <div
        role="region"
        aria-label="Places table. Scroll sideways for more columns."
        tabIndex={0}
        className="overflow-x-auto rounded-lg border border-line bg-card shadow-card"
      >
        <table className="w-full min-w-[1180px] border-collapse text-left text-body">
          <thead className="bg-sunken">
            <tr>
              <Th className="sticky left-0 z-10 w-[200px] bg-sunken">Place</Th>
              <Th className="w-[140px]">Category</Th>
              <Th className="w-[150px]">Location</Th>
              <Th className="w-[230px]">What to order or do</Th>
              <Th className="w-[80px]">Price</Th>
              <Th className="w-[220px]">Notes</Th>
              <Th className="w-[110px]">Map</Th>
              <Th className="w-[110px]">Source</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((rec, idx) => (
              <tr key={`${rec.reel_url}-${idx}`} className="group align-top transition-colors hover:bg-paper">
                <td className="sticky left-0 z-[1] border-r border-line/70 bg-card px-4 py-3 font-serif text-lead font-semibold leading-snug text-ink transition-colors group-hover:bg-paper">
                  {rec.place_name}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-meta font-medium ${CATEGORY_STYLES[rec.category].chip}`}
                  >
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CATEGORY_STYLES[rec.category].dot}`} />
                    {rec.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-soft">{rec.location}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {rec.recommended_activities || <span className="text-ink-faint">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <PriceBadge price={rec.price_range} />
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {rec.rating_or_notes || <span className="text-ink-faint">—</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {rec.geo?.status === "found" ? (
                    <a
                      href={rec.geo.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={rec.geo.formatted_address}
                      className="inline-flex items-center gap-1 rounded-full bg-pine-tint px-2.5 py-0.5 text-meta font-medium text-pine hover:bg-pine hover:text-white"
                    >
                      <MapPin className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                      Open map
                      <span className="sr-only">for {rec.place_name} (opens in a new tab)</span>
                    </a>
                  ) : rec.geo?.status === "not_found" ? (
                    <span className="text-meta text-ink-faint">Not found</span>
                  ) : rec.geo?.status === "error" ? (
                    <span className="text-meta font-medium text-berry-text" title={rec.geo.reason}>
                      Lookup failed
                    </span>
                  ) : (
                    <span className="text-ink-faint" aria-label="Not looked up yet">
                      —
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <a
                    href={rec.reel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-meta font-medium text-pine underline-offset-2 hover:underline"
                  >
                    {platformOf(rec.reel_url)}
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    <span className="sr-only">video for {rec.place_name} (opens in a new tab)</span>
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <p className="font-serif text-lead font-semibold text-ink">No places match</p>
            <p className="text-body text-ink-soft">
              {query.trim() ? (
                <>
                  Nothing for &ldquo;{query}&rdquo;
                  {activeCategory !== "All" ? ` in ${activeCategory}` : ""}. Try another word or
                  category.
                </>
              ) : (
                <>Nothing in {activeCategory} yet. Try another category.</>
              )}
            </p>
            {hasFilters && (
              <button
                onClick={() => {
                  setQuery("");
                  setActiveCategory("All");
                }}
                className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-1.5 text-body font-medium text-ink hover:border-pine hover:text-pine"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap border-b border-line px-4 py-2.5 text-meta font-semibold uppercase tracking-[0.06em] text-ink-soft ${className}`}
    >
      {children}
    </th>
  );
}
