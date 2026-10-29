// Decides how much 3D this device should get.
//   "high"   — full scene: higher resolution, post-processing, soft shadows
//   "low"    — phones, tablets and modest laptops: lighter scene, no effects
//   "static" — reduced motion, Data Saver, or no WebGL: a still illustration
//
// A slow frame rate never forces "static": the scene lowers its own quality
// instead (see PerformanceMonitor in Scene.tsx).
export type DeviceTier = "high" | "low" | "static";

export interface TierDecision {
  tier: DeviceTier;
  /** Plain-English reason, logged to the console and shown in development. */
  reason: string;
}

type NavigatorHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectDeviceTier(): TierDecision {
  if (typeof window === "undefined") return { tier: "static", reason: "rendering on the server" };
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { tier: "static", reason: "Reduce Motion is turned on in your system or browser settings" };
  }

  const nav = navigator as NavigatorHints;
  if (nav.connection?.saveData) return { tier: "static", reason: "Data Saver is turned on" };

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) {
      return {
        tier: "static",
        reason: "WebGL isn't available (check that graphics/hardware acceleration is on in your browser settings)",
      };
    }
  } catch {
    return { tier: "static", reason: "WebGL failed to start" };
  }

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const touchFirst = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  if (cores <= 4 || memory <= 4 || touchFirst || narrow) {
    return { tier: "low", reason: "lighter 3D for this device (small screen, touch, or modest hardware)" };
  }
  return { tier: "high", reason: "full 3D" };
}
