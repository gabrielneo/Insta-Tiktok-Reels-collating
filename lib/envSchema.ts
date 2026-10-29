import { z } from "zod";
import { AI_PROVIDERS, AI_PROVIDER_IDS } from "./aiProviders";

// ---------------------------------------------------------------------------
// Environment schema
// ---------------------------------------------------------------------------
// Single source of truth for every environment variable the app reads.
// Kept free of "server-only" so instrumentation.ts can import it to validate
// at startup; application code should import `env` from lib/env.ts instead.
//
// AI is optional by design: with AI_PROVIDER unset the API route serves
// labelled sample data. Once AI_PROVIDER is set, the rest of the AI_*
// variables it needs become required and a misconfiguration fails startup
// instead of failing per request.

// Treat `KEY=` (empty or whitespace) the same as the variable being unset.
const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalSecret = (pattern: RegExp, message: string) =>
  z.preprocess(emptyToUndefined, z.string().regex(pattern, message).optional());

// Plain http is only acceptable for servers on this machine (Ollama, LM Studio).
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "host.docker.internal"]);

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    // Production builds (a deployed copy) ignore every key below unless this
    // is "true", so a public site only ever runs the demo. `npm run dev`
    // always uses them.
    USE_SERVER_KEYS: z.preprocess(
      emptyToUndefined,
      z
        .enum(["true", "false"], "must be true or false")
        .default("false")
        .transform((value) => value === "true")
    ),

    AI_PROVIDER: z.preprocess(emptyToUndefined, z.enum(AI_PROVIDER_IDS).optional()),

    AI_API_KEY: optionalSecret(
      /^[A-Za-z0-9._~+/=:-]{16,512}$/,
      "must be 16-512 characters with no spaces or quotes (paste the key exactly as your provider shows it)"
    ),

    AI_MODEL: z.preprocess(
      emptyToUndefined,
      z
        .string()
        .max(200)
        .regex(
          /^[A-Za-z0-9._:/@-]+$/,
          "must be a model id such as claude-opus-5-5, gpt-oss-120b or llama3.1:8b"
        )
        .optional()
    ),

    AI_BASE_URL: z.preprocess(
      emptyToUndefined,
      z
        .url("must be a full URL such as https://api.example.com/v1")
        .refine((value) => {
          const url = new URL(value);
          return url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
        }, "must use https:// (plain http:// is only allowed for localhost)")
        .optional()
    ),

    APIFY_API_TOKEN: optionalSecret(
      /^apify_api_[A-Za-z0-9]{20,}$/,
      "must start with apify_api_ (copy it from console.apify.com > Settings > API & Integrations)"
    ),

    GOOGLE_MAPS_API_KEY: optionalSecret(
      /^AIza[0-9A-Za-z_-]{35}$/,
      "must be a Google Cloud API key starting with AIza (create one with the Places API (New) enabled)"
    ),
  })
  .superRefine((value, ctx) => {
    const require = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    if (!value.AI_PROVIDER) {
      if (value.AI_API_KEY || value.AI_MODEL || value.AI_BASE_URL) {
        require(
          "AI_PROVIDER",
          `is required when other AI_* variables are set (one of: ${AI_PROVIDER_IDS.join(", ")})`
        );
      }
      return;
    }

    const preset = AI_PROVIDERS[value.AI_PROVIDER];
    if (!value.AI_MODEL) {
      require("AI_MODEL", `is required when AI_PROVIDER=${value.AI_PROVIDER}`);
    }
    if (preset.requiresKey && !value.AI_API_KEY) {
      require("AI_API_KEY", `is required when AI_PROVIDER=${value.AI_PROVIDER}`);
    }
    if (preset.api === "openai-compatible" && !preset.baseUrl && !value.AI_BASE_URL) {
      require("AI_BASE_URL", `is required when AI_PROVIDER=${value.AI_PROVIDER}`);
    }
  });

export type Env = z.infer<typeof envSchema>;

// Validates the given environment and throws one error listing every
// problem. Only variable names and rule descriptions are reported — never
// the values, so secrets cannot end up in logs.
export function parseEnv(source: Record<string, string | undefined>): Readonly<Env> {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment configuration:\n${problems}\n` +
        `Fix the values in .env.local (see .env.example) and restart the server.`
    );
  }
  return Object.freeze(result.data);
}
