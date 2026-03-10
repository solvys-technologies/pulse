// [claude-code 2026-03-10] Econ-triggered twitter poller — links Notion Econ Calendar to twitter-cli searches

import { searchTweets, fetchUserTimeline, isTwitterCliInstalled } from './twitter-cli-service.js';
import { classifyFJHeadline, filterByTier } from './fj-emoji-filter.js';
import { fetchEconCalendar } from '../econ-calendar-service.js';
import type { FeedItem, NewsSource } from '../../types/riskflow.js';

const EVENT_WINDOW_MINUTES = 10; // Poll twitter around ±10 min of event time
const POLL_INTERVAL_MS = 60_000; // 60s scheduled polling

// Financial Juice and InsiderWire screen names to always fetch
const FJ_ACCOUNTS = ['financialjuice', 'InsiderWire'] as const;

// Max tweets per search / timeline call
const SEARCH_LIMIT = 20;
const TIMELINE_LIMIT = 30;

/**
 * Build twitter search queries from today's active econ events.
 * e.g., "CPI Actual Forecast" or "NFP payrolls" etc.
 */
function buildEventQueries(eventNames: string[]): string[] {
  const queries: string[] = [];
  for (const name of eventNames) {
    const upper = name.toUpperCase();
    if (upper.includes('CPI') || upper.includes('INFLATION')) {
      queries.push('CPI actual forecast inflation');
    } else if (upper.includes('NFP') || upper.includes('PAYROLL') || upper.includes('JOBS')) {
      queries.push('NFP payrolls jobs report actual');
    } else if (upper.includes('FOMC') || upper.includes('FED') || upper.includes('INTEREST RATE')) {
      queries.push('FOMC Fed rate decision actual');
    } else if (upper.includes('GDP')) {
      queries.push('GDP actual forecast growth');
    } else if (upper.includes('PPI')) {
      queries.push('PPI producer prices actual');
    } else if (upper.includes('RETAIL')) {
      queries.push('retail sales actual');
    } else if (upper.includes('PMI')) {
      queries.push('PMI actual manufacturing');
    } else if (upper.includes('JOBLESS') || upper.includes('CLAIMS')) {
      queries.push('jobless claims weekly actual');
    } else {
      // Generic search for the event name (first 30 chars to avoid overly long queries)
      queries.push(name.slice(0, 30));
    }
  }
  // Dedupe
  return [...new Set(queries)];
}

/**
 * Check if an econ event is within EVENT_WINDOW_MINUTES of now.
 */
function isEventActive(eventDate?: string, eventTime?: string): boolean {
  if (!eventDate) return false;
  try {
    const dateStr = eventTime ? `${eventDate}T${eventTime}` : eventDate;
    const eventMs = new Date(dateStr).getTime();
    const nowMs = Date.now();
    const diffMin = Math.abs(nowMs - eventMs) / 60_000;
    return diffMin <= EVENT_WINDOW_MINUTES;
  } catch {
    return false;
  }
}

/**
 * Convert a classified tweet to a RiskFlow FeedItem.
 */
function tweetToFeedItem(
  tweet: { id: string; text: string; author: string; publishedAt: string },
  macroLevel: 1 | 2 | 3 | 4,
  urgency: 'immediate' | 'high' | 'normal'
): FeedItem {
  const source: NewsSource =
    tweet.author.toLowerCase() === 'financialjuice' ? 'FinancialJuice' : 'TwitterCli';

  return {
    id: `twcli-${tweet.id}`,
    source,
    headline: tweet.text,
    symbols: extractSymbolsFromText(tweet.text),
    tags: extractTagsFromText(tweet.text),
    isBreaking: urgency === 'immediate',
    urgency,
    macroLevel,
    publishedAt: tweet.publishedAt,
  };
}

function extractSymbolsFromText(text: string): string[] {
  const cashtags = text.match(/\$[A-Z]{1,5}\b/g)?.map((s) => s.replace('$', '')) ?? [];
  const known = ['SPY', 'QQQ', 'ES', 'NQ', 'TLT', 'DXY', 'VIX', 'CL', 'GC', 'BTC'];
  const inferred = known.filter((t) => new RegExp(`\\b${t}\\b`).test(text.toUpperCase()));
  return [...new Set([...cashtags, ...inferred])];
}

function extractTagsFromText(text: string): string[] {
  const tags: string[] = [];
  const upper = text.toUpperCase();
  if (upper.includes('CPI') || upper.includes('INFLATION')) tags.push('CPI', 'INFLATION');
  if (upper.includes('NFP') || upper.includes('PAYROLL')) tags.push('NFP', 'JOBS');
  if (upper.includes('FOMC') || upper.includes('FED') || upper.includes('POWELL')) tags.push('FED', 'FOMC');
  if (upper.includes('GDP')) tags.push('GDP');
  if (upper.includes('PPI')) tags.push('PPI');
  if (upper.includes('PMI')) tags.push('PMI');
  if (upper.includes('RETAIL SALES')) tags.push('RETAIL');
  if (upper.includes('JOBLESS') || upper.includes('CLAIMS')) tags.push('JOBLESS');
  return tags;
}

/**
 * Main poll function: fetches FJ/InsiderWire timelines + event-triggered search results.
 * Only returns items that pass the FJ emoji filter (medium+).
 */
export async function pollTwitterForEconNews(): Promise<FeedItem[]> {
  const installed = await isTwitterCliInstalled();
  if (!installed) {
    console.debug('[EconTwitterPoller] twitter-cli not installed, skipping');
    return [];
  }

  const today = new Date().toISOString().slice(0, 10);

  // 1. Fetch today's econ events from Notion
  let activeEventNames: string[] = [];
  try {
    const events = await fetchEconCalendar({ from: today, to: today });
    // Filter to high-importance events within the time window
    const highImportance = events.filter((e) => (e.importance ?? 1) >= 2);
    const active = highImportance.filter((e) => isEventActive(e.date, e.time));
    activeEventNames = active.map((e) => e.name);
    if (active.length > 0) {
      console.log(`[EconTwitterPoller] ${active.length} active econ events: ${activeEventNames.join(', ')}`);
    }
  } catch (err) {
    console.warn('[EconTwitterPoller] Failed to fetch econ calendar:', err);
  }

  // 2. Build search queries from active events
  const searchQueries = buildEventQueries(activeEventNames);

  // 3. Collect all tweets: FJ/InsiderWire timelines + event-triggered searches
  const allTweetPromises: Promise<Array<{ id: string; text: string; author: string; publishedAt: string }>>[] = [];

  // Always fetch FJ and InsiderWire timelines
  for (const account of FJ_ACCOUNTS) {
    allTweetPromises.push(fetchUserTimeline(account, { limit: TIMELINE_LIMIT }));
  }

  // Event-triggered searches (only when events are active)
  for (const query of searchQueries) {
    allTweetPromises.push(searchTweets(query, { limit: SEARCH_LIMIT, filter: 'latest' }));
  }

  const tweetBatches = await Promise.allSettled(allTweetPromises);
  const allTweets = tweetBatches.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // 4. Dedupe by tweet id
  const seenIds = new Set<string>();
  const uniqueTweets = allTweets.filter((t) => {
    if (seenIds.has(t.id)) return false;
    seenIds.add(t.id);
    return true;
  });

  // 5. Apply FJ emoji tier filter (medium+)
  const classified = filterByTier(uniqueTweets, 'medium');

  // 6. Convert to FeedItem[]
  const feedItems: FeedItem[] = classified.map((t) =>
    tweetToFeedItem(t, t.fjClassification.macroLevel, t.fjClassification.urgency)
  );

  if (feedItems.length > 0) {
    console.log(`[EconTwitterPoller] ${feedItems.length} items passed FJ emoji filter (from ${uniqueTweets.length} raw tweets)`);
  }

  return feedItems;
}

// ── Warm cache — seeded on init with last 10 Critical/High posts ──────────────

let warmCache: FeedItem[] = [];

/**
 * On backend init: fetch FJ + InsiderWire timelines, filter to Critical/High only,
 * keep the top 10 most recent. These are immediately available to feed-service
 * before the first 60s polling cycle completes.
 */
async function initFetchHighPriorityPosts(): Promise<void> {
  const installed = await isTwitterCliInstalled();
  if (!installed) return;

  try {
    console.log('[EconTwitterPoller] Init fetch: pulling last 10 Critical/High posts from FJ + InsiderWire...');

    const batches = await Promise.allSettled(
      FJ_ACCOUNTS.map((account) => fetchUserTimeline(account, { limit: 50 }))
    );
    const allTweets = batches.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

    // Filter to critical/high only (tier >= 'high', i.e. macroLevel >= 3)
    const highPlus = filterByTier(allTweets, 'high');

    // Dedupe, take top 10 most recent
    const seenIds = new Set<string>();
    const top10 = highPlus
      .filter((t) => {
        if (seenIds.has(t.id)) return false;
        seenIds.add(t.id);
        return true;
      })
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 10);

    warmCache = top10.map((t) =>
      tweetToFeedItem(t, t.fjClassification.macroLevel, t.fjClassification.urgency)
    );

    console.log(`[EconTwitterPoller] Init warm cache: ${warmCache.length} Critical/High posts seeded`);
  } catch (err) {
    console.warn('[EconTwitterPoller] Init fetch failed:', err);
  }
}

/** Return the current warm-cached Critical/High posts (populated on startup) */
export function getWarmCacheItems(): FeedItem[] {
  return warmCache;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let pollerInterval: ReturnType<typeof setInterval> | null = null;

export function startEconTwitterPoller(): void {
  if (pollerInterval) return;
  console.log('[EconTwitterPoller] Starting (60s interval)');

  // Init: immediately fetch last 10 Critical/High posts and seed warm cache
  initFetchHighPriorityPosts().then(() => {
    // Then start regular polling
    pollTwitterForEconNews().catch((err) =>
      console.warn('[EconTwitterPoller] Initial poll error:', err)
    );
  }).catch((err) => console.warn('[EconTwitterPoller] Init fetch error:', err));

  pollerInterval = setInterval(() => {
    pollTwitterForEconNews().catch((err) =>
      console.warn('[EconTwitterPoller] Poll error:', err)
    );
  }, POLL_INTERVAL_MS);
}

export function stopEconTwitterPoller(): void {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
    console.log('[EconTwitterPoller] Stopped');
  }
}
