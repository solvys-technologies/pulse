/**
 * RiskFlow RSS Feed Poller — MarketWatch Real-Time Headlines
 * Fetches, parses, classifies, and deduplicates market news alerts.
 */

// ── Types ──────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'low' | 'medium' | 'high';

export interface RiskFlowAlert {
  id: string;
  headline: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: 'marketwatch';
  severity: AlertSeverity;
  tags: string[];
}

// ── Severity Classification ────────────────────────────────────────────────────

const HIGH_KEYWORDS = [
  'fed', 'federal reserve', 'fomc', 'rate hike', 'rate cut', 'interest rate',
  'crash', 'recession', 'tariff', 'sanctions', 'default', 'bankruptcy',
  'circuit breaker', 'halt', 'panic', 'crisis', 'emergency', 'war',
  'inflation surge', 'cpi shock', 'black swan', 'margin call', 'liquidation',
  'contagion', 'systemic', 'downgrade', 'debt ceiling', 'shutdown',
];

const MEDIUM_KEYWORDS = [
  'earnings', 'report', 'gdp', 'jobs', 'payroll', 'unemployment',
  'ipo', 'merger', 'acquisition', 'buyback', 'dividend', 'guidance',
  'upgrade', 'downgrade', 'outlook', 'forecast', 'revenue', 'profit',
  'inflation', 'cpi', 'ppi', 'retail sales', 'housing', 'consumer',
  'oil', 'opec', 'treasury', 'yield', 'bond', 'dollar', 'euro',
  'china', 'sec', 'regulation', 'antitrust', 'settlement',
];

function classifySeverity(text: string): AlertSeverity {
  const lower = text.toLowerCase();
  for (const kw of HIGH_KEYWORDS) {
    if (lower.includes(kw)) return 'high';
  }
  for (const kw of MEDIUM_KEYWORDS) {
    if (lower.includes(kw)) return 'medium';
  }
  return 'low';
}

function extractTags(text: string): string[] {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  const allKeywords = [...HIGH_KEYWORDS, ...MEDIUM_KEYWORDS];
  for (const kw of allKeywords) {
    if (lower.includes(kw) && !tags.includes(kw)) {
      tags.push(kw);
    }
  }
  return tags.slice(0, 5); // cap at 5 tags
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
    items.push({
      title: getTagContent(itemXml, 'title'),
      description: getTagContent(itemXml, 'description'),
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
