import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#F6F3EC",
        ink: {
          DEFAULT: "#221F1A",
          soft: "#5B564C",
          faint: "#8A8377",
        },
        pine: {
          DEFAULT: "#2E4B3C",
          light: "#3E6350",
          dark: "#1F3629",
        },
        brass: {
          DEFAULT: "#B8862E",
          light: "#D6A857",
          dark: "#8F6821",
        },
        line: "#DDD6C7",
        card: "#FFFFFF",
        plum: "#6B4A72",
        slateblue: "#3E6B8A",
        clay: "#A65A3D",
      },
      fontFamily: {
        serif: ["var(--font-source-serif)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(34, 31, 26, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
