// [claude-code 2026-03-05] Economic Calendar service — fetches events + prints from Notion, writes actuals.

import {
  ECONOMIC_EVENTS_DB,
  ECON_PRINTS_DB,
  notionQuery,
  notionCreatePage,
  notionUpdatePage,
  getPropByAlias,
  extractPropValue,
  toText,
  normalizeIsoDate,
} from './notion-service.js';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EconEvent {
  id: string;
  name: string;
  date?: string;
  time?: string;
  country: string;
  importance: 1 | 2 | 3;
  forecast?: string;
  previous?: string;
  actual?: string;
  category?: string;
  definition?: string;
  aiTicker?: string;
  notionUrl: string;
}

export interface EconPrint {
  id: string;
  eventName: string;
  date: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  surprise: number | null;
  direction: 'beat' | 'miss' | 'inline' | null;
  goodBeta: boolean;
  notionUrl: string;
}

// ── Field Aliases ───────────────────────────────────────────────────────────

const NAME_ALIASES = ['Name', 'Title', 'Event', 'Calendar Event'];
const DATE_ALIASES = ['Date', 'Event Date', 'Start', 'Time', 'Release Date'];
const TIME_ALIASES = ['Event Time', 'Time', 'Release Time', 'Hour'];
const COUNTRY_ALIASES = ['Country', 'Region', 'Economy'];
const IMPORTANCE_ALIASES = ['Importance', 'Impact', 'Priority', 'Weight'];
const FORECAST_ALIASES = ['Forecast', 'Estimate', 'Consensus'];
const PREVIOUS_ALIASES = ['Previous', 'Prev', 'Prior'];
const ACTUAL_ALIASES = ['Actual', 'Result', 'Print'];
const CATEGORY_ALIASES = ['Category', 'Type', 'Sector'];
const DEFINITION_ALIASES = ['Definition', 'Description', 'Detail', 'Notes'];
const AI_TICKER_ALIASES = ['AI Ticker', 'Ticker', 'Symbol'];

// Print-specific (matching Harper's Econ Prints DB schema)
const SURPRISE_ALIASES = ['Surprise %', 'Surprise', 'Surprise%', 'Deviation'];
const DIRECTION_ALIASES = ['Surprise Direction', 'Direction', 'Beat/Miss', 'Result Direction'];
const GOOD_BETA_ALIASES = ['Good Beta', 'GoodBeta', 'Positive Beta'];

// ── Fetch Economic Calendar Events ──────────────────────────────────────────

export async function fetchEconCalendar(opts?: {
  from?: string;
  to?: string;
}): Promise<EconEvent[]> {
  const filter = buildDateFilter(opts?.from, opts?.to);
  const pages = await notionQuery(ECONOMIC_EVENTS_DB, {
    filter: filter ?? undefined,
    sorts: [{ property: 'Date', direction: 'ascending' }],
    pageSize: 100,
  });

  return pages.map((page: any) => {
    const name = toText(extractPropValue(getPropByAlias(page, NAME_ALIASES)));
    const dateRaw = toText(extractPropValue(getPropByAlias(page, DATE_ALIASES)));
    const time = toText(extractPropValue(getPropByAlias(page, TIME_ALIASES)));
    const country = toText(extractPropValue(getPropByAlias(page, COUNTRY_ALIASES))) || 'US';
    const impRaw = extractPropValue(getPropByAlias(page, IMPORTANCE_ALIASES));
    const importance = parseImportance(impRaw);
    const forecast = toText(extractPropValue(getPropByAlias(page, FORECAST_ALIASES)));
    const previous = toText(extractPropValue(getPropByAlias(page, PREVIOUS_ALIASES)));
    const actual = toText(extractPropValue(getPropByAlias(page, ACTUAL_ALIASES)));
    const category = toText(extractPropValue(getPropByAlias(page, CATEGORY_ALIASES)));
    const definition = toText(extractPropValue(getPropByAlias(page, DEFINITION_ALIASES)));
    const aiTicker = toText(extractPropValue(getPropByAlias(page, AI_TICKER_ALIASES)));

    return {
      id: page.id as string,
      name: name || 'Untitled Event',
      date: normalizeIsoDate(dateRaw),
      time: time || undefined,
      country,
      importance,
      forecast: forecast || undefined,
      previous: previous || undefined,
      actual: actual || undefined,
      category: category || undefined,
      definition: definition || undefined,
      aiTicker: aiTicker || undefined,
      notionUrl: page.url ?? '',
    };
  }).filter((e) => e.name !== 'Untitled Event' || e.date);
}

// ── Fetch Econ Prints (Historical Actuals) ──────────────────────────────────

export async function fetchEconPrints(eventName?: string): Promise<EconPrint[]> {
  if (!ECON_PRINTS_DB) {
    console.warn('[EconCalendar] ECON_PRINTS_DB not configured — skipping prints');
    return [];
  }

  const filter = eventName
    ? { property: 'Name', rich_text: { contains: eventName } }
    : undefined;

  const pages = await notionQuery(ECON_PRINTS_DB, {
    filter,
    sorts: [{ property: 'Date', direction: 'descending' }],
    pageSize: 50,
  });

  return pages.map((page: any) => {
    const name = toText(extractPropValue(getPropByAlias(page, NAME_ALIASES)));
    const dateRaw = toText(extractPropValue(getPropByAlias(page, DATE_ALIASES)));
    const actual = extractPropValue(getPropByAlias(page, ACTUAL_ALIASES)) as number | null;
    const forecast = extractPropValue(getPropByAlias(page, FORECAST_ALIASES)) as number | null;
    const previous = extractPropValue(getPropByAlias(page, PREVIOUS_ALIASES)) as number | null;
    const surpriseRaw = extractPropValue(getPropByAlias(page, SURPRISE_ALIASES));
    const dirRaw = toText(extractPropValue(getPropByAlias(page, DIRECTION_ALIASES))).toLowerCase();
    const goodBetaRaw = extractPropValue(getPropByAlias(page, GOOD_BETA_ALIASES));

    const surprise = typeof surpriseRaw === 'number' ? surpriseRaw
      : (actual !== null && forecast !== null && forecast !== 0)
        ? ((actual - forecast) / Math.abs(forecast)) * 100
        : null;

    const direction: EconPrint['direction'] =
      dirRaw === 'beat' ? 'beat'
      : dirRaw === 'miss' ? 'miss'
      : dirRaw === 'inline' ? 'inline'
      : (actual !== null && forecast !== null)
        ? (actual > forecast ? 'beat' : actual < forecast ? 'miss' : 'inline')
        : null;

    return {
      id: page.id as string,
      eventName: name || eventName || 'Unknown',
      date: normalizeIsoDate(dateRaw) ?? dateRaw,
      actual,
      forecast,
      previous,
      surprise: surprise !== null ? Math.round(surprise * 100) / 100 : null,
      direction,
      goodBeta: goodBetaRaw === true || String(goodBetaRaw).toLowerCase() === 'true',
      notionUrl: page.url ?? '',
    };
  });
}

// ── Write Econ Print (actual result) to Notion ──────────────────────────────

export async function writeEconPrint(print: {
  eventName: string;
  date: string;
  actual: number;
  forecast?: number;
  previous?: number;
}): Promise<{ id: string; url: string } | null> {
  if (!ECON_PRINTS_DB) {
    console.warn('[EconCalendar] ECON_PRINTS_DB not configured — cannot write print');
    return null;
  }

  const surprise = (print.forecast != null && print.forecast !== 0)
    ? ((print.actual - print.forecast) / Math.abs(print.forecast)) * 100
    : undefined;

  const direction = print.forecast != null
    ? (print.actual > print.forecast ? 'Beat' : print.actual < print.forecast ? 'Miss' : 'Inline')
    : undefined;

  const properties: Record<string, unknown> = {
    Name: { title: [{ text: { content: print.eventName } }] },
    Date: { date: { start: print.date } },
    Actual: { number: print.actual },
  };

  if (print.forecast != null) properties.Forecast = { number: print.forecast };
  if (print.previous != null) properties.Previous = { number: print.previous };
  if (surprise != null) properties['Surprise%'] = { number: Math.round(surprise * 100) / 100 };
  if (direction) properties.Direction = { select: { name: direction } };

  return notionCreatePage(ECON_PRINTS_DB, properties);
}

// ── Update actual on an existing Economic Events row ────────────────────────

export async function updateEventActual(
  eventPageId: string,
  actual: string
): Promise<boolean> {
  return notionUpdatePage(eventPageId, {
    Actual: { rich_text: [{ text: { content: actual } }] },
  });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseImportance(value: unknown): 1 | 2 | 3 {
  if (typeof value === 'number') return Math.min(3, Math.max(1, Math.round(value))) as 1 | 2 | 3;
  const s = String(value ?? '').toLowerCase();
  if (s === 'high' || s === '3') return 3;
  if (s === 'medium' || s === '2') return 2;
  return 1;
}

function buildDateFilter(from?: string, to?: string): object | null {
  if (!from && !to) return null;
  const conditions: object[] = [];
  if (from) conditions.push({ property: 'Date', date: { on_or_after: from } });
  if (to) conditions.push({ property: 'Date', date: { on_or_before: to } });
  return conditions.length === 1 ? conditions[0] : { and: conditions };
}
