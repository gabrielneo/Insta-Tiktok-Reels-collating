"use client";

import { useMemo, useState } from "react";
import { Search, Download, ExternalLink, Compass } from "lucide-react";
import { CATEGORIES, type Category, type Recommendation } from "@/lib/types";
import { exportRecommendationsToExcel } from "@/lib/excelExport";

interface RecommendationsTableProps {
  recommendations: Recommendation[];
}

const CATEGORY_STYLES: Record<Category, string> = {
  "Food & Drink": "bg-pine/10 text-pine-dark border-pine/25",
  Adventure: "bg-brass/10 text-brass-dark border-brass/30",
  Culture: "bg-plum/10 text-plum border-plum/25",
  Shopping: "bg-slateblue/10 text-slateblue border-slateblue/25",
  Sightseeing: "bg-clay/10 text-clay border-clay/25",
};

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
      <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-6 text-center">
        <Compass className="h-8 w-8 text-ink-faint" strokeWidth={1.5} />
        <p className="max-w-xs text-sm text-ink-soft">
          Paste some Reel or TikTok links on the left and extract to start filling this log.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Toolbar: search, filter chips, export */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
              strokeWidth={2}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search place or location"
              className="w-full rounded-md border border-line bg-card py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-pine focus:outline-none focus:ring-1 focus:ring-pine"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["All", ...CATEGORIES] as const).map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-pine bg-pine text-white"
                      : "border-line bg-card text-ink-soft hover:border-pine/40 hover:text-ink"
                  }`}
                >
                  {cat}
                  <span className={isActive ? "text-white/70" : "text-ink-faint"}>
                    {" "}
                    {categoryCounts[cat] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-pine px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-pine-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" strokeWidth={2} />
          Export to Excel
        </button>
      </div>

      {/* Result count */}
      <p className="text-xs text-ink-faint">
        Showing {filtered.length} of {recommendations.length} entries
      </p>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-line bg-card">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="sticky top-0 bg-paper">
            <tr>
              <Th>Place Name</Th>
              <Th>Category</Th>
              <Th>Location</Th>
              <Th>Recommended Activities</Th>
              <Th>Notes / Highlights</Th>
              <Th>Source</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map((rec, idx) => (
              <tr key={`${rec.reel_url}-${idx}`} className="hover:bg-paper/60">
                <td className="max-w-[200px] px-4 py-3 font-medium text-ink">
                  {rec.place_name}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[rec.category]}`}
                  >
                    {rec.category}
                  </span>
                </td>
                <td className="max-w-[160px] px-4 py-3 text-ink-soft">
                  {rec.location}
                </td>
                <td className="max-w-[280px] px-4 py-3 text-ink-soft">
                  {rec.recommended_activities || "—"}
                </td>
                <td className="max-w-[240px] px-4 py-3 text-ink-soft">
                  {rec.rating_or_notes || "—"}
                </td>
                <td className="px-4 py-3">
                  <a
                    href={rec.reel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-pine hover:text-pine-dark hover:underline"
                  >
                    View video
                    <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-sm text-ink-soft">
              No entries match &ldquo;{query}&rdquo;
              {activeCategory !== "All" ? ` in ${activeCategory}` : ""}.
            </p>
            <button
              onClick={() => {
                setQuery("");
                setActiveCategory("All");
              }}
              className="text-sm font-medium text-pine hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-ink-soft">
      {children}
    </th>
  );
}
