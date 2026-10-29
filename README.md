# Fieldnotes 🍜 — turn your saved food reels and TikToks into an actual list

> **Too lazy to rewatch every video? Got hundreds of food reels and TikToks
> saved in your collection that you'll "definitely check out one day"? A foodie
> like me?**
>
> Same. So I built this.

Every time I scrolled Instagram or TikTok I'd save another *"top 5 hidden
ramen spots"* or *"you HAVE to try this café"* video. Months later I had a
huge collection and no idea what was in it. When I actually wanted somewhere
to eat, I'd have to sit and rewatch video after video just to find a name and
an address.

**Fieldnotes does the watching for you.** Paste in a batch of Instagram Reel
or TikTok links and an AI model reads each one's caption and pulls out every
place it mentions: the name, where it is, what to order, roughly how pricey it
is, and any tips. Everything lands in one searchable table you can filter and
export to Excel.

```
 your saved videos         Fieldnotes                     your list
 ┌──────────────┐      ┌────────────────┐      ┌──────────────────────────────┐
 │ IG reel      │      │ 1. fetch the   │      │ Ichiran Ramen · Tokyo · $$   │
 │ TikTok video │ ───▶ │    captions    │ ───▶ │ Café Kitsuné · Paris · $$    │
 │ IG reel      │      │ 2. AI picks out│      │ Hawker 101 · Singapore · $   │
 │ ...          │      │    the places  │      │ ...search · filter · export  │
 └──────────────┘      └────────────────┘      └──────────────────────────────┘
```

## What you get

- 📱 **Instagram Reels and TikTok:** mix both in the same batch
- 📋 **Bulk paste:** drop in up to 50 links at once
- 🍽️ **Every spot pulled out:** one reel that mentions five places gives you five rows
- 🔎 **Search and filter** by name, location or category (Food & Drink, Adventure, Culture, Shopping, Sightseeing)
- 📊 **Export to Excel** for trip planning, or to share with the group chat
- 🤖 **Use any AI model you like:** Claude, GPT, Gemini, Llama, Mistral, DeepSeek, or a free local model with Ollama

## Try it in 1 minute (no keys needed)

```bash
npm install
npm run dev
```

Open http://localhost:3000 and paste any Reel or TikTok link. With no keys set, the app
runs in **demo mode** and shows clearly labelled sample results, so you can
try searching, filtering and exporting right away.

## Use it on your real videos

You need two things: something to **read the videos** (Apify) and an **AI model**
to summarise them.

```bash
cp .env.example .env.local    # .env.local is git-ignored, so your keys stay on your machine
```

Then fill in `.env.local`:

```bash
# Pick any AI provider. The full list with example models and key links is in .env.example
AI_PROVIDER=anthropic
AI_MODEL=claude-opus-5-5
AI_API_KEY=<your key>

# Fetches the Instagram and TikTok captions
APIFY_API_TOKEN=<your apify token>
```

Restart `npm run dev` and you're set. If something's wrong in the file, the
server won't start and tells you exactly which variable to fix.

### Which AI models work?

Pretty much all of them. Set `AI_PROVIDER` to one of:

| Provider | `AI_PROVIDER` | Notes |
|---|---|---|
| Anthropic Claude | `anthropic` | Uses the official SDK; output is checked against the schema |
| OpenAI | `openai` | |
| Google Gemini | `gemini` | |
| SambaNova | `sambanova` | |
| Groq | `groq` | Very fast |
| OpenRouter | `openrouter` | Hundreds of models through one key |
| Mistral | `mistral` | |
| DeepSeek | `deepseek` | |
| Ollama | `ollama` | Free, runs on your own machine, no key needed |
| Anything else | `custom` | Any OpenAI-compatible API. Set `AI_BASE_URL` too |

Want to add another provider? It's one entry in `lib/aiProviders.ts`.

## How it works

1. **Ingestion** (`fetchReelTranscripts` in `app/api/parse-reels/route.ts`):
   each link is recognised as Instagram or TikTok and sent, in groups of
   five, to the matching Apify scraper (`apify~instagram-scraper` or
   `clockworks~tiktok-scraper`, captions only with every paid add-on off).
   Each caption is matched back to the link you submitted. Without an Apify
   token, placeholder text is used instead.

   Accepted links: `instagram.com/reel/…`, `/reels/…`, `/p/…`, and
   `tiktok.com/@user/video/…`, `/@user/photo/…`, `tiktok.com/t/…`,
   `vm.tiktok.com/…`, `vt.tiktok.com/…`. To add another platform, add an
   entry to `PLATFORMS` in the route.
2. **Summarising** (`extractWithLLM`): each caption is sent to your chosen
   model through `lib/llm.ts`, which asks for a JSON list of places. Long
   captions are split into chunks, and a chunk is halved and retried if a
   model says it's too long.
3. **Clean-up** (`normalizeRecommendation`): whatever the model returns is
   checked and reshaped into the fixed format below, so a model that goes
   off-script can't break the table.

Every recommendation ends up in this shape:

```ts
{
  reel_url: string;
  place_name: string;
  category: "Food & Drink" | "Adventure" | "Culture" | "Shopping" | "Sightseeing";
  location: string;
  recommended_activities: string;
  price_range: "$" | "$$" | "$$$" | "$$$$" | "N/A";
  rating_or_notes: string;
}
```

## Project structure

```
app/
  page.tsx                  — dashboard: input panel + results workspace
  layout.tsx                — fonts, metadata
  api/parse-reels/route.ts  — ingestion + AI extraction + validation
components/
  RecommendationsTable.tsx  — search, category filters, export
lib/
  aiProviders.ts            — list of supported AI providers and their settings
  llm.ts                    — one "give me JSON" call that works with any provider
  env.ts / envSchema.ts     — loads and checks .env values at startup
  excelExport.ts            — builds the .xlsx export in the browser (SheetJS)
  types.ts                  — shared Recommendation type
instrumentation.ts          — runs the env check when the server boots
```

## Keeping your keys safe

- Your keys live only in `.env.local`, which git ignores. Server code reads
  them through `lib/env.ts`, which is marked server-only, so they can't end up
  in the browser.
- Install [gitleaks](https://github.com/gitleaks/gitleaks) (`brew install gitleaks`)
  before your first commit. A pre-commit hook then blocks any commit that
  contains a key.
- `npm run scan:secrets` scans the whole git history for leaked keys.
- GitHub Actions runs the same secret scan plus `npm audit` on every push and pull request.
- Leaked a key anyway? Revoke it at your provider first, then remove it from
  git history with [git-filter-repo](https://github.com/newren/git-filter-repo).
- Found a security issue? See [SECURITY.md](SECURITY.md).

## Good to know

- One reel can give you zero, one or several places. Reels with no
  identifiable place are listed as "failed" with the reason.
- The Excel export runs entirely in your browser and includes whatever is
  currently filtered in the table.
- The free SheetJS build exports a plain header row; coloured headers need
  SheetJS Pro.
- `reel_url` in the data and the Excel "Source Link" column holds the original
  link for both Instagram and TikTok.
- Respect Instagram's and TikTok's terms and creators' work. This is for
  organising videos you've saved for yourself.

## License

[MIT](LICENSE). Use it, fork it, and go eat somewhere good.
