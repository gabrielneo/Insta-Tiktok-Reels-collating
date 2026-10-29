import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Fieldnotes — turn saved food Reels & TikToks into a list of places",
  description:
    "Fieldnotes reads the captions of the Instagram Reels and TikToks you've saved and writes up every place they mention, with what to order, prices, tips and pins on your own map.",
};

export default function HomePage() {
  return <Landing />;
}
