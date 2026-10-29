"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  ArrowDown,
  ArrowRight,
  Bot,
  ClipboardPaste,
  FileSpreadsheet,
  Github,
  LockKeyhole,
  MapPin,
  MessageCircleWarning,
  NotebookPen,
  PlayCircle,
  Search,
  Tags,
} from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import { CATEGORY_STYLES } from "@/components/categoryStyles";
import PriceBadge from "@/components/PriceBadge";
import StaticScene from "./StaticScene";
import { detectDeviceTier, type TierDecision } from "./deviceTier";
import { progressToChapter, scrollState } from "./scrollState";

// Three.js only loads in the browser, after the page's text is on screen.
const Scene = dynamic(() => import("./Scene"), { ssr: false });

const REPO_URL = "https://github.com/gabrielneo/Insta-Tiktok-Reels-collating";
const APP_URL = "/app";
/** Height of the sticky top bar in px (measured: 71px incl. border). */
const NAV_HEIGHT = 72;

export default function Landing() {
  const [decision, setDecision] = useState<TierDecision | null>(null);
  const tier = decision?.tier ?? null;
  const [sceneReady, setSceneReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // Set by the scroll effect; scrolls to the top and replays the intro.
  const restartRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const result = detectDeviceTier();
    // Explains in the browser console why the 3D scene is (or isn't) running.
    console.info(`[Fieldnotes] 3D scene: ${result.tier}. ${result.reason}.`);
    setDecision(result);
  }, []);

  const animated = tier === "high" || tier === "low";

  // Smooth scroll + scroll-driven chapters + text reveals.
  useEffect(() => {
    if (!animated || !rootRef.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ autoRaf: false, lerp: 0.09 });
    const raf = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    let anchors: number[] = [];
    const measureAnchors = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      anchors = Array.from(document.querySelectorAll<HTMLElement>("[data-chapter]"))
        .sort((a, b) => Number(a.dataset.chapter) - Number(b.dataset.chapter))
        .map((el, i, all) => {
          if (i === 0) return 0;
          if (i === all.length - 1) return 1;
          const middle = el.offsetTop + el.offsetHeight / 2 - window.innerHeight / 2;
          return Math.min(1, Math.max(0, middle / max));
        });
    };

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onRefresh: measureAnchors,
        onUpdate: (self) => {
          scrollState.progress = self.progress;
          scrollState.chapter = progressToChapter(self.progress, anchors);
        },
      });
    }, rootRef);

    // Text reveals live in their own context so they can be rebuilt (replayed).
    const buildReveals = () =>
      gsap.context(() => {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          gsap.from(el, {
            opacity: 0,
            y: 36,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });
      }, rootRef);
    let reveals = buildReveals();

    measureAnchors();
    ScrollTrigger.refresh();

    // Logo click: glide back to the top (the 3D story rewinds as it goes),
    // then replay the hero intro and re-arm every section's reveal.
    const replayIntro = () => {
      reveals.revert();
      reveals = buildReveals();
      ScrollTrigger.refresh();
    };
    restartRef.current = () => {
      if (window.scrollY < 4) {
        replayIntro();
        return;
      }
      lenis.scrollTo(0, {
        duration: Math.min(2.4, 0.9 + window.scrollY / 4000),
        onComplete: replayIntro,
      });
    };

    // In-page links ("See how it works") glide instead of jumping.
    const onAnchorClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const target = document.querySelector(link.getAttribute("href")!);
      if (!target) return;
      event.preventDefault();
      // Leave room for the sticky top bar.
      lenis.scrollTo(target as HTMLElement, { offset: -(NAV_HEIGHT + 8) });
    };
    document.addEventListener("click", onAnchorClick);

    return () => {
      document.removeEventListener("click", onAnchorClick);
      restartRef.current = null;
      reveals.revert();
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, [animated]);

  // Pointer position for the scene's parallax.
  useEffect(() => {
    if (!animated) return;
    const onMove = (event: PointerEvent) => {
      scrollState.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [animated]);

  return (
    <div ref={rootRef} className="relative bg-paper text-ink">
      {/* 3D canvas, fixed behind the page */}
      {animated && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000 ${
            sceneReady ? "opacity-100" : "opacity-0"
          }`}
        >
          <Scene tier={tier} onReady={() => setSceneReady(true)} />
        </div>
      )}

      <div className="relative z-10">
        <SiteNav onHome={() => {
          if (restartRef.current) restartRef.current();
          else {
            const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
          }
        }} />

        {/* 0 · Hero */}
        <section data-chapter="0" className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pb-16 pt-24 sm:px-8">
          {/* keeps the headline readable over the moving scene */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-paper via-paper/95 to-paper/30 md:inset-y-0 md:left-0 md:right-auto md:w-2/3 md:bg-gradient-to-r md:from-paper md:via-paper/85 md:to-transparent" />
          <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="max-w-2xl">
              <p data-reveal className="inline-flex items-center gap-2 rounded-full border border-pine/25 bg-card/80 px-3 py-1 text-meta font-semibold text-pine backdrop-blur">
                <NotebookPen className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                For foodies with too many saved videos
              </p>
              <h1 data-reveal className="mt-5 font-serif text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl">
                Stop rewatching.
                <br />
                <span className="text-pine">Start eating.</span>
              </h1>
              <p data-reveal className="mt-5 max-w-xl text-lead text-ink-soft sm:text-[1.15rem] sm:leading-8">
                Fieldnotes turns the food Reels and TikToks you&rsquo;ve saved into one searchable list of
                places, with what to order, how pricey it is, the creator&rsquo;s tips, and pins on your own
                map.
              </p>
              <div data-reveal className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={APP_URL}
                  className="group inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-6 py-3.5 text-lead font-semibold text-white shadow-lift transition-all hover:-translate-y-0.5 hover:bg-pine-dark"
                >
                  <PlayCircle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                  Try now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card/80 px-5 py-3.5 text-body font-medium text-ink backdrop-blur transition-colors hover:border-pine hover:text-pine"
                >
                  See how it works
                  <ArrowDown className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </a>
              </div>
              <p data-reveal className="mt-3 text-meta text-ink-soft">
                2 minutes · sample videos · no sign-up, no keys, no cost
              </p>
              <ul data-reveal className="mt-8 flex flex-wrap gap-2 text-meta text-ink-soft" aria-label="Highlights">
                {["Instagram Reels + TikTok", "Free & open source (MIT)", "Claude, GPT, Gemini or a free local AI"].map((item) => (
                  <li key={item} className="rounded-full border border-line bg-card/80 px-3 py-1 backdrop-blur">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {!animated && (
              <div className="mx-auto w-full max-w-xl">
                <StaticScene className="w-full" />
                {process.env.NODE_ENV === "development" && tier === "static" && decision && (
                  <p className="mt-2 text-center text-meta text-ink-soft">
                    Dev note: showing the still image because {decision.reason}.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 1–4 · How it works, one camera move per chapter */}
        <div id="how" className="scroll-mt-20">
          <Chapter
            chapter={1}
            align="right"
            step="01"
            icon={<ClipboardPaste className="h-5 w-5" strokeWidth={2} />}
            title="Paste your saved links"
            body="Copy links from the Reels and TikToks you've saved and paste up to 50 at once. One per line. Fieldnotes tells you straight away if a link isn't supported."
          >
            <div className="flex flex-wrap gap-1.5 font-mono text-meta">
              {["instagram.com/reel/…", "tiktok.com/@…/video/…", "vm.tiktok.com/…"].map((link) => (
                <span key={link} className="rounded-md border border-line bg-sunken px-2 py-1 text-ink-soft">
                  {link}
                </span>
              ))}
            </div>
          </Chapter>

          <Chapter
            chapter={2}
            align="left"
            step="02"
            icon={<Bot className="h-5 w-5" strokeWidth={2} />}
            title="AI reads every caption"
            body="An AI model reads each video's caption and writes down every place it mentions, not just one per video. Use Claude, GPT, Gemini, or a free model on your own computer."
          >
            <p className="rounded-lg border-l-4 border-saffron bg-saffron-bg px-3 py-2 text-body italic text-ink-soft">
              &ldquo;Top 3 ramen in Shibuya: Ichiran for solo booths, …&rdquo;
              <span className="mt-1 block not-italic text-meta font-semibold text-saffron-text">→ 3 places noted</span>
            </p>
          </Chapter>

          <Chapter
            chapter={3}
            align="right"
            step="03"
            icon={<Tags className="h-5 w-5" strokeWidth={2} />}
            title="Every place, sorted"
            body="Name, area, what to order, price and the creator's tips, all in one searchable table. Filter by category in a tap."
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {CATEGORIES.map((category) => (
                <span
                  key={category}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-meta font-medium transition-transform hover:-translate-y-0.5 ${CATEGORY_STYLES[category].chip}`}
                >
                  <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${CATEGORY_STYLES[category].dot}`} />
                  {category}
                </span>
              ))}
              <PriceBadge price="$$" />
            </div>
          </Chapter>

          <Chapter
            chapter={4}
            align="left"
            step="04"
            icon={<MapPin className="h-5 w-5" strokeWidth={2} />}
            title="Pins on your own map"
            body="Find every place on Google Maps, then drop the pins into your own Google My Maps, ready for your next trip or to share with the group chat."
          >
            <div className="flex flex-wrap gap-1.5 text-meta">
              <span className="rounded-full bg-pine-tint px-2.5 py-0.5 font-medium text-pine">7 found</span>
              <span className="rounded-full bg-sunken px-2.5 py-0.5 text-ink-soft">1 not found</span>
              <span className="rounded-full border border-line bg-card px-2.5 py-0.5 text-ink-soft">My Maps .csv</span>
            </div>
          </Chapter>
        </div>

        {/* Feature grid */}
        <section aria-labelledby="features-title" className="px-4 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl rounded-2xl border border-line bg-card/90 p-6 shadow-lift backdrop-blur sm:p-10">
            <p data-reveal className="eyebrow">Everything in one place</p>
            <h2 id="features-title" data-reveal className="mt-2 font-serif text-display font-semibold text-ink sm:text-[2.25rem] sm:leading-tight">
              Built for real trip planning
            </h2>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <li
                  key={feature.title}
                  data-reveal
                  className="group rounded-xl border border-line bg-paper/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-pine/40 hover:bg-card hover:shadow-lift"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine-tint text-pine transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                    {feature.icon}
                  </div>
                  <h3 className="mt-4 font-serif text-lead font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1 text-body text-ink-soft">{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5 · Final call to action */}
        <section data-chapter="5" aria-labelledby="cta-title" className="flex min-h-[80svh] items-center px-4 py-24 sm:px-8">
          <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-card/90 p-8 text-center shadow-lift backdrop-blur sm:p-12">
            <h2 id="cta-title" data-reveal className="font-serif text-display font-semibold text-ink sm:text-5xl sm:leading-tight">
              Your saved folder,
              <br />
              <span className="text-pine">finally useful.</span>
            </h2>
            <p data-reveal className="mx-auto mt-4 max-w-md text-lead text-ink-soft">
              Watch it work on sample videos first. When you&rsquo;re ready, connect your own on your computer.
            </p>
            <div data-reveal className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href={APP_URL}
                className="group inline-flex items-center justify-center gap-2 rounded-lg bg-pine px-6 py-3.5 text-lead font-semibold text-white shadow-lift transition-all hover:-translate-y-0.5 hover:bg-pine-dark"
              >
                <PlayCircle className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                Try now
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} aria-hidden="true" />
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-5 py-3.5 text-body font-medium text-ink transition-colors hover:border-pine hover:text-pine"
              >
                <Github className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                View on GitHub<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
            <p className="mt-4 text-meta text-ink-soft">
              The demo uses sample videos. Reading your own needs three keys (Apify, an AI service and Google
              Maps), set up on your own computer. The README shows how.
            </p>
          </div>
        </section>

        <footer className="border-t border-line bg-paper/90 px-4 py-8 text-meta text-ink-soft backdrop-blur sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>Fieldnotes · open source under the MIT licence</p>
            <p>Not affiliated with Instagram, TikTok or Google.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

const FEATURES: { title: string; body: string; icon: ReactNode }[] = [
  { title: "Search and filter", body: "Find a place by name or city, or show just Food & Drink, sights or shopping.", icon: <Search className="h-5 w-5" strokeWidth={2} /> },
  { title: "Price at a glance", body: "$ to $$$$ badges, so you can tell a hawker stall from a splurge.", icon: <Tags className="h-5 w-5" strokeWidth={2} /> },
  { title: "Several places per video", body: "A “top 5” reel gives you five rows, each with its own tips.", icon: <NotebookPen className="h-5 w-5" strokeWidth={2} /> },
  { title: "Friendly error messages", body: "Private or deleted videos are explained in plain English, with what to do next.", icon: <MessageCircleWarning className="h-5 w-5" strokeWidth={2} /> },
  { title: "Export to Excel", body: "Keep a copy of your list, map links included, to share or plan with.", icon: <FileSpreadsheet className="h-5 w-5" strokeWidth={2} /> },
  { title: "Your keys stay with you", body: "API keys live in a file on your own computer. The app never asks for them on a web page.", icon: <LockKeyhole className="h-5 w-5" strokeWidth={2} /> },
];

function SiteNav({ onHome }: { onHome: () => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-line/70 bg-paper/80 backdrop-blur-md">
      <nav aria-label="Main" className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href="/"
          onClick={(event) => {
            // Plain clicks restart the page; Cmd/Ctrl/middle-click still open a new tab.
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            onHome();
          }}
          aria-label="Fieldnotes, back to the top"
          className="flex items-center gap-2.5 rounded-md"
        >
          <span className="flex h-9 w-9 -rotate-3 items-center justify-center rounded-lg bg-pine text-white shadow-card">
            <NotebookPen className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className="font-serif text-section font-semibold text-ink">Fieldnotes</span>
        </Link>
        <div className="flex items-center gap-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-md px-3 py-1.5 text-body font-medium text-ink-soft hover:text-ink sm:inline-flex"
          >
            <Github className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Link
            href={APP_URL}
            className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-body font-medium text-white transition-colors hover:bg-pine-dark"
          >
            Open the app
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

function Chapter({
  chapter,
  align,
  step,
  icon,
  title,
  body,
  children,
}: {
  chapter: number;
  align: "left" | "right";
  step: string;
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <section data-chapter={chapter} aria-labelledby={`chapter-${chapter}`} className="flex min-h-[110svh] items-center px-4 py-20 sm:px-8">
      <div className={`mx-auto flex w-full max-w-7xl ${align === "right" ? "md:justify-end" : "md:justify-start"}`}>
        <article
          data-reveal
          className="group w-full max-w-md rounded-2xl border border-line bg-card/90 p-6 shadow-lift backdrop-blur transition-transform duration-300 hover:-translate-y-1 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-pine text-white transition-transform duration-300 group-hover:-rotate-6" aria-hidden="true">
              {icon}
            </span>
            <span className="font-mono text-meta font-semibold tracking-[0.12em] text-ink-faint">STEP {step}</span>
          </div>
          <h2 id={`chapter-${chapter}`} className="mt-4 font-serif text-display font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-2 text-lead text-ink-soft">{body}</p>
          {children && <div className="mt-5">{children}</div>}
        </article>
      </div>
    </section>
  );
}
