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

export async function queryTradeIdeas(): Promise<NotionTradeIdea[]> {
  if (!getNotionKey()) {
    console.warn('[Notion] NOTION_API_KEY not set — skipping trade idea query');
    return [];
  }
  try {
    const pages = await notionQuery(TRADE_IDEAS_DB);
    return pages.map((page: any) => {
      const ticker = String(
        extractPropValue(getPropByAlias(page, ['ticker', 'symbol', 'instrument', 'asset', 'name', 'title'])) ?? ''
      );
      const rawDir = String(
        extractPropValue(getPropByAlias(page, ['direction', 'side', 'bias', 'trade direction'])) ?? 'neutral'
      ).toLowerCase();
      const direction: 'long' | 'short' | 'neutral' =
        rawDir === 'long' ? 'long' : rawDir === 'short' ? 'short' : 'neutral';
      const entry = Number(extractPropValue(getPropByAlias(page, ['entry', 'entry price', 'entry level']))) || undefined;
      const stopLoss = Number(extractPropValue(getPropByAlias(page, ['stop', 'stop loss', 'stoploss', 'sl']))) || undefined;
      const takeProfit = Number(extractPropValue(getPropByAlias(page, ['target', 'take profit', 'tp', 'takeprofit']))) || undefined;
      const confidence = String(extractPropValue(getPropByAlias(page, ['confidence', 'conviction', 'certainty'])) ?? '') || undefined;
      const timeframe = String(extractPropValue(getPropByAlias(page, ['timeframe', 'time frame', 'horizon'])) ?? '') || undefined;
      const sourceAgent = String(extractPropValue(getPropByAlias(page, ['agent', 'source', 'proposed by', 'author'])) ?? '') || undefined;

      let potentialRisk: number | undefined;
      let potentialProfit: number | undefined;
      let riskRewardRatio: number | undefined;
      if (entry && stopLoss) potentialRisk = (Math.abs(entry - stopLoss) / entry) * 100;
      if (entry && takeProfit) potentialProfit = (Math.abs(takeProfit - entry) / entry) * 100;
      if (potentialRisk && potentialProfit && potentialRisk > 0) riskRewardRatio = potentialProfit / potentialRisk;

      return {
        id: page.id as string,
        ticker: ticker || 'UNKNOWN',
        direction,
        entry,
        stopLoss,
        takeProfit,
        potentialRisk,
        potentialProfit,
        riskRewardRatio,
        confidence,
        timeframe,
        sourceAgent,
        openclawDescription: undefined,
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

    const pnl = extractPropValue(getPropByAlias(latest, ['pnl', 'p&l', 'profit', 'profit & loss', 'daily pnl', 'daily p&l', 'net pnl']));
    const winRate = extractPropValue(getPropByAlias(latest, ['win rate', 'winrate', 'win %', 'win percentage']));
    const dailyReturn = extractPropValue(getPropByAlias(latest, ['daily return', 'return', 'return %', 'daily %']));
    const drawdown = extractPropValue(getPropByAlias(latest, ['drawdown', 'max drawdown', 'dd', 'max dd']));

    if (pnl !== null && pnl !== '') {
      const n = typeof pnl === 'number' ? pnl : parseFloat(String(pnl));
      kpis.push({
        label: 'Intraday PnL',
        value: isNaN(n) ? String(pnl) : `${n >= 0 ? '+' : ''}$${Math.abs(n).toLocaleString()}`,
        meta: 'Live · Notion',
      });
    }
    if (winRate !== null && winRate !== '') {
      const n = typeof winRate === 'number' ? winRate : parseFloat(String(winRate));
      kpis.push({
        label: 'Win Rate',
        value: isNaN(n) ? String(winRate) : `${(n > 1 ? n : n * 100).toFixed(0)}%`,
        meta: 'Daily sessions',
      });
    }
    if (dailyReturn !== null && dailyReturn !== '') {
      const n = typeof dailyReturn === 'number' ? dailyReturn : parseFloat(String(dailyReturn));
      kpis.push({
        label: 'Daily Return',
        value: isNaN(n) ? String(dailyReturn) : `${n >= 0 ? '+' : ''}${(n > 1 ? n : n * 100).toFixed(2)}%`,
        meta: 'vs session open',
      });
    }
    if (drawdown !== null && drawdown !== '') {
      const n = typeof drawdown === 'number' ? drawdown : parseFloat(String(drawdown));
      kpis.push({
        label: 'Max Drawdown',
        value: isNaN(n) ? String(drawdown) : `-${Math.abs(n > 1 ? n : n * 100).toFixed(2)}%`,
        meta: 'Intraday',
      });
    }

    return kpis;
  } catch (err) {
    console.warn('[Notion] Failed to query P&L:', err);
    return [];
  }
}
