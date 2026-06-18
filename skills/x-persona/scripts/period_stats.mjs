#!/usr/bin/env node
// Deterministic per-period (year + month) statistics for a tweet corpus.
// No LLM — these are exact, computed features. The LLM layer (period analysis)
// reads these alongside the tweets to add content themes, tags, and reading.
//
// Usage:
//   node period_stats.mjs corpus.json > stats.json
//
// Input:  array of { id, text, created_at(ISO), is_retweet, is_reply, lang }
// Output: { handle?, total, span, years:[ {period, ...metrics, months:[ {period, ...metrics} ]} ] }

import { readFileSync } from "node:fs";

const path = process.argv[2];
if (!path) { console.error("usage: node period_stats.mjs corpus.json > stats.json"); process.exit(1); }
const tweets = JSON.parse(readFileSync(path, "utf8")).filter(t => t && t.text != null && t.created_at);

const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_G = /\p{Extended_Pictographic}/gu;
const URL = /https?:\/\/\S+/g;
const HASHTAG = /#[\p{L}\p{N}_]+/gu;
const MENTION = /@[A-Za-z0-9_]+/g;

const round = (n, d = 2) => { const f = 10 ** d; return Math.round(n * f) / f; };
const pct = (n, total) => total ? round(100 * n / total, 1) : 0;

function topN(counter, n = 6) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, n: v }));
}

function metrics(list) {
  const n = list.length;
  const originals = list.filter(t => !t.is_reply && !t.is_retweet);
  let chars = 0, words = 0, sentences = 0, withEmoji = 0, emojiCount = 0,
      withHash = 0, hashCount = 0, withUrl = 0, withMention = 0, withQ = 0, withExcl = 0, capsWords = 0, wordTokens = 0;
  const vocab = new Set(), hashtags = new Map(), mentions = new Map(), langs = new Map();

  for (const t of list) {
    const text = String(t.text);
    chars += [...text].length;
    const ws = text.split(/\s+/).filter(Boolean);
    words += ws.length;
    sentences += (text.match(/[.!?]+(\s|$)/g) || []).length || 1;
    if (EMOJI.test(text)) withEmoji++;
    emojiCount += (text.match(EMOJI_G) || []).length;
    const hs = text.match(HASHTAG) || []; if (hs.length) withHash++; hashCount += hs.length;
    hs.forEach(h => hashtags.set(h.toLowerCase(), (hashtags.get(h.toLowerCase()) || 0) + 1));
    if (URL.test(text)) withUrl++; URL.lastIndex = 0;
    const ms = text.match(MENTION) || []; if (ms.length) withMention++;
    ms.forEach(m => mentions.set(m.toLowerCase(), (mentions.get(m.toLowerCase()) || 0) + 1));
    if (text.includes("?") || text.includes("？")) withQ++;
    if (text.includes("!") || text.includes("！")) withExcl++;
    for (const w of ws) {
      const clean = w.replace(/[^\p{L}\p{N}']/gu, "");
      if (clean.length >= 2) { wordTokens++; vocab.add(clean.toLowerCase());
        if (clean.length >= 3 && clean === clean.toUpperCase() && /\p{Lu}/u.test(clean)) capsWords++; }
    }
    if (t.lang) langs.set(t.lang, (langs.get(t.lang) || 0) + 1);
  }
  return {
    tweets: n,
    originals: originals.length,
    replies: list.filter(t => t.is_reply).length,
    retweets: list.filter(t => t.is_retweet).length,
    avg_chars: round(chars / n),
    avg_words: round(words / n),
    avg_sentence_len_words: round(words / Math.max(sentences, 1)),
    emoji_tweet_pct: pct(withEmoji, n),
    emoji_per_tweet: round(emojiCount / n),
    hashtag_tweet_pct: pct(withHash, n),
    link_tweet_pct: pct(withUrl, n),
    mention_tweet_pct: pct(withMention, n),
    question_pct: pct(withQ, n),
    exclaim_pct: pct(withExcl, n),
    allcaps_word_pct: pct(capsWords, wordTokens),
    vocab_richness_ttr: round(vocab.size / Math.max(wordTokens, 1), 3),
    top_hashtags: topN(hashtags),
    top_mentions: topN(mentions),
    lang_mix: topN(langs, 4),
  };
}

// bucket
const byYear = new Map();
for (const t of tweets) {
  const d = new Date(t.created_at);
  if (isNaN(d)) continue;
  const y = String(d.getUTCFullYear());
  const m = `${y}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  if (!byYear.has(y)) byYear.set(y, { months: new Map(), list: [] });
  byYear.get(y).list.push(t);
  if (!byYear.get(y).months.has(m)) byYear.get(y).months.set(m, []);
  byYear.get(y).months.get(m).push(t);
}

const dates = tweets.map(t => t.created_at).filter(Boolean).sort();
const years = [...byYear.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([y, { months, list }]) => ({
  period: y,
  ...metrics(list),
  months: [...months.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([m, ml]) => ({ period: m, ...metrics(ml) })),
}));

process.stdout.write(JSON.stringify({
  total: tweets.length,
  span: { start: dates[0], end: dates[dates.length - 1] },
  years,
}, null, 2) + "\n");
console.error(`computed stats for ${tweets.length} tweets across ${years.length} years`);
