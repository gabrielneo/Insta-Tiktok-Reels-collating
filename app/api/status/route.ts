import { NextResponse } from "next/server";
import { serverCredentials } from "@/lib/credentials";
import type { ServiceStatus } from "@/lib/types";

// Read the environment on every request, not once at build time.
export const dynamic = "force-dynamic";

// Lets the page explain what will happen (demo mode, how long, whether the
// map step is available) before the user starts. Only booleans leave the
// server, and on a deployed copy they are all false (see lib/credentials.ts).
export async function GET() {
  const server = serverCredentials();
  const status: ServiceStatus = {
    ai: Boolean(server.ai),
    apify: Boolean(server.apifyToken),
    maps: Boolean(server.mapsKey),
  };
  return NextResponse.json(status);
}
