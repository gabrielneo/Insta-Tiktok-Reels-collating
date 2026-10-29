// ---------------------------------------------------------------------------
// AI provider presets
// ---------------------------------------------------------------------------
// Pick one with AI_PROVIDER. Almost every provider speaks the OpenAI-style
// /chat/completions API, so they share one adapter and differ only in the
// settings below. Anthropic uses its own SDK (lib/llm.ts).
//
// Any OpenAI-compatible service not listed (Together, Fireworks, xAI, LM
// Studio, vLLM, a corporate gateway, ...) works through "custom" + AI_BASE_URL.

interface OpenAICompatiblePreset {
  api: "openai-compatible";
  label: string;
  /** Default endpoint; AI_BASE_URL overrides it. Empty means AI_BASE_URL is required. */
  baseUrl: string;
  /** Provider accepts response_format: { type: "json_object" }. */
  jsonMode: boolean;
  /** OpenAI's reasoning models reject max_tokens in favour of max_completion_tokens. */
  tokenParam: "max_tokens" | "max_completion_tokens";
  /** OpenAI's reasoning models only accept the default temperature. */
  sendTemperature: boolean;
  requiresKey: boolean;
}

interface AnthropicPreset {
  api: "anthropic";
  label: string;
  requiresKey: true;
}

export type AiProviderPreset = OpenAICompatiblePreset | AnthropicPreset;

export const AI_PROVIDERS = {
  anthropic: { api: "anthropic", label: "Anthropic (Claude)", requiresKey: true },
  openai: {
    api: "openai-compatible",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    jsonMode: true,
    tokenParam: "max_completion_tokens",
    sendTemperature: false,
    requiresKey: true,
  },
  gemini: {
    api: "openai-compatible",
    label: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    jsonMode: false,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: true,
  },
  sambanova: {
    api: "openai-compatible",
    label: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    jsonMode: true,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: true,
  },
  groq: {
    api: "openai-compatible",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    jsonMode: true,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: true,
  },
  openrouter: {
    api: "openai-compatible",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    // JSON mode support varies by routed model, so rely on the prompt instead.
    jsonMode: false,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: true,
  },
  mistral: {
    api: "openai-compatible",
    label: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    jsonMode: true,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: true,
  },
  deepseek: {
    api: "openai-compatible",
    label: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    jsonMode: true,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: true,
  },
  ollama: {
    api: "openai-compatible",
    label: "Ollama (local)",
    baseUrl: "http://localhost:11434/v1",
    jsonMode: true,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: false,
  },
  custom: {
    api: "openai-compatible",
    label: "Custom OpenAI-compatible endpoint",
    baseUrl: "",
    jsonMode: false,
    tokenParam: "max_tokens",
    sendTemperature: true,
    requiresKey: false,
  },
} as const satisfies Record<string, AiProviderPreset>;

export type AiProviderId = keyof typeof AI_PROVIDERS;

export const AI_PROVIDER_IDS = Object.keys(AI_PROVIDERS) as [AiProviderId, ...AiProviderId[]];
