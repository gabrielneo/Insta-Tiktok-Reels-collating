// ---------------------------------------------------------------------------
// User-facing error messages
// ---------------------------------------------------------------------------
// Internal errors carry a short code such as "AI_ERROR: 401 <provider body>".
// This turns that into a sentence saying what went wrong and what to do,
// with the code kept at the end so it can be looked up in the README's
// Troubleshooting section. Provider response bodies are never included.

type Describer = (status: number | undefined) => string;

const RESTART = "then restart the server";

const MESSAGES: Record<string, Describer> = {
  AI_ERROR: (status) => {
    if (status === 401 || status === 403)
      return `Your AI API key was rejected. Check that AI_API_KEY in .env.local is filled in, copied correctly and still active for AI_PROVIDER, ${RESTART}.`;
    if (status === 404)
      return "The AI model wasn't found. Check that AI_MODEL matches your provider's model name exactly (and AI_BASE_URL, if you set one).";
    if (status === 402 || status === 429)
      return "The AI provider is rate-limiting you or your account is out of credit. Wait a minute and try again, or check your plan and billing.";
    if (status === 400 || status === 422)
      return "The AI provider rejected the request. Check that AI_MODEL is a chat model your provider offers for AI_PROVIDER.";
    if (status !== undefined && status >= 500)
      return "The AI provider is having problems right now. Try again in a few minutes.";
    return "The AI provider returned an error. Try again, or check your AI_* settings in .env.local.";
  },
  AI_CONNECTION_ERROR: () =>
    "Couldn't reach the AI provider. Check your internet connection, AI_BASE_URL if you set one, and that local servers such as Ollama are running.",
  AI_REFUSED: () => "The AI model declined to process this video's caption.",
  AI_TRUNCATED: () =>
    "The AI model's answer was cut off. Try again, or pick a model with a larger output limit.",
  AI_EMPTY_RESPONSE: () =>
    "The AI model returned an empty answer. Try again, or try a different AI_MODEL.",
  AI_INVALID_JSON: () =>
    "The AI model's answer couldn't be read. Try again, or try a different AI_MODEL.",
  AI_NOT_CONFIGURED: () =>
    `No AI model is set up. Set AI_PROVIDER, AI_MODEL and AI_API_KEY in .env.local, ${RESTART}.`,

  APIFY_ERROR: (status) => {
    if (status === 401 || status === 403)
      return `Your Apify token was rejected. Check that APIFY_API_TOKEN in .env.local is copied correctly and still active, ${RESTART}.`;
    if (status === 402)
      return "Your Apify account is out of credit, or this scraper needs a paid plan. Check billing at console.apify.com.";
    if (status === 408)
      return "Scraping took too long. Try again with fewer links at once.";
    if (status === 429)
      return "Apify is rate-limiting you. Wait a minute and try again.";
    if (status !== undefined && status >= 500)
      return "Apify is having problems right now. Try again in a few minutes.";
    return "Apify couldn't scrape these links. Try again later.";
  },
  APIFY_CONNECTION_ERROR: () =>
    "Couldn't reach Apify to fetch the captions. Check your internet connection and try again.",
  APIFY_EMPTY_RESPONSE: () =>
    "No caption could be fetched. The video may be private, deleted, region-locked, or have no caption.",

  GOOGLE_PLACES_ERROR: (status) => {
    if (status === 400 || status === 401 || status === 403)
      return `Google rejected your Maps key. Check GOOGLE_MAPS_API_KEY, and that Places API (New) and billing are enabled for its project, ${RESTART}.`;
    if (status === 429)
      return "Google Maps lookup quota is used up. Wait a bit, or raise the quota in Google Cloud Console.";
    if (status !== undefined && status >= 500)
      return "Google Maps is having problems right now. Try again in a few minutes.";
    return "Google Maps couldn't look up this place. Try again later.";
  },
  GOOGLE_PLACES_CONNECTION_ERROR: () =>
    "Couldn't reach Google Maps. Check your internet connection and try again.",
};

/** Returns a user-facing message for an internal error code, or null if unknown. */
export function describeError(message: string): string | null {
  const match = message.match(/^([A-Z_]+)(?:: (\d{3}))?/);
  if (!match) return null;
  const [, code, statusText] = match;
  const describe = MESSAGES[code];
  if (!describe) return null;
  const status = statusText ? Number(statusText) : undefined;
  return `${describe(status)} (${code}${status ? ` ${status}` : ""})`;
}
