#!/usr/bin/env node
// Official X API v2 adapter — fetch a user's recent tweets into the corpus
// shape x-persona analyzes (see corpus.schema.json).
//
// Compliant path: uses the sanctioned X API. NOTE the official user-timeline
// endpoint only returns up to ~3,200 of the most recent tweets — full multi-year
// history is NOT available here (that's the trade-off vs. third-party providers).
// Good for recent-window analysis and for validating your credentials.
//
// Auth: app-only Bearer. Provide EITHER:
//   X_BEARER_TOKEN=...                      (paste the Bearer Token from the portal)
//   OR  X_API_KEY=... X_API_SECRET=...      (Consumer Key + Secret; exchanged for a Bearer)
//
// Usage:
//   node fetch_xapi.mjs <handle> [maxTweets] > corpus.json
//
// Loads .env automatically when run with:  node --env-file=.env scripts/fetch_xapi.mjs ...

const API = "https://api.twitter.com";
const handle = (process.argv[2] || "").replace(/^@/, "");
const maxTweets = Number(process.argv[3] || 3200);

if (!handle) { console.error("usage: node --env-file=.env fetch_xapi.mjs <handle> [maxTweets]"); process.exit(1); }

async function getBearer() {
  if (process.env.X_BEARER_TOKEN) return process.env.X_BEARER_TOKEN;
  const key = process.env.X_API_KEY, secret = process.env.X_API_SECRET;
  if (!key || !secret) {
    console.error("set X_BEARER_TOKEN, or both X_API_KEY and X_API_SECRET");
    process.exit(1);
  }
  const basic = Buffer.from(`${encodeURIComponent(key)}:${encodeURIComponent(secret)}`).toString("base64");
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`token exchange ${res.status}: ${await res.text()}`);
  return (await res.json()).access_token;
}

async function main() {
  const bearer = await getBearer();
  const auth = { headers: { Authorization: `Bearer ${bearer}` } };

  const u = await fetch(`${API}/2/users/by/username/${encodeURIComponent(handle)}`, auth);
  if (!u.ok) throw new Error(`resolve @${handle}: ${u.status} ${await u.text()}`);
  const userId = (await u.json())?.data?.id;
  if (!userId) throw new Error(`could not resolve @${handle}`);

  const tweets = [];
  let token = null;
  while (tweets.length < maxTweets) {
    const params = new URLSearchParams({ max_results: "100", "tweet.fields": "created_at,lang,referenced_tweets" });
    if (token) params.set("pagination_token", token);
    const r = await fetch(`${API}/2/users/${userId}/tweets?${params}`, auth);
    if (!r.ok) throw new Error(`timeline: ${r.status} ${await r.text()}`);
    const page = await r.json();
    for (const t of page.data ?? []) {
      const refs = t.referenced_tweets ?? [];
      tweets.push({
        id: t.id, text: t.text, created_at: t.created_at,
        is_retweet: refs.some(x => x.type === "retweeted"),
        is_reply: refs.some(x => x.type === "replied_to"),
        lang: t.lang ?? null,
      });
    }
    token = page.meta?.next_token;
    if (!token) break;
  }

  process.stdout.write(JSON.stringify(tweets.slice(0, maxTweets), null, 2) + "\n");
  console.error(`fetched ${Math.min(tweets.length, maxTweets)} tweets for @${handle} (official API caps ~3,200 most recent)`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
