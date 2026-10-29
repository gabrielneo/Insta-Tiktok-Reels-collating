import type { Category } from "@/lib/types";

// One colour per category, reused everywhere a category appears (chips,
// filters, table). Text/background pairs are WCAG AA; see tailwind.config.ts.
export const CATEGORY_STYLES: Record<Category, { chip: string; dot: string; active: string }> = {
  "Food & Drink": {
    chip: "bg-food-bg text-food-text border-food-dot/30",
    dot: "bg-food-dot",
    active: "bg-food-text text-white border-food-text",
  },
  Adventure: {
    chip: "bg-adventure-bg text-adventure-text border-adventure-dot/30",
    dot: "bg-adventure-dot",
    active: "bg-adventure-text text-white border-adventure-text",
  },
  Culture: {
    chip: "bg-culture-bg text-culture-text border-culture-dot/30",
    dot: "bg-culture-dot",
    active: "bg-culture-text text-white border-culture-text",
  },
  Shopping: {
    chip: "bg-shopping-bg text-shopping-text border-shopping-dot/30",
    dot: "bg-shopping-dot",
    active: "bg-shopping-text text-white border-shopping-text",
  },
  Sightseeing: {
    chip: "bg-sightseeing-bg text-sightseeing-text border-sightseeing-dot/30",
    dot: "bg-sightseeing-dot",
    active: "bg-sightseeing-text text-white border-sightseeing-text",
  },
};
