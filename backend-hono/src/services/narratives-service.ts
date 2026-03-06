// [claude-code 2026-03-06] Narratives service — CRUD for market narratives stored in Notion
import {
  notionQuery,
  notionCreatePage,
  notionUpdatePage,
  extractPropValue,
  getPropByAlias,
  toText,
} from './notion-service.js';

// Narratives DB — set via env or fill in after manual creation
export const NARRATIVES_DB = process.env.NOTION_NARRATIVES_DB ?? '';

/*
 * NOTION DB SCHEMA — "Narratives"
 * Create manually in Notion with these properties:
 *   Title        (title)        — narrative name, e.g. "Fed Rate Cut Delay"
 *   Tags         (multi_select) — shared tags, e.g. "rates", "inflation"
 *   Week         (select)       — ISO week, e.g. "2026-W10"
 *   Volatility   (select)       — "low" | "gaining" | "hot"
 *   Instruments  (multi_select) — tickers affected, e.g. "NQ", "ES"
 *   Catalysts    (rich_text)    — what could trigger movement
 *   Status       (status)       — Active | Resolved | Watching
 *   Impact       (number)       — 1-10 severity score
 *   Connections  (relation)     — self-relation to link narratives
 *   Created      (created_time)
 *   Updated      (last_edited_time)
 */

export type NarrativeVolatility = 'low' | 'gaining' | 'hot';
export type NarrativeStatus = 'Active' | 'Resolved' | 'Watching';

export interface Narrative {
  id: string;
  title: string;
  tags: string[];
  week: string;
  volatility: NarrativeVolatility;
  instruments: string[];
  catalysts: string;
  status: NarrativeStatus;
  impact: number;
  connections: string[];
  notionUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNarrativeInput {
  title: string;
  tags?: string[];
  week: string;
  volatility?: NarrativeVolatility;
  instruments?: string[];
  catalysts?: string;
  status?: NarrativeStatus;
  impact?: number;
}

export interface UpdateNarrativeInput {
  title?: string;
  tags?: string[];
  week?: string;
  volatility?: NarrativeVolatility;
  instruments?: string[];
  catalysts?: string;
  status?: NarrativeStatus;
  impact?: number;
}

// Property name aliases for resilient field lookup
const TITLE_ALIASES = ['Title', 'Name', 'Narrative'];
const TAGS_ALIASES = ['Tags', 'Tag', 'Labels'];
const WEEK_ALIASES = ['Week', 'Trading Week'];
const VOL_ALIASES = ['Volatility', 'Vol', 'Heat'];
const INSTRUMENTS_ALIASES = ['Instruments', 'Tickers', 'Symbols'];
const CATALYSTS_ALIASES = ['Catalysts', 'Catalyst', 'Triggers'];
const STATUS_ALIASES = ['Status', 'State'];
const IMPACT_ALIASES = ['Impact', 'Severity', 'Score'];
const CONNECTIONS_ALIASES = ['Connections', 'Related', 'Links'];

function parseMultiSelect(prop: any): string[] {
  if (!prop || prop.type !== 'multi_select') return [];
  return (prop.multi_select ?? []).map((s: any) => s.name);
}

function parseRelation(prop: any): string[] {
  if (!prop || prop.type !== 'relation') return [];
  return (prop.relation ?? []).map((r: any) => r.id);
}

function parseNarrative(page: any): Narrative {
  const title = toText(extractPropValue(getPropByAlias(page, TITLE_ALIASES)));
  const tags = parseMultiSelect(getPropByAlias(page, TAGS_ALIASES));
  const week = toText(extractPropValue(getPropByAlias(page, WEEK_ALIASES)));
  const volRaw = toText(extractPropValue(getPropByAlias(page, VOL_ALIASES))).toLowerCase();
  const volatility: NarrativeVolatility =
    volRaw === 'hot' ? 'hot' : volRaw === 'gaining' ? 'gaining' : 'low';
  const instruments = parseMultiSelect(getPropByAlias(page, INSTRUMENTS_ALIASES));
  const catalysts = toText(extractPropValue(getPropByAlias(page, CATALYSTS_ALIASES)));
  const statusRaw = toText(extractPropValue(getPropByAlias(page, STATUS_ALIASES)));
  const status: NarrativeStatus =
    statusRaw === 'Resolved' ? 'Resolved' : statusRaw === 'Watching' ? 'Watching' : 'Active';
  const impactRaw = extractPropValue(getPropByAlias(page, IMPACT_ALIASES));
  const impact = typeof impactRaw === 'number' ? impactRaw : 5;
  const connections = parseRelation(getPropByAlias(page, CONNECTIONS_ALIASES));

  return {
    id: page.id,
    title: title || 'Untitled Narrative',
    tags,
    week: week || currentWeek(),
    volatility,
    instruments,
    catalysts,
    status,
    impact,
    connections,
    notionUrl: page.url ?? '',
    createdAt: page.created_time ?? new Date().toISOString(),
    updatedAt: page.last_edited_time ?? new Date().toISOString(),
  };
}

/** ISO week string for the current date, e.g. "2026-W10" */
export function currentWeek(): string {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((now.getTime() - jan4.getTime()) / 86400000) + jan4.getDay();
  const weekNum = Math.ceil(dayOfYear / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export async function queryNarratives(week?: string): Promise<Narrative[]> {
  if (!NARRATIVES_DB) {
    console.warn('[Narratives] NOTION_NARRATIVES_DB not set — returning empty');
    return [];
  }
  try {
    const filter = week
      ? { property: 'Week', select: { equals: week } }
      : undefined;
    const pages = await notionQuery(NARRATIVES_DB, {
      filter,
      sorts: [{ property: 'Impact', direction: 'descending' }],
      pageSize: 50,
    });
    return pages.map(parseNarrative);
  } catch (err) {
    console.error('[Narratives] queryNarratives error:', err);
    return [];
  }
}

export async function getNarrativeById(id: string): Promise<Narrative | null> {
  if (!NARRATIVES_DB) return null;
  try {
    const key = process.env.NOTION_API_KEY;
    if (!key) return null;
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Notion-Version': '2022-06-28',
      },
    });
    if (!res.ok) return null;
    const page = await res.json();
    return parseNarrative(page);
  } catch (err) {
    console.error('[Narratives] getNarrativeById error:', err);
    return null;
  }
}

function buildProperties(input: CreateNarrativeInput | UpdateNarrativeInput, isCreate = false): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  if ('title' in input && input.title !== undefined) {
    props['Title'] = { title: [{ text: { content: input.title } }] };
  }
  if (input.tags !== undefined) {
    props['Tags'] = { multi_select: input.tags.map((t) => ({ name: t })) };
  }
  if ('week' in input && input.week !== undefined) {
    props['Week'] = { select: { name: input.week } };
  }
  if (input.volatility !== undefined) {
    props['Volatility'] = { select: { name: input.volatility } };
  }
  if (input.instruments !== undefined) {
    props['Instruments'] = { multi_select: input.instruments.map((i) => ({ name: i })) };
  }
  if (input.catalysts !== undefined) {
    props['Catalysts'] = { rich_text: [{ text: { content: input.catalysts } }] };
  }
  if (input.status !== undefined) {
    props['Status'] = { status: { name: input.status } };
  }
  if (input.impact !== undefined) {
    props['Impact'] = { number: input.impact };
  }

  // Defaults for create
  if (isCreate) {
    if (!props['Week']) {
      props['Week'] = { select: { name: currentWeek() } };
    }
    if (!props['Volatility']) {
      props['Volatility'] = { select: { name: 'low' } };
    }
    if (!props['Status']) {
      props['Status'] = { status: { name: 'Active' } };
    }
    if (!props['Impact']) {
      props['Impact'] = { number: 5 };
    }
  }

  return props;
}

export async function createNarrative(input: CreateNarrativeInput): Promise<Narrative | null> {
  if (!NARRATIVES_DB) {
    console.error('[Narratives] NOTION_NARRATIVES_DB not set');
    return null;
  }
  const properties = buildProperties(input, true);
  const result = await notionCreatePage(NARRATIVES_DB, properties);
  if (!result) return null;
  return getNarrativeById(result.id);
}

export async function updateNarrative(id: string, input: UpdateNarrativeInput): Promise<boolean> {
  if (!NARRATIVES_DB) return false;
  const properties = buildProperties(input);
  if (Object.keys(properties).length === 0) return true;
  return notionUpdatePage(id, properties);
}
