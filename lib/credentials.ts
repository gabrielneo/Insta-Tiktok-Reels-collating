import "server-only";
import type { AiProviderId } from "./aiProviders";
import { env } from "./env";

// ---------------------------------------------------------------------------
// Which keys the server may spend
// ---------------------------------------------------------------------------
// The .env keys are used only under `npm run dev` or with
// USE_SERVER_KEYS=true. A production build (any public deployment) gets
// none, even if keys were left in its environment or a .env.local, so
// visitors only ever see the demo and sample results. To use real keys,
// people clone the repo and run it themselves.

export interface AiCredentials {
  provider: AiProviderId;
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

export interface Credentials {
  ai?: AiCredentials;
  apifyToken?: string;
  mapsKey?: string;
}

export function serverKeysEnabled(): boolean {
  return env.NODE_ENV === "development" || env.USE_SERVER_KEYS;
}

export function serverCredentials(): Credentials {
  if (!serverKeysEnabled()) return {};
  return {
    ai:
      env.AI_PROVIDER && env.AI_MODEL
        ? { provider: env.AI_PROVIDER, model: env.AI_MODEL, apiKey: env.AI_API_KEY, baseUrl: env.AI_BASE_URL }
        : undefined,
    apifyToken: env.APIFY_API_TOKEN,
    mapsKey: env.GOOGLE_MAPS_API_KEY,
  };
}
