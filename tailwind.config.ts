import type { Config } from "tailwindcss";

// ---------------------------------------------------------------------------
// Fieldnotes design system — "a foodie's notebook"
// ---------------------------------------------------------------------------
// Warm cream paper, ink-dark text, herb green for actions, saffron for
// sample/demo notes, berry for problems. Every text/background pair used in
// the UI is checked against WCAG AA (4.5:1) — keep new pairs at or above it.
const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        paper: "#F7F1E5", // page background
        card: "#FFFCF6", // panels
        sunken: "#F1E9DA", // inputs, wells, table header
        line: "#E2D6C1", // borders and rules

        // Text
        ink: {
          DEFAULT: "#2A2219", // 13.9:1 on paper
          soft: "#5C5146", // 6.9:1 on paper
          faint: "#6E6355", // 5.2:1 on paper — the lightest text allowed
        },

        // Actions
        pine: {
          DEFAULT: "#2F5A43",
          dark: "#234634",
          tint: "#E4EEE7",
        },

        // Notes and states
        saffron: { DEFAULT: "#E3A53B", text: "#7A4E00", bg: "#FDF1D2" }, // demo / sample / tips
        berry: { DEFAULT: "#C2414E", text: "#9C2A35", bg: "#FBE9EA" }, // problems

        // Categories (see components/categoryStyles.ts)
        food: { text: "#9A3E12", bg: "#FCE9DC", dot: "#D2692F" },
        adventure: { text: "#46641F", bg: "#ECF2DE", dot: "#6E9636" },
        culture: { text: "#6A4389", bg: "#F2EAF8", dot: "#9467B8" },
        shopping: { text: "#1C6468", bg: "#E0F1F1", dot: "#2E9097" },
        sightseeing: { text: "#285A84", bg: "#E3EDF7", dot: "#4A84B8" },
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      // Type scale: 12 meta · 14 body · 16 lead · 20 section · 28 display
      fontSize: {
        meta: ["0.75rem", { lineHeight: "1.1rem" }],
        body: ["0.875rem", { lineHeight: "1.4rem" }],
        lead: ["1rem", { lineHeight: "1.55rem" }],
        section: ["1.25rem", { lineHeight: "1.65rem" }],
        display: ["1.75rem", { lineHeight: "2.1rem" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(42, 34, 25, 0.04), 0 1px 3px rgba(42, 34, 25, 0.06)",
        lift: "0 4px 14px rgba(42, 34, 25, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
