// [claude-code 2026-03-03] Phase 3: Notion service — fetches NTN Brief from Harper Messages DB
// [claude-code 2026-03-03] Extended: Trade Ideas + Daily P&L query functions for Notion poller.
// Falls back to mock data when NOTION_API_KEY is not set.

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Notion DB IDs from PIC-NOTION-ENTITY-MAP.md
const HARPER_MESSAGES_DB = '30c141b0da7d81ba8bb6e319a0c4c309';
const TRADE_IDEAS_DB = '136fa9a2069e4afc835e0e139ead49f2';
const DAILY_PNL_DB = 'ee7d03052a424dcb95f6406c166e7584';

function getNotionKey(): string | undefined {
  return (process.env as Record<string, string | undefined>).NOTION_API_KEY;
}

export interface NTNBriefItem {
  title: string;
  detail: string;
}

export interface ScheduleItem {
  title: string;
  detail: string;
  forecast?: string;
  actual?: string;
  previous?: string;
  date?: string;
}

// ── Fallback mock data ──────────────────────────────────────────────────────

const MOCK_NTN_BRIEF: NTNBriefItem[] = [
  { title: 'Liquidity depth favors range expansion', detail: 'Watch 12:30 re-open; keep stops 5 pts beyond extremes.' },
  { title: 'RiskFlow bias: defensive', detail: 'Reduce duration in rate-sensitive book.' },
  { title: 'Research memo: AI infra pricing', detail: 'Comp stack suggests margin compression in Q2.' },
];

function relativeDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const MOCK_SCHEDULE: ScheduleItem[] = [
  { title: '09:30 NY Open', detail: 'Harper sets session bias', date: relativeDate(0) },
  { title: '10:00 CPI Print', detail: 'Risk pause window', forecast: '0.3%', actual: '-', previous: '0.2%', date: relativeDate(0) },
  { title: '14:15 RiskFlow Sync', detail: 'Executive checkpoint', date: relativeDate(0) },
  { title: '08:30 Jobless Claims', detail: 'Weekly initial claims', forecast: '220K', actual: '-', previous: '215K', date: relativeDate(1) },
  { title: '13:00 30Y Bond Auction', detail: 'Duration supply — watch tail', forecast: '4.62%', actual: '-', previous: '4.58%', date: relativeDate(1) },
  { title: '10:00 UMich Sentiment', detail: 'Consumer confidence prelim', forecast: '78.5', actual: '-', previous: '79.4', date: relativeDate(2) },
];

// ── Notion helpers ──────────────────────────────────────────────────────────

async function notionQuery(databaseId: string, filter?: object): Promise<any[]> {
  const key = getNotionKey();
  if (!key) return [];

  const body: Record<string, unknown> = { page_size: 20 };
  if (filter) body.filter = filter;

  const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`[Notion] Query failed for DB ${databaseId}: ${res.status}`);
    return [];
  }

  const json = await res.json() as { results?: any[] };
  return json.results ?? [];
}

function getPropText(page: any, field: string): string {
  const prop = page?.properties?.[field];
  if (!prop) return '';
  if (prop.type === 'title') return prop.title?.map((t: any) => t.plain_text).join('') ?? '';
  if (prop.type === 'rich_text') return prop.rich_text?.map((t: any) => t.plain_text).join('') ?? '';
  if (prop.type === 'select') return prop.select?.name ?? '';
  if (prop.type === 'date') return prop.date?.start ?? '';
  return '';
}

// ── Public API ──────────────────────────────────────────────────────────────

export async function fetchNTNBrief(): Promise<NTNBriefItem[]> {
  const key = getNotionKey();
  if (!key) return MOCK_NTN_BRIEF;

  try {
    const pages = await notionQuery(HARPER_MESSAGES_DB, {
      property: 'Source',
      select: { equals: 'Harper-Kimi' },
    });

    if (pages.length === 0) return MOCK_NTN_BRIEF;

    return pages.slice(0, 6).map((page: any) => ({
      title: getPropText(page, 'Name') || getPropText(page, 'Title') || 'Untitled',
      detail: getPropText(page, 'Summary') || getPropText(page, 'Content') || '',
    }));
  } catch (err) {
    console.error('[Notion] fetchNTNBrief error:', err);
    return MOCK_NTN_BRIEF;
  }
}

export async function fetchSchedule(): Promise<ScheduleItem[]> {
  // Economic calendar — no dedicated Notion DB, return structured mock data
  // This can be wired to FMP economic calendar or a future Notion DB
  return MOCK_SCHEDULE;
}

// ── Trade Ideas ─────────────────────────────────────────────────────────────

export interface NotionTradeIdea {
  id: string;
  ticker: string;
  direction: 'long' | 'short' | 'neutral';
  entry?: number;
  stopLoss?: number;
  takeProfit?: number;
  potentialRisk?: number;   // |entry - SL| / entry * 100
  potentialProfit?: number; // |TP - entry| / entry * 100
  riskRewardRatio?: number;
  confidence?: string;
  timeframe?: string;
  sourceAgent?: string;
  openclawDescription?: string;
  notionUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** Try multiple property name aliases (case-insensitive). */
function getPropByAlias(page: any, aliases: string[]): any {
  const keys = Object.keys(page?.properties ?? {});
  for (const alias of aliases) {
    const match = keys.find((k) => k.toLowerCase() === alias.toLowerCase());
    if (match) return page.properties[match];
  }
  return null;
}

/** Extract scalar value from any Notion property type. */
function extractPropValue(prop: any): string | number | boolean | null {
  if (!prop) return null;
  switch (prop.type) {
    case 'title': return prop.title?.map((t: any) => t.plain_text).join('') ?? null;
    case 'rich_text': return prop.rich_text?.map((t: any) => t.plain_text).join('') ?? null;
    case 'number': return prop.number ?? null;
    case 'select': return prop.select?.name ?? null;
    case 'multi_select': return prop.multi_select?.map((s: any) => s.name).join(', ') ?? null;
    case 'date': return prop.date?.start ?? null;
    case 'checkbox': return prop.checkbox ?? null;
    case 'url': return prop.url ?? null;
    case 'status': return prop.status?.name ?? null;
    case 'formula': {
      const f = prop.formula;
      return f ? (f[f.type] ?? null) : null;
    }
    default: return null;
  }
}

// Exact property names from live Trade Ideas DB (verified 2026-03-03):
// 'Trade Idea' (title), 'Ticker' (rich_text), 'Direction' (select: Long/Short),
// 'Entry Price' (number), 'Exit Price' (number), 'Confidence' (number 0-100),
// 'Analyst' (select), 'Thesis' (rich_text), 'Status' (status), 'Date' (date), 'Model' (select)

function confidenceLabel(n: number): string {
  if (n >= 70) return 'high';
  if (n >= 50) return 'medium';
  return 'low';
}

export async function queryTradeIdeas(): Promise<NotionTradeIdea[]> {
  if (!getNotionKey()) {
    console.warn('[Notion] NOTION_API_KEY not set — skipping trade idea query');
    return [];
  }
  try {
    // Only fetch non-template, non-archived ideas (Status != Proposed template)
    const pages = await notionQuery(TRADE_IDEAS_DB);
    return pages
      .filter((page: any) => {
        // Skip the TEMPLATE entry
        const title = extractPropValue(page.properties?.['Trade Idea']) ?? '';
        return !String(title).startsWith('TEMPLATE');
      })
      .map((page: any) => {
        const props = page.properties ?? {};

        // Title of the trade idea (e.g. "Fed Zero Rate Cuts in 2026 — Long YES")
        const tradeTitle = String(extractPropValue(props['Trade Idea']) ?? '');
        // Ticker / instrument (e.g. "RATECUTCOUNT-26-0")
        const ticker = String(extractPropValue(props['Ticker']) ?? tradeTitle);
        // Direction: "Long" | "Short" → normalize to lowercase
        const rawDir = String(extractPropValue(props['Direction']) ?? 'neutral').toLowerCase();
        const direction: 'long' | 'short' | 'neutral' =
          rawDir === 'long' ? 'long' : rawDir === 'short' ? 'short' : 'neutral';
        // Prices
        const entry = (extractPropValue(props['Entry Price']) as number | null) ?? undefined;
        const exitPrice = (extractPropValue(props['Exit Price']) as number | null) ?? undefined;
        // Confidence: number 0-100 → classify as string label
        const confNum = extractPropValue(props['Confidence']) as number | null;
        const confidence = confNum != null ? confidenceLabel(confNum) : undefined;
        // Source agent (Analyst field)
        const sourceAgent = String(extractPropValue(props['Analyst']) ?? '') || undefined;
        // Full thesis as the description seed
        const thesis = String(extractPropValue(props['Thesis']) ?? '') || undefined;

        // For prediction market contracts: entry is the contract price (0-1 scale or cents)
        // No explicit SL/TP — risk = entry price (cost of contract), profit = 1 - entry
        let potentialRisk: number | undefined;
        let potentialProfit: number | undefined;
        let riskRewardRatio: number | undefined;
        if (entry && entry <= 1) {
          // Kalshi-style contract: entry is price in $0-$1
          potentialRisk = entry * 100; // % of contract cost
          potentialProfit = (1 - entry) * 100;
          if (potentialRisk > 0) riskRewardRatio = potentialProfit / potentialRisk;
        } else if (entry && exitPrice) {
          // Traditional instrument with entry + exit price
          potentialRisk = undefined; // No SL in DB
          potentialProfit = (Math.abs(exitPrice - entry) / entry) * 100;
        }

        return {
          id: page.id as string,
          ticker: ticker || tradeTitle || 'UNKNOWN',
          direction,
          entry: entry ?? undefined,
          stopLoss: undefined, // Not in DB schema
          takeProfit: exitPrice,
          potentialRisk,
          potentialProfit,
          riskRewardRatio,
          confidence,
          timeframe: String(extractPropValue(props['Date']) ?? '') || undefined,
          sourceAgent,
          openclawDescription: thesis ? thesis.slice(0, 300) : undefined, // Seed with thesis excerpt
          notionUrl: page.url ?? '',
          createdAt: page.created_time ?? new Date().toISOString(),
          updatedAt: page.last_edited_time ?? new Date().toISOString(),
        };
      });
  } catch (err) {
    console.warn('[Notion] Failed to query trade ideas:', err);
    return [];
  }
}

// ── Daily P&L / KPIs ────────────────────────────────────────────────────────

export interface NotionPerformanceKpi {
  label: string;
  value: string;
  meta: string;
}

export async function queryDailyPnL(): Promise<NotionPerformanceKpi[]> {
  if (!getNotionKey()) {
    console.warn('[Notion] NOTION_API_KEY not set — skipping P&L query');
    return [];
  }
  try {
    const pages = await notionQuery(DAILY_PNL_DB);
    if (pages.length === 0) return [];

    const latest = pages[0];
    const kpis: NotionPerformanceKpi[] = [];

    // Exact property names from live Daily P&L DB (verified 2026-03-03):
    // 'Net P&L', 'Gross P&L', 'Win Rate', 'Trades Taken', 'Bias', 'NTN Summary', 'Day' (title), 'Date'
    const props = latest.properties ?? {};
    const pnl = extractPropValue(props['Net P&L'] ?? props['Gross P&L']);
    const winRate = extractPropValue(props['Win Rate']);
    const tradesTaken = extractPropValue(props['Trades Taken']);
    const bias = extractPropValue(props['Bias']);
    // Use Avg P&L / Trade formula as a proxy for daily return if available
    const avgPnl = extractPropValue(props['Avg P&L / Trade']);
    // No drawdown column exists — leave it out
    const dailyReturn = null;
    const drawdown = null;

    if (pnl !== null) {
      const n = typeof pnl === 'number' ? pnl : parseFloat(String(pnl));
      kpis.push({
        label: 'Net P&L',
        value: isNaN(n) ? String(pnl) : `${n >= 0 ? '+' : ''}$${Math.abs(n).toLocaleString()}`,
        meta: 'Live · Notion',
      });
    }
    if (winRate !== null) {
      const n = typeof winRate === 'number' ? winRate : parseFloat(String(winRate));
      kpis.push({
        label: 'Win Rate',
        value: isNaN(n) ? String(winRate) : `${(n > 1 ? n : n * 100).toFixed(0)}%`,
        meta: 'Daily sessions',
      });
    }
    if (tradesTaken !== null) {
      kpis.push({
        label: 'Trades Taken',
        value: String(tradesTaken),
        meta: bias ? `Bias: ${bias}` : 'Today',
      });
    }
    if (avgPnl !== null) {
      const n = typeof avgPnl === 'number' ? avgPnl : parseFloat(String(avgPnl));
      kpis.push({
        label: 'Avg P&L / Trade',
        value: isNaN(n) ? String(avgPnl) : `${n >= 0 ? '+' : ''}$${Math.abs(n).toFixed(0)}`,
        meta: 'Per trade',
      });
    }
    // dailyReturn and drawdown are null (not in DB) — omitted intentionally

    return kpis;
  } catch (err) {
    console.warn('[Notion] Failed to query P&L:', err);
    return [];
  }
}
