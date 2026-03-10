// [claude-code 2026-03-09] Notion-backed ERStoreAdapter — earnings review journal persistence
import type { ERStoreAdapter } from './adapter.js';
import type {
  EarningsReview,
  EarningsHistoryFilter,
  EarningsHistoryPage,
  EarningsReviewCreate,
  EarningsReviewUpdate,
} from '../../types/earnings-history.js';
import {
  notionQuery,
  notionCreatePage,
  notionUpdatePage,
  getPropByAlias,
  extractPropValue,
  toText,
} from '../notion-service.js';

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Property alias maps for resilient field lookup
const SYMBOL_ALIASES = ['Symbol', 'Ticker'];
const DATE_ALIASES = ['Earnings Date', 'ER Date', 'Date'];
const SETUP_ALIASES = ['Setup Type', 'Setup', 'Strategy'];
const DIRECTION_ALIASES = ['Direction', 'Bias'];
const ENTRY_ALIASES = ['Entry Price', 'Entry'];
const EXIT_ALIASES = ['Exit Price', 'Exit'];
const PNL_ALIASES = ['P&L', 'PnL', 'Profit'];
const EMOTIONAL_ALIASES = ['Emotional State', 'Emotion', 'Feelings'];
const THESIS_ALIASES = ['Thesis', 'Pre-ER Thesis', 'Plan'];
const REVIEW_ALIASES = ['Post Review', 'Review', 'Notes', 'Journal'];
const LESSONS_ALIASES = ['Lessons', 'Takeaways'];
const GRADE_ALIASES = ['Grade', 'Rating'];
const TAGS_ALIASES = ['Tags'];

function getNotionKey(): string | undefined {
  return (process.env as Record<string, string | undefined>).NOTION_API_KEY;
}

let _dbId: string | null = null;

function getDbId(): string {
  if (_dbId) return _dbId;
  const env = (process.env as Record<string, string | undefined>).NOTION_EARNINGS_HISTORY_DB;
  if (env) {
    _dbId = env;
    return env;
  }
  return '';
}

function pageToReview(page: any): EarningsReview {
  const symbol = toText(extractPropValue(getPropByAlias(page, SYMBOL_ALIASES)));
  const earningsDate = toText(extractPropValue(getPropByAlias(page, DATE_ALIASES)));
  const setupType = toText(extractPropValue(getPropByAlias(page, SETUP_ALIASES)));
  const rawDir = toText(extractPropValue(getPropByAlias(page, DIRECTION_ALIASES))).toLowerCase();
  const direction: 'long' | 'short' | 'flat' =
    rawDir === 'long' ? 'long' : rawDir === 'short' ? 'short' : 'flat';
  const entryPrice = extractPropValue(getPropByAlias(page, ENTRY_ALIASES)) as number | null;
  const exitPrice = extractPropValue(getPropByAlias(page, EXIT_ALIASES)) as number | null;
  const pnl = extractPropValue(getPropByAlias(page, PNL_ALIASES)) as number | null;
  const emotionalState = toText(extractPropValue(getPropByAlias(page, EMOTIONAL_ALIASES)));
  const thesis = toText(extractPropValue(getPropByAlias(page, THESIS_ALIASES)));
  const postReview = toText(extractPropValue(getPropByAlias(page, REVIEW_ALIASES)));
  const lessonsRaw = toText(extractPropValue(getPropByAlias(page, LESSONS_ALIASES)));
  const lessons = lessonsRaw ? lessonsRaw.split(';').map((l) => l.trim()).filter(Boolean) : [];
  const grade = toText(extractPropValue(getPropByAlias(page, GRADE_ALIASES))) as EarningsReview['grade'] | '';
  const tagsRaw = toText(extractPropValue(getPropByAlias(page, TAGS_ALIASES)));
  const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];

  let pnlPercent: number | undefined;
  if (pnl != null && entryPrice != null && entryPrice !== 0) {
    pnlPercent = (pnl / entryPrice) * 100;
  }

  return {
    id: page.id,
    symbol: symbol || 'UNKNOWN',
    earningsDate,
    setupType,
    direction,
    entryPrice: entryPrice ?? undefined,
    exitPrice: exitPrice ?? undefined,
    pnl: pnl ?? undefined,
    pnlPercent,
    emotionalState,
    thesis,
    postReview,
    lessons,
    grade: grade || undefined,
    tags,
    notionUrl: page.url ?? undefined,
    createdAt: page.created_time ?? new Date().toISOString(),
    updatedAt: page.last_edited_time ?? new Date().toISOString(),
  };
}

function buildNotionProps(data: EarningsReviewCreate | EarningsReviewUpdate, isCreate = false): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  if ('symbol' in data && data.symbol) {
    props['Symbol'] = { title: [{ text: { content: data.symbol } }] };
  }
  if ('earningsDate' in data && data.earningsDate) {
    props['Earnings Date'] = { date: { start: data.earningsDate } };
  }
  if ('setupType' in data && data.setupType) {
    props['Setup Type'] = { select: { name: data.setupType } };
  }
  if ('direction' in data && data.direction) {
    props['Direction'] = { select: { name: data.direction } };
  }
  if (data.emotionalState !== undefined) {
    props['Emotional State'] = { rich_text: [{ text: { content: data.emotionalState } }] };
  }
  if ('thesis' in data && data.thesis) {
    props['Thesis'] = { rich_text: [{ text: { content: data.thesis } }] };
  }
  if (data.postReview !== undefined) {
    props['Post Review'] = { rich_text: [{ text: { content: data.postReview } }] };
  }
  if (data.lessons !== undefined) {
    props['Lessons'] = { rich_text: [{ text: { content: data.lessons.join('; ') } }] };
  }
  if (data.grade !== undefined) {
    props['Grade'] = { select: { name: data.grade } };
  }
  if (data.tags !== undefined) {
    props['Tags'] = { multi_select: data.tags.map((t) => ({ name: t })) };
  }
  if ('entryPrice' in data && data.entryPrice !== undefined) {
    props['Entry Price'] = { number: data.entryPrice };
  }
  if (data.exitPrice !== undefined) {
    props['Exit Price'] = { number: data.exitPrice };
  }
  if (data.pnl !== undefined) {
    props['P&L'] = { number: data.pnl };
  }

  return props;
}

function buildNotionFilter(filter: EarningsHistoryFilter): object | undefined {
  const conditions: object[] = [];

  if (filter.symbol) {
    conditions.push({
      property: 'Symbol',
      title: { contains: filter.symbol.toUpperCase() },
    });
  }
  if (filter.setupType) {
    conditions.push({
      property: 'Setup Type',
      select: { equals: filter.setupType },
    });
  }
  if (filter.direction) {
    conditions.push({
      property: 'Direction',
      select: { equals: filter.direction },
    });
  }
  if (filter.grade) {
    conditions.push({
      property: 'Grade',
      select: { equals: filter.grade },
    });
  }
  if (filter.dateFrom) {
    conditions.push({
      property: 'Earnings Date',
      date: { on_or_after: filter.dateFrom },
    });
  }
  if (filter.dateTo) {
    conditions.push({
      property: 'Earnings Date',
      date: { on_or_before: filter.dateTo },
    });
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return { and: conditions };
}

export class NotionERAdapter implements ERStoreAdapter {
  async list(filter: EarningsHistoryFilter): Promise<EarningsHistoryPage> {
    const dbId = getDbId();
    if (!dbId) return { items: [], total: 0, hasMore: false };

    const limit = filter.limit ?? 20;
    const offset = filter.offset ?? 0;

    const pages = await notionQuery(dbId, {
      filter: buildNotionFilter(filter),
      sorts: [{ property: 'Earnings Date', direction: 'descending' } as any],
      pageSize: 100,
    });

    const items = pages.map(pageToReview);
    const sliced = items.slice(offset, offset + limit);

    return {
      items: sliced,
      total: items.length,
      hasMore: offset + limit < items.length,
    };
  }

  async getById(id: string): Promise<EarningsReview | null> {
    const key = getNotionKey();
    if (!key) return null;

    try {
      const res = await fetch(`${NOTION_API}/pages/${id}`, {
        headers: {
          Authorization: `Bearer ${key}`,
          'Notion-Version': NOTION_VERSION,
        },
      });
      if (!res.ok) return null;
      const page = await res.json();
      return pageToReview(page);
    } catch {
      return null;
    }
  }

  async create(data: EarningsReviewCreate): Promise<EarningsReview> {
    const dbId = getDbId();
    if (!dbId) throw new Error('Earnings History DB not configured. Call /api/earnings/setup first.');

    const props = buildNotionProps(data, true);
    const result = await notionCreatePage(dbId, props);
    if (!result) throw new Error('Failed to create Notion page');

    const review = await this.getById(result.id);
    if (!review) throw new Error('Created page but failed to read it back');
    return review;
  }

  async update(id: string, data: EarningsReviewUpdate): Promise<EarningsReview | null> {
    const props = buildNotionProps(data);
    const ok = await notionUpdatePage(id, props);
    if (!ok) return null;
    return this.getById(id);
  }

  async delete(id: string): Promise<boolean> {
    const key = getNotionKey();
    if (!key) return false;

    try {
      const res = await fetch(`${NOTION_API}/pages/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${key}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ archived: true }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async searchByRelevance(query: string, symbol?: string, limit = 5): Promise<EarningsReview[]> {
    const dbId = getDbId();
    if (!dbId) return [];

    const filter: EarningsHistoryFilter = { limit: 100 };
    if (symbol) filter.symbol = symbol;

    const { items } = await this.list(filter);
    if (!query) return items.slice(0, limit);

    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);

    const scored = items.map((review) => {
      const text = [
        review.thesis,
        review.postReview,
        review.emotionalState,
        review.lessons.join(' '),
        review.setupType,
        review.symbol,
      ].join(' ').toLowerCase();

      let score = 0;
      for (const term of queryTerms) {
        if (text.includes(term)) score += 1;
      }
      return { review, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.review);
  }

  async ensureDatabase(): Promise<string> {
    const existing = getDbId();
    if (existing) return existing;

    const key = getNotionKey();
    if (!key) throw new Error('NOTION_API_KEY not set');

    // Use a parent page ID from env, or fall back to creating inline DB
    const parentPageId = (process.env as Record<string, string | undefined>).NOTION_PARENT_PAGE_ID;
    if (!parentPageId) {
      throw new Error(
        'NOTION_PARENT_PAGE_ID env var required to auto-create the Earnings History DB. ' +
        'Set it to any Notion page ID shared with the integration.'
      );
    }

    const schema: Record<string, object> = {
      'Symbol': { title: {} },
      'Earnings Date': { date: {} },
      'Setup Type': { select: { options: [
        { name: 'gap-fill' }, { name: 'breakout' }, { name: 'fade' },
        { name: 'momentum' }, { name: 'reversal' }, { name: 'other' },
      ] } },
      'Direction': { select: { options: [
        { name: 'long' }, { name: 'short' }, { name: 'flat' },
      ] } },
      'Entry Price': { number: { format: 'number' } },
      'Exit Price': { number: { format: 'number' } },
      'P&L': { number: { format: 'dollar' } },
      'Emotional State': { rich_text: {} },
      'Thesis': { rich_text: {} },
      'Post Review': { rich_text: {} },
      'Lessons': { rich_text: {} },
      'Grade': { select: { options: [
        { name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }, { name: 'F' },
      ] } },
      'Tags': { multi_select: { options: [] } },
    };

    const res = await fetch(`${NOTION_API}/databases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { type: 'page_id', page_id: parentPageId },
        title: [{ type: 'text', text: { content: 'Earnings Review History' } }],
        properties: schema,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to create Notion DB: ${res.status} ${err}`);
    }

    const json = await res.json() as { id: string };
    _dbId = json.id;
    console.log(`[Earnings] Auto-created Notion DB: ${json.id}`);
    console.log(`[Earnings] Add to .env: NOTION_EARNINGS_HISTORY_DB=${json.id}`);
    return json.id;
  }
}
