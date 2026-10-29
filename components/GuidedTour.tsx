"use client";

import { useState, type ReactNode } from "react";
import { EVENTS, STATUS, useJoyride, type EventData, type Step } from "react-joyride";

// ---------------------------------------------------------------------------
// Guided tour (react-joyride v3, MIT)
// ---------------------------------------------------------------------------
// Steps point at elements by their `data-tour="..."` attribute. A step can
// run an async `before` action (fill in links, run the demo, click a button)
// and the tour waits for it, showing a loader, before highlighting the
// target. Joyride handles focus trapping, Esc and keyboard navigation.

export interface TourStep {
  /** Matches an element's data-tour attribute. */
  target: string;
  title: string;
  content: ReactNode;
  placement?: Step["placement"];
  /** Runs before the step is shown; the tour waits for it to finish. */
  before?: () => Promise<void>;
}

interface UseGuidedTourOptions {
  steps: TourStep[];
  /** Called with "finished" or "skipped" when the tour ends. */
  onComplete?: (outcome: "finished" | "skipped") => void;
}

export function useGuidedTour({ steps, onComplete }: UseGuidedTourOptions) {
  const [running, setRunning] = useState(false);

  const reducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const { controls, Tour } = useJoyride({
    steps: steps.map<Step>((step) => ({
      target: `[data-tour="${step.target}"]`,
      title: step.title,
      content: step.content,
      placement: step.placement ?? "auto",
      ...(step.before ? { before: () => step.before!() } : {}),
    })),
    continuous: true,
    scrollToFirstStep: true,
    locale: {
      back: "Back",
      close: "Close",
      last: "Finish",
      next: "Next",
      nextWithProgress: "Next ({current} of {total})",
      skip: "Skip guide",
    },
    options: {
      buttons: ["back", "skip", "primary"],
      showProgress: true,
      skipBeacon: true, // go straight to the explanation; no pulsing dots to hunt for
      overlayClickAction: false, // a stray click shouldn't end the guide
      beforeTimeout: 20000, // the demo extraction runs inside a before action
      targetWaitTimeout: 3000,
      primaryColor: "#2F5A43",
      textColor: "#2A2219",
      backgroundColor: "#FFFCF6",
      arrowColor: "#FFFCF6",
      overlayColor: "rgba(42, 34, 25, 0.55)",
      spotlightRadius: 10,
      spotlightPadding: 8,
      scrollDuration: reducedMotion ? 0 : 300,
      width: 380,
      zIndex: 60,
    },
    styles: {
      tooltip: { borderRadius: 14, padding: 20, fontFamily: "var(--font-inter), system-ui, sans-serif" },
      tooltipTitle: {
        fontFamily: "var(--font-source-serif), Georgia, serif",
        fontSize: 20,
        fontWeight: 600,
        textAlign: "left",
        margin: "0 0 6px",
      },
      tooltipContent: { fontSize: 15, lineHeight: 1.55, padding: "4px 0 0", textAlign: "left", color: "#5C5146" },
      buttonPrimary: { borderRadius: 8, fontSize: 14, fontWeight: 600, padding: "9px 14px" },
      buttonBack: { color: "#5C5146", fontSize: 14, marginRight: 6 },
      buttonSkip: { color: "#6E6355", fontSize: 14 },
    },
    onEvent: (data: EventData) => {
      if (data.type !== EVENTS.TOUR_END) return;
      setRunning(false);
      if (data.status === STATUS.FINISHED) onComplete?.("finished");
      else if (data.status === STATUS.SKIPPED) onComplete?.("skipped");
    },
  });

  const start = () => {
    setRunning(true);
    controls.start(0);
  };

  return { start, running, Tour };
}
