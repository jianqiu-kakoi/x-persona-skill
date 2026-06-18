#!/usr/bin/env node
// Assemble the final timeline report: merge per-year LLM extractions with the
// deterministic stats, attach canonical tags (if a tag-mapping exists), and
// build a tag-over-time matrix so a tag's rise/fall is trackable across years.
//
// Usage:
//   node assemble_report.mjs <statsFile> <outDir> [tagmapFile] > report.json
//
//   statsFile : output of period_stats.mjs
//   outDir    : dir of per-year LLM outputs (YYYY.json, matching timeline/schema.json)
//   tagmapFile: optional { taxonomy:[{tag,gloss}], mapping:{freeTag:canonicalTag} }
//               from the unify pass; if absent, free_tags are used as-is.

import { readFileSync, readdirSync } from "node:fs";

const [statsFile, outDir, tagmapFile] = process.argv.slice(2);
if (!statsFile || !outDir) { console.error("usage: node assemble_report.mjs <statsFile> <outDir> [tagmapFile]"); process.exit(1); }

const stats = JSON.parse(readFileSync(statsFile, "utf8"));
const tagmap = tagmapFile ? JSON.parse(readFileSync(tagmapFile, "utf8")) : { taxonomy: [], mapping: {} };
const map = tagmap.mapping || {};
const canon = t => map[t] || map[t.toLowerCase()] || t;
const uniq = a => [...new Set(a)];

// load per-year LLM outputs
const periods = {};
for (const f of readdirSync(outDir).filter(f => /^\d{4}\.json$/.test(f))) {
  const p = JSON.parse(readFileSync(`${outDir}/${f}`, "utf8"));
  periods[p.period] = p;
}

const statsByYear = Object.fromEntries(stats.years.map(y => [y.period, y]));

// merge: every stats year gets its LLM layer (if present)
const years = stats.years.map(s => {
  const llm = periods[s.period] || null;
  const tags = llm ? uniq((llm.free_tags || []).map(canon)) : [];
  return {
    period: s.period,
    era_label: llm?.era_label || "",
    stats: {
      tweets: s.tweets, originals: s.originals, replies: s.replies,
      avg_chars: s.avg_chars, avg_sentence_len_words: s.avg_sentence_len_words,
      emoji_tweet_pct: s.emoji_tweet_pct, hashtag_tweet_pct: s.hashtag_tweet_pct,
      link_tweet_pct: s.link_tweet_pct, question_pct: s.question_pct,
      exclaim_pct: s.exclaim_pct, vocab_richness_ttr: s.vocab_richness_ttr,
      top_hashtags: s.top_hashtags, top_mentions: s.top_mentions, lang_mix: s.lang_mix,
    },
    content_themes: llm?.content_themes || [],
    tags,
    free_tags: llm?.free_tags || [],
    voice_reading: llm?.voice_reading || "",
    entities: llm?.entities || [],
    notable_tweets: llm?.notable_tweets || [],
    monthly: (llm?.monthly || []).map(m => ({
      ...m, tags: uniq((m.free_tags || []).map(canon)),
      // attach the month's computed stats if available
      stats: (statsByYear[s.period]?.months || []).find(x => x.period === m.month) || null,
    })),
    analyzed: !!llm,
  };
});

// tag-over-time matrix: canonical tag -> { year: present }
const tagTimeline = {};
for (const y of years) {
  for (const t of y.tags) {
    (tagTimeline[t] = tagTimeline[t] || {})[y.period] = true;
  }
}

process.stdout.write(JSON.stringify({
  type: "x-persona-timeline",
  handle: stats.handle || null,
  span: stats.span,
  total: stats.total,
  taxonomy: tagmap.taxonomy || [],
  tag_timeline: tagTimeline,
  years,
}, null, 2) + "\n");
console.error(`assembled report: ${years.length} years, ${years.filter(y => y.analyzed).length} analyzed, ${Object.keys(tagTimeline).length} tags`);
