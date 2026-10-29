import type { PriceRange } from "@/lib/types";

const LEVEL_NAMES = ["", "Budget", "Moderate", "Pricey", "Splurge"];

// Four "$" marks with the price level filled in: $$·· reads faster than "$$".
export default function PriceBadge({ price }: { price: PriceRange }) {
  if (price === "N/A") {
    return (
      <span className="text-meta text-ink-faint" aria-label="Price not mentioned">
        —
      </span>
    );
  }
  const level = price.length;
  return (
    <span
      className="inline-flex items-center rounded-sm border border-line bg-sunken px-1.5 py-0.5 font-mono text-meta font-semibold tracking-wider"
      aria-label={`Price: ${LEVEL_NAMES[level]} (${price})`}
      title={LEVEL_NAMES[level]}
    >
      {[1, 2, 3, 4].map((step) => (
        <span key={step} aria-hidden="true" className={step <= level ? "text-ink" : "text-ink-faint/40"}>
          $
        </span>
      ))}
    </span>
  );
}
