import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isAiConfigured } from "@/lib/llm";
import type { ServiceStatus } from "@/lib/types";

// Read the environment on every request, not once at build time.
export const dynamic = "force-dynamic";

// Lets the page explain what will happen (demo mode, how long, whether the
// map step is available) before the user starts. Only booleans leave the server.
export async function GET() {
  const status: ServiceStatus = {
    ai: isAiConfigured(),
    apify: Boolean(env.APIFY_API_TOKEN),
    maps: Boolean(env.GOOGLE_MAPS_API_KEY),
  };
  return NextResponse.json(status);
}
