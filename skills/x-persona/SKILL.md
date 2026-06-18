---
name: x-persona
description: Understand a Twitter/X account the way you'd study a person — how they think (mental models, beliefs, reasoning, blind spots), how they speak (voice and style), what topics they engage with, and how all of it has evolved over time. Use when asked to deeply profile, understand, or track the evolution of an X/Twitter account — a founder, a competitor, a thinker, or yourself. This is a depth tool that reads the full timeline, not a quick personality quiz. NOT for shallow "what's my personality" toys.
---

# Twitter Persona Analysis

Build a deep, evidence-grounded profile of one X/Twitter account: how they think, how they speak, what they care about, and how that has changed over the years.

This is a **reader-side depth tool** — it exists to help you genuinely understand a person, not to score a personality test or to generate tweets in their voice. The two things it does that shallow tools don't: it captures the *mind* (mental models and reasoning, not just trait adjectives), and it captures the *trajectory* (how the account evolved over time).

## When to use it

- "Help me deeply understand @founder before I pitch them."
- "How has @someone's thinking changed over the last few years?"
- "Profile this account — their voice, their topics, how they reason."
- Studying a competitor's public posture, a thinker you follow, or your own account.

Not for: a quick "rate my vibe" readout, or writing content as someone (different goal).

## How it works

### 1. Get the tweet corpus

Use the bundled official X API adapter (bring your own X API credentials in `.env` — see `.env.example`):

```bash
node --env-file=.env scripts/fetch_xapi.mjs <handle> > corpus.json
```

It calls the sanctioned X API v2 (most recent ~3,200 tweets) and writes a JSON array shaped like [`corpus.schema.json`](corpus.schema.json). `created_at` must be ISO 8601 — the year/month analysis sorts on it.

For full history beyond the ~3,200 cap, or a different source, supply your own corpus matching the schema (e.g. your **X data export**: Settings → *Download an archive of your data*). The analysis skill itself never fetches — acquisition is a separate, swappable step, so the compliance choice is yours.

### 2. Analyze

Read `prompt.md` for the full analyst methodology and `output.schema.json` for the exact output structure. The method in brief:

- **Separate signal types.** Original tweets reveal voice and beliefs; replies and retweets reveal who they amplify and argue with. Don't read voice off retweets.
- **Patterns, not anecdotes.** A recurring move across many tweets is a trait; a single tweet is noise.
- **Quote, don't paraphrase.** Every claim about thinking, voice, or topics must carry a verbatim tweet as evidence. No real quote → no finding.
- **Read time as a dimension.** Sort by `created_at`, compare the earliest era to the most recent, and capture the delta as the `dynamics` section — the part generic tools miss. Only populate it when timestamps actually span time.
- **Calibrate confidence to the evidence.** Hundreds of timestamped original tweets supports a strong read; a handful of retweets does not.

The output is a single JSON object validating against `output.schema.json`: `how_they_think`, `how_they_speak` (including a reusable `imitation_prompt`), `topics`, and the longitudinal `dynamics`, plus a `sample` block that keeps the analysis honest about what it's based on.

## Responsible use

This skill profiles real people from their public posts. Use it where you have a legitimate reason — understanding a public figure, a counterpart you're engaging with, a competitor's public stance, or yourself — and respect the platform's terms and applicable privacy law. Don't use it to harass, dox, surveil private individuals, or build profiles of people without a legitimate basis. Treat any corpus or profile you generate as sensitive: keep it private by default.

## Roadmap

- **Media (video/voice/images):** the fetch step currently keeps text only; a video tweet contributes its caption, not the spoken content. The API returns downloadable media URLs (`extendedEntities.media`), so an opt-in enrichment pass could transcribe video/voice (e.g. with Whisper) and inject transcripts into the corpus. Text-first by design; media is a later enhancement.
