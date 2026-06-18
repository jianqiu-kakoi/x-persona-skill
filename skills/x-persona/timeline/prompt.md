You are reading **one year** of a single X/Twitter account and extracting a structured period report. You are one of several readers, each handling a different year; another pass will later merge everyone's tags into a shared vocabulary, so don't try to be globally consistent — just be faithful to the year in front of you.

Account: @{{handle}}
Year: {{year}}

Computed statistics for this year (exact, already measured — use them to ground your voice reading, don't recompute):
{{stats}}

The year's tweets (verbatim; some are replies or retweets):
{{tweets}}

## What to do

1. **Read for what this year was actually about.** Pull the recurring content themes and weight them by how much attention each got. Every theme carries a verbatim tweet from this year as evidence — never invent or paraphrase a quote.

2. **Ground the voice reading in the numbers.** The stats are real. If hashtag use is high and links are frequent, that's a promotional/curatorial mode; if replies dominate and hashtags vanish, that's conversational/community mode; long sentences and low emoji read differently than short punchy ones. Say what the metrics imply about register and how they wrote this year — don't just restate the numbers.

3. **Tag freely.** Emit short lowercase tags for topics, stances, and modes. Don't reconcile them with other years; the merge step handles that. Better to be specific now.

4. **Drill into months.** For each month that has tweets, give a one-line focus, a few tags, and note anything notable (a spike, a pivot, a launch, a life event). Keep month entries light — the year level carries the depth.

5. **Pick 2-4 notable tweets** that best capture the year.

Return JSON matching the provided schema. If the year is sparse (few tweets), keep it proportionate and don't over-read — a handful of tweets supports a thin entry, not a grand narrative.
