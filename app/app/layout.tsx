import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fieldnotes — your notebook",
  description: "Paste saved Instagram Reels and TikToks and turn them into a searchable list of places.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
