/**
 * RiskFlow RSS Feed Poller — MarketWatch Real-Time Headlines
 * Fetches, parses, classifies, and deduplicates market news alerts.
 */
import { decodeHtmlEntities } from './html-entities';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertSource =
  | 'marketwatch'
  | 'notion-trade-idea'
  | 'financial-juice'
  | 'insider-wire'
  | 'economic-calendar'
  | 'polymarket'
  | 'twitter-cli'
  | 'backend';

export interface TradeIdeaDetail {
  title: string;
  ticker: string;
  direction: 'long' | 'short' | 'neutral';
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  potentialRisk?: number;
  potentialProfit?: number;
  riskRewardRatio?: number;
  confidence?: string;
  timeframe?: string;
  sourceAgent?: string;
  openclawDescription?: string;
  notionUrl: string;
}

export interface RiskFlowAlert {
  id: string;
  headline: string;
  summary: string;
  url?: string;
  publishedAt: string;
  source: AlertSource;
  severity: AlertSeverity;
  tags: string[];
  symbols?: string[];
  isBreaking?: boolean;
  tradeIdea?: TradeIdeaDetail;
  /** PriceBrain implied point range (e.g. "±12 pts") */
  pointRange?: number | null;
  /** PriceBrain sentiment direction */
  direction?: 'Bullish' | 'Bearish' | 'Neutral' | null;
  /** PriceBrain cyclical classification */
  cyclical?: 'Cyclical' | 'Counter-cyclical' | 'Neutral' | null;
  /** Instrument from PriceBrain (e.g. "ES", "NQ") */
  instrument?: string | null;
  /** X/Twitter author handle for attribution */
  authorHandle?: string | null;
}

// [claude-code 2026-03-11] Overhauled severity classification — strict contextual matching,
// tiered critical/high/medium/low. Prevents false-positive "critical" on routine commentary.

// ── Severity Classification ────────────────────────────────────────────────────

/** Word-boundary match — prevents "recipe" matching "cpi", etc. */
function wordMatch(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`, 'i').test(text);
}

/** Critical: black swan, systemic crisis, circuit breakers, government shutdown */
const CRITICAL_CHECKS: Array<(t: string) => boolean> = [
  (t) => t.includes('circuit breaker') || t.includes('trading halt'),
  (t) => t.includes('black swan'),
  (t) => t.includes('margin call') && t.includes('liquidation'),
  (t) => t.includes('contagion') || t.includes('systemic'),
  (t) => wordMatch(t, 'crash') && (t.includes('market') || t.includes('stock')),
  (t) => t.includes('emergency') && (t.includes('fed') || t.includes('meeting')),
  (t) => t.includes('government shutdown'),
  (t) => t.includes('debt ceiling') && (t.includes('default') || t.includes('deadline')),
];

/** High: major macro prints with data, Fed decisions, geopolitical escalation */
const HIGH_CHECKS: Array<(t: string) => boolean> = [
  (t) => wordMatch(t, 'fomc') || (wordMatch(t, 'fed') && (t.includes('rate') || t.includes('decision') || t.includes('statement'))),
  (t) => t.includes('rate hike') || t.includes('rate cut'),
  (t) => wordMatch(t, 'cpi') && (t.includes('actual') || t.includes('print') || t.includes('data') || t.includes('report') || t.includes('shock')),
  (t) => wordMatch(t, 'ppi') && (t.includes('actual') || t.includes('print') || t.includes('data') || t.includes('report')),
  (t) => wordMatch(t, 'nfp') || (t.includes('non-farm') && t.includes('payroll')),
  (t) => wordMatch(t, 'gdp') && (t.includes('actual') || t.includes('print') || t.includes('data') || t.includes('growth')),
  (t) => t.includes('recession') && (t.includes('official') || t.includes('confirm') || t.includes('enter')),
  (t) => wordMatch(t, 'war') && (t.includes('declare') || t.includes('escalat') || t.includes('attack') || t.includes('missile')),
  (t) => t.includes('tariff') && (t.includes('new') || t.includes('impose') || t.includes('retaliat') || t.includes('increase')),
  (t) => t.includes('sanctions') && (t.includes('new') || t.includes('impose') || t.includes('expand')),
  (t) => t.includes('bankruptcy') && (t.includes('bank') || t.includes('major') || t.includes('file')),
  (t) => wordMatch(t, 'panic') && (t.includes('sell') || t.includes('market')),
];

/** Medium: earnings beats/misses, secondary data, notable market moves */
const MEDIUM_CHECKS: Array<(t: string) => boolean> = [
  (t) => t.includes('earnings') && (t.includes('beat') || t.includes('miss') || t.includes('revenue') || t.includes('eps')),
  (t) => t.includes('guidance') && (t.includes('lower') || t.includes('raise') || t.includes('cut') || t.includes('above') || t.includes('below')),
  (t) => t.includes('inflation') && (t.includes('rise') || t.includes('fall') || t.includes('data') || t.includes('report')),
  (t) => t.includes('retail sales') && (t.includes('actual') || t.includes('data')),
  (t) => t.includes('unemployment') && (t.includes('rate') || t.includes('claims')),
  (t) => t.includes('jobless claims'),
  (t) => wordMatch(t, 'ipo') && (t.includes('price') || t.includes('launch') || t.includes('debut')),
  (t) => t.includes('merger') || t.includes('acquisition'),
  (t) => t.includes('opec') && (t.includes('cut') || t.includes('output') || t.includes('production')),
  (t) => t.includes('downgrade') && (t.includes('credit') || t.includes('rating') || t.includes('analyst')),
  (t) => t.includes('upgrade') && (t.includes('credit') || t.includes('rating') || t.includes('analyst')),
  (t) => wordMatch(t, 'pce') && (t.includes('actual') || t.includes('data') || t.includes('print')),
  (t) => t.includes('housing') && (t.includes('starts') || t.includes('data') || t.includes('sales')),
  (t) => t.includes('consumer') && t.includes('confidence') && (t.includes('data') || t.includes('index')),
  (t) => t.includes('treasury') && t.includes('auction'),
  (t) => t.includes('yield') && (t.includes('surge') || t.includes('spike') || t.includes('invert')),
];

function classifySeverity(text: string): AlertSeverity {
  const lower = text.toLowerCase();
  for (const check of CRITICAL_CHECKS) { if (check(lower)) return 'critical'; }
  for (const check of HIGH_CHECKS) { if (check(lower)) return 'high'; }
  for (const check of MEDIUM_CHECKS) { if (check(lower)) return 'medium'; }
  return 'low';
}

/** Extract tags based on keyword presence (simple substring, capped at 5) */
const TAG_KEYWORDS = [
  'fed', 'fomc', 'cpi', 'ppi', 'nfp', 'gdp', 'pce', 'earnings', 'tariff',
  'recession', 'inflation', 'merger', 'ipo', 'opec', 'sanctions', 'treasury',
];

function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  for (const kw of TAG_KEYWORDS) {
    if (wordMatch(lower, kw) && !tags.includes(kw)) tags.push(kw);
  }
  return tags.slice(0, 5);
}

// ── XML Parsing (no dependency) ────────────────────────────────────────────────

function getTagContent(xml: string, tag: string): string {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const startIdx = xml.indexOf(open);
  if (startIdx === -1) return '';
  const contentStart = xml.indexOf('>', startIdx) + 1;
  const endIdx = xml.indexOf(close, contentStart);
  if (endIdx === -1) return '';
  let content = xml.slice(contentStart, endIdx).trim();
  // Strip CDATA
  if (content.startsWith('<![CDATA[')) {
    content = content.slice(9, content.endsWith(']]>') ? content.length - 3 : content.length);
  }
  return content;
}

function parseItems(xml: string): Array<{ title: string; description: string; link: string; guid: string; pubDate: string }> {
  const items: Array<{ title: string; description: string; link: string; guid: string; pubDate: string }> = [];
  let searchFrom = 0;
  while (true) {
    const itemStart = xml.indexOf('<item>', searchFrom);
    if (itemStart === -1) break;
    const itemEnd = xml.indexOf('</item>', itemStart);
    if (itemEnd === -1) break;
    const itemXml = xml.slice(itemStart, itemEnd + 7);
    const rawTitle = getTagContent(itemXml, 'title');
    const rawDescription = getTagContent(itemXml, 'description');
    items.push({
      title: decodeHtmlEntities(rawTitle),
      description: decodeHtmlEntities(rawDescription),
      link: getTagContent(itemXml, 'link'),
      guid: getTagContent(itemXml, 'guid') || getTagContent(itemXml, 'link'),
      pubDate: getTagContent(itemXml, 'pubDate'),
    });
    searchFrom = itemEnd + 7;
  }
  return items;
}

// ── Feed Poller ────────────────────────────────────────────────────────────────

const FEED_URL = 'https://feeds.marketwatch.com/marketwatch/realtimeheadlines/';
const POLL_INTERVAL_MS = 60_000;
const MAX_ALERTS = 100;

export type AlertListener = (alerts: RiskFlowAlert[]) => void;

export class RiskFlowFeedPoller {
  private seenIds = new Set<string>();
  private alerts: RiskFlowAlert[] = [];
  private listeners = new Set<AlertListener>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private abortController: AbortController | null = null;

  /** Start polling. Safe to call multiple times. */
  start(): void {
    if (this.intervalId) return;
    this.poll(); // immediate first fetch
    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  /** Stop polling and clean up. */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.abortController?.abort();
  }

  /** Subscribe to alert updates. Returns unsubscribe fn. */
  subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    // Emit current state immediately
    listener(this.alerts);
    return () => this.listeners.delete(listener);
  }

  /** Get current alerts snapshot. */
  getAlerts(): RiskFlowAlert[] {
    return this.alerts;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try { listener(this.alerts); } catch { /* swallow */ }
    }
  }

  private async poll(): Promise<void> {
    this.abortController?.abort();
    this.abortController = new AbortController();
    try {
      const res = await fetch(FEED_URL, {
        signal: this.abortController.signal,
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
      });
      if (!res.ok) {
        console.warn(`[RiskFlow] Feed fetch failed: ${res.status}`);
        return;
      }
      const xml = await res.text();
      const items = parseItems(xml);
      let added = false;
      for (const item of items) {
        const id = item.guid || item.link;
        if (this.seenIds.has(id)) continue;
        this.seenIds.add(id);
        const combined = `${item.title} ${item.description}`;
        const alert: RiskFlowAlert = {
          id,
          headline: item.title,
          summary: item.description,
          url: item.link,
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          source: 'marketwatch',
          severity: classifySeverity(combined),
          tags: extractTags(combined),
        };
        this.alerts.unshift(alert); // newest first
        added = true;
      }
      // Cap
      if (this.alerts.length > MAX_ALERTS) {
        this.alerts = this.alerts.slice(0, MAX_ALERTS);
      }
      if (added) this.notify();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[RiskFlow] Poll error:', err);
    }
  }
}

/** Singleton instance */
export const riskFlowPoller = new RiskFlowFeedPoller();
