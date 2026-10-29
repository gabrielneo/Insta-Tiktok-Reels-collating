"use client";

import { useRef } from "react";
import { BookOpen, ExternalLink, KeyRound, ListChecks, RefreshCw, ShieldCheck, X } from "lucide-react";

const README_SETUP_URL = "https://github.com/gabrielneo/Insta-Tiktok-Reels-collating#use-it-on-your-real-videos";

const STEPS = [
  {
    icon: KeyRound,
    title: "Get three keys",
    body: (
      <>
        One from an <strong className="text-ink">AI service</strong> (Claude, ChatGPT, Gemini, or free Ollama on
        your computer) to read the captions, one from <strong className="text-ink">Apify</strong> to fetch the
        videos, and one from <strong className="text-ink">Google Maps</strong> (with Places API (New) turned on) to
        put your places on the map.
      </>
    ),
  },
  {
    icon: BookOpen,
    title: "Put them in your settings file",
    body: (
      <>
        In the app&rsquo;s folder on your computer, copy{" "}
        <code className="rounded-sm bg-sunken px-1 py-px font-mono text-meta">.env.example</code> to{" "}
        <code className="rounded-sm bg-sunken px-1 py-px font-mono text-meta">.env.local</code> and paste your keys
        into it. The file explains each line.
      </>
    ),
  },
  {
    icon: RefreshCw,
    title: "Restart the app",
    body: (
      <>
        In Terminal, stop it with <kbd className="rounded-sm border border-line bg-card px-1 font-mono text-meta">Ctrl</kbd>{" "}
        + <kbd className="rounded-sm border border-line bg-card px-1 font-mono text-meta">C</kbd>, then run{" "}
        <code className="rounded-sm bg-sunken px-1 py-px font-mono text-meta">npm run dev</code>. If a key looks
        wrong, it tells you which one.
      </>
    ),
  },
  {
    icon: ListChecks,
    title: "Paste your links",
    body: <>Paste your saved Reels and TikToks and press Extract places. Any problems come with a plain-English fix.</>,
  },
];

export default function SetupGuideDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-card px-3 py-1.5 text-body font-medium text-ink shadow-card transition-colors hover:border-pine hover:text-pine"
      >
        <BookOpen className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        How to set up
      </button>

      {/* Native <dialog>: Esc closes it, focus stays inside, the page behind is inert. */}
      <dialog
        ref={dialogRef}
        aria-labelledby="setup-dialog-title"
        onClick={(event) => {
          // A click on the dimmed backdrop (outside the panel) closes it.
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-line bg-card p-0 text-ink shadow-lift backdrop:bg-ink/50 backdrop:backdrop-blur-[2px]"
      >
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="setup-dialog-title" className="font-serif text-section font-semibold text-ink">
                How to set up Fieldnotes
              </h2>
              <p className="mt-1 text-body text-ink-soft">
                The demo works without this. To read your own videos, it takes about 10 minutes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-sunken hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          <ol className="mt-5 space-y-4">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-pine text-white" aria-hidden="true">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div>
                  <p className="font-semibold text-ink">
                    <span className="sr-only">Step {index + 1}: </span>
                    {title}
                  </p>
                  <p className="mt-0.5 text-body text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-5 flex items-start gap-2 rounded-lg bg-pine-tint/70 px-3.5 py-3 text-body text-ink-soft">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-pine" strokeWidth={2} aria-hidden="true" />
            Your keys stay in that file on your computer. Never type them into a website, including this one.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <a
              href={README_SETUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-card px-4 py-2 text-body font-medium text-ink hover:border-pine hover:text-pine"
            >
              Full step-by-step guide
              <ExternalLink className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex items-center justify-center rounded-md bg-pine px-4 py-2 text-body font-semibold text-white hover:bg-pine-dark"
            >
              Got it
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
