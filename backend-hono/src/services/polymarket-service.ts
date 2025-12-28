/**
 * Polymarket Service
 * Fetches prediction market odds for macroeconomic events via CLOB API
 */

import { sql } from '../db/index.js';

// Base API URL
const CLOB_API_URL = 'https://clob.polymarket.com';

export type PolymarketMarketType =
  | 'tariffs'
  | 'rate_cuts'
  | 'rate_hikes'
  | 'recession'
  | 'bubble_crash'
  | 'ww3'
  | 'trump_impeachment'
  | 'supreme_court'
  | 'ai_regulation'
  | 'china_relations'
  | 'geopolitics'
  | 'mag7_stocks'
  | 'semiconductors';

// Mapping topics to search keywords for better API discovery
const TOPIC_KEYWORDS: Record<PolymarketMarketType, string[]> = {
  'tariffs': ['Tariff', 'Trade War', 'Trump Tariff'],
  'rate_cuts': ['Rate Cut', 'Fed Cut', 'FOMC'],
  'rate_hikes': ['Rate Hike', 'Fed Hike', 'Interest Rate'],
  'recession': ['Recession', 'US Recession', 'Hard Landing'],
  'bubble_crash': ['Market Crash', 'Bubble', 'S&P 500 Crash'],
  'ww3': ['World War 3', 'WW3', 'Nuclear'],
  'trump_impeachment': ['Impeachment', 'Trump Impeach'],
  'supreme_court': ['Supreme Court', 'SCOTUS'],
  'ai_regulation': ['AI', 'Artificial Intelligence', 'AGI', 'OpenAI'],
  'china_relations': ['China', 'Taiwan', 'US-China'],
  'geopolitics': ['Geopolitics', 'War', 'Conflict', 'Middle East'],
  'mag7_stocks': ['NVIDIA', 'NVDA', 'Apple', 'AAPL', 'Microsoft', 'MSFT', 'Amazon', 'AMZN', 'Google', 'GOOGL', 'Meta', 'Tesla', 'TSLA'],
  'semiconductors': ['AMD', 'TSM', 'SMCI', 'Broadcom', 'AVGO'],
};

export interface PolymarketOdds {
  marketId: string;
  marketType: PolymarketMarketType;
  question: string;
  yesOdds: number; // 0-1 probability
  noOdds: number; // 0-1 probability
  timestamp: string;
  slug: string;
}

export interface PolymarketUpdate {
  id: string;
  marketType: PolymarketMarketType;
  previousOdds: number;
  currentOdds: number;
  changePercentage: number;
  triggeredByNewsId?: string;
  timestamp: string;
}

interface ClobMarketResponse {
  condition_id: string;
  question: string;
  slug: string;
  tokens: { outcome: string; price: number }[];
  rewards: { min_size: number; max_spread: number }[];
  active: boolean;
  closed: boolean;
}

/**
 * Fetch markets from CLOB API searching by keywords
 * Uses proper pagination/filtering if available, otherwise filters client-side from recent/active
 */
async function findActiveMarkets(keywords: string[]): Promise<ClobMarketResponse[]> {
  try {
    // Since CLOB API /markets can be heavy, we try to be specific or limit results if possible.
    // The standard /markets endpoint returns a list.
    // We will fetch active markets and filter. 
    // Note: In a production heavily loaded system, we would cache the market list.

    const response = await fetch(`${CLOB_API_URL}/markets`);
    if (!response.ok) throw new Error(`CLOB API Error: ${response.status}`);

    const data = await response.json() as any;
    const allMarkets = (data.data || data) as any[]; // API structure varies, handle both

    // Filter for active markets matching ANY keyword
    return allMarkets.filter((m: any) => {
      if (!m.active || m.closed) return false;
      const text = (m.question + ' ' + (m.slug || '')).toLowerCase();
      return keywords.some(k => text.includes(k.toLowerCase()));
    }).slice(0, 5); // Limit to top 5 matches per topic to avoid noise

  } catch (error) {
    console.error('Failed to search Polymarket markets:', error);
    return [];
  }
}

/**
 * Fetch detailed price (mid-market or last trade) for a specific market
 * For "Yes" token usually.
 */
async function getMarketPrice(conditionId: string): Promise<number> {
  try {
    // Fetch orderbook or simple price endpoint
    // Using /markets/{id} usually returns the token prices directly in some versions,
    // or we check the orderbook. Let's rely on the token price from the market list if available,
    // otherwise fetch orderbook.
    // Simpler: Use the /markets/{id} endpoint which often has cached 'last' or 'mid' price.

    const response = await fetch(`${CLOB_API_URL}/markets/${conditionId}`);
    if (!response.ok) return 0;

    const data = await response.json() as any;
    // Parse "Yes" token price. Usually tokens[0] is Yes or Long? match by outcome name.
    /* 
     Structure usually: 
     tokens: [{ token_id: "...", outcome: "Yes", price: 0.65 }, { ... outcome: "No" ... }]
    */
    const yesToken = data.tokens?.find((t: any) => t.outcome === 'Yes');
    return yesToken ? Number(yesToken.price) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Fetch Polymarket odds for a specific market type
 * Queries API for relevant markets and picks the most liquid/relevant one.
 */
export async function fetchPolymarketOdds(
  marketType: PolymarketMarketType
): Promise<PolymarketOdds | null> {
  try {
    const keywords = TOPIC_KEYWORDS[marketType];
    const candidateMarkets = await findActiveMarkets(keywords);

    if (candidateMarkets.length === 0) return null;

    // Heuristic: Pick the market with the shortest question (usually the main one) or highest liquidity if available.
    // For now, take the first one.
    const market = candidateMarkets[0];

    // The market list object itself often contains the "Yes" price in the token array, 
    // depending on the exact API response version.
    // Let's assume we need to parse it from the 'tokens' array in the market object.
    let yesPrice = 0;
    let noPrice = 0;

    if (Array.isArray(market.tokens)) {
      const yes = market.tokens.find((t: any) => t.outcome === 'Yes');
      const no = market.tokens.find((t: any) => t.outcome === 'No');
      yesPrice = yes ? Number(yes.price) : 0;
      noPrice = no ? Number(no.price) : 0;
    }

    if (yesPrice === 0 && noPrice === 0) {
      // Fallback: try fetching details specifically
      yesPrice = await getMarketPrice(market.condition_id);
      noPrice = 1 - yesPrice;
    }

    const odds: PolymarketOdds = {
      marketId: market.condition_id,
      marketType: marketType,
      question: market.question,
      slug: market.slug,
      yesOdds: yesPrice,
      noOdds: noPrice,
      timestamp: new Date().toISOString()
    };

    // Save snapshot to DB
    await saveMarketSnapshot(odds);

    return odds;

  } catch (error) {
    console.error(`Failed to fetch Polymarket odds for ${marketType}:`, error);
    return null;
  }
}

/**
 * Save snapshot to database
 */
async function saveMarketSnapshot(odds: PolymarketOdds) {
  try {
    await sql`
            INSERT INTO polymarket_history (market_id, yes_price, timestamp)
            VALUES (${odds.marketId}, ${odds.yesOdds}, NOW())
        `;
  } catch (e) {
    console.error('Failed to save polymarket snapshot:', e);
  }
}

/**
 * Fetch all Polymarket odds for tracked markets
 */
export async function fetchAllPolymarketOdds(): Promise<PolymarketOdds[]> {
  const marketTypes: PolymarketMarketType[] = [
    'tariffs',
    'rate_cuts',
    'rate_hikes',
    'recession',
    'bubble_crash',
    'ww3',
    'trump_impeachment',
    'supreme_court',
    'ai_regulation',
    'china_relations',
    'geopolitics',
    'mag7_stocks',
    'semiconductors'
  ];

  const results = await Promise.all(marketTypes.map(type => fetchPolymarketOdds(type)));
  return results.filter((odds): odds is PolymarketOdds => odds !== null);
}

/**
 * Check for significant odds changes (>5% threshold) using DB history
 */
export async function checkSignificantChanges(
  currentOdds: PolymarketOdds
): Promise<{ hasChange: boolean; changePercentage: number; previousOdds: number }> {
  try {
    // Get snapshot from ~60 mins ago
    const rows = await sql`
            SELECT yes_price FROM polymarket_history
            WHERE market_id = ${currentOdds.marketId}
            AND timestamp > NOW() - INTERVAL '65 minutes'
            AND timestamp < NOW() - INTERVAL '55 minutes'
            ORDER BY timestamp DESC
            LIMIT 1
        `;

    if (rows.length === 0) {
      // Try getting the oldest record if < 60 mins exist
      const oldRows = await sql`
                SELECT yes_price FROM polymarket_history
                WHERE market_id = ${currentOdds.marketId}
                ORDER BY timestamp ASC
                LIMIT 1
            `;
      if (oldRows.length === 0) return { hasChange: false, changePercentage: 0, previousOdds: 0 };

      const prev = oldRows[0].yes_price;
      const change = Math.abs(currentOdds.yesOdds - prev);
      return { hasChange: change > 0.05, changePercentage: change * 100, previousOdds: prev };
    }

    const prev = rows[0].yes_price;
    const change = Math.abs(currentOdds.yesOdds - prev);

    return {
      hasChange: change > 0.05,
      changePercentage: change * 100,
      previousOdds: prev
    };

  } catch (e) {
    console.error('Error checking significant changes:', e);
    return { hasChange: false, changePercentage: 0, previousOdds: 0 };
  }
}

/**
 * Create a Polymarket update record
 */
export function createPolymarketUpdate(
  marketType: PolymarketMarketType,
  previousOdds: number,
  currentOdds: number,
  triggeredByNewsId?: string
): PolymarketUpdate {
  const changePercentage = Math.abs(currentOdds - previousOdds) * 100;

  return {
    id: `${marketType}_${Date.now()}`,
    marketType,
    previousOdds,
    currentOdds,
    changePercentage,
    triggeredByNewsId,
    timestamp: new Date().toISOString(),
  };
}
