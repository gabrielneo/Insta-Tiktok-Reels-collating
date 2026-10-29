import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { AI_PROVIDERS } from "./aiProviders";
import { env } from "./env";

// ---------------------------------------------------------------------------
// Provider-agnostic "give me JSON" call
// ---------------------------------------------------------------------------
// Callers describe what they want (system prompt, user text, Zod schema) and
// get back the parsed JSON object. Which model answers is decided entirely by
// AI_PROVIDER / AI_MODEL in the environment.
//
// Errors are thrown with a stable code prefix the API route relies on:
//   AI_ERROR: <status> <detail>   provider returned an HTTP error
//   AI_CONNECTION_ERROR           provider could not be reached
//   AI_REFUSED                    model declined the request
//   AI_TRUNCATED                  output hit the token limit
//   AI_EMPTY_RESPONSE / AI_INVALID_JSON

const MAX_OUTPUT_TOKENS = 16000;

export interface JsonRequest<T extends z.ZodType> {
  system: string;
  user: string;
  /** Shape of the expected object. Anthropic enforces it; other providers get it via the prompt. */
  schema: T;
}

export function isAiConfigured(): boolean {
  return Boolean(env.AI_PROVIDER);
}

export async function generateJson<T extends z.ZodType>(request: JsonRequest<T>): Promise<unknown> {
  if (!env.AI_PROVIDER) throw new Error("AI_NOT_CONFIGURED");
  const preset = AI_PROVIDERS[env.AI_PROVIDER];
  return preset.api === "anthropic"
    ? generateWithAnthropic(request)
    : generateWithOpenAICompatible(preset, request);
}

// ---------------------------------------------------------------------------
// Anthropic (Claude) — official SDK with structured outputs
// ---------------------------------------------------------------------------
let anthropicClient: Anthropic | undefined;

function getAnthropicClient(): Anthropic {
  anthropicClient ??= new Anthropic({ apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL });
  return anthropicClient;
}

async function generateWithAnthropic<T extends z.ZodType>(request: JsonRequest<T>): Promise<unknown> {
  try {
    const response = await getAnthropicClient().beta.messages.parse({
      model: env.AI_MODEL!,
      max_tokens: MAX_OUTPUT_TOKENS,
      // If the model declines for policy reasons, let the API retry on its
      // recommended fallback model. Models without fallbacks just run alone.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: request.system,
      messages: [{ role: "user", content: request.user }],
      output_config: { format: betaZodOutputFormat(request.schema) },
    });

    if (response.stop_reason === "refusal") throw new Error("AI_REFUSED");
    if (response.stop_reason === "max_tokens") throw new Error("AI_TRUNCATED");
    if (response.parsed_output == null) throw new Error("AI_INVALID_JSON");
    return response.parsed_output;
  } catch (error) {
    if (error instanceof Anthropic.APIConnectionError) {
      throw new Error("AI_CONNECTION_ERROR");
    }
    if (error instanceof Anthropic.APIError) {
      throw new Error(`AI_ERROR: ${error.status} ${error.message.slice(0, 200)}`);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Everyone else — OpenAI-style /chat/completions
// ---------------------------------------------------------------------------
type OpenAICompatiblePreset = Extract<
  (typeof AI_PROVIDERS)[keyof typeof AI_PROVIDERS],
  { api: "openai-compatible" }
>;

async function generateWithOpenAICompatible<T extends z.ZodType>(
  preset: OpenAICompatiblePreset,
  request: JsonRequest<T>
): Promise<unknown> {
  const baseUrl = (env.AI_BASE_URL ?? preset.baseUrl).replace(/\/+$/, "");

  const body: Record<string, unknown> = {
    model: env.AI_MODEL,
    [preset.tokenParam]: MAX_OUTPUT_TOKENS,
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
  };
  if (preset.sendTemperature) body.temperature = 0.2;
  if (preset.jsonMode) body.response_format = { type: "json_object" };

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.AI_API_KEY ? { Authorization: `Bearer ${env.AI_API_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("AI_CONNECTION_ERROR");
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`AI_ERROR: ${response.status} ${detail.slice(0, 200)}`);
  }

  const data = await response.json();
  const choice = data?.choices?.[0];
  const raw = choice?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw new Error(choice?.finish_reason === "length" ? "AI_TRUNCATED" : "AI_EMPTY_RESPONSE");
  }
  return parseJsonLoosely(raw);
}

// Models without a JSON mode sometimes wrap the object in ```json fences or
// add a sentence around it, so fall back to the outermost {...} span.
function parseJsonLoosely(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        // fall through
      }
    }
    throw new Error("AI_INVALID_JSON");
  }
}
