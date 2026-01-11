/**
 * Market Service
 * Business logic for market data operations
 */

export interface VixData {
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  timestamp: string;
  source: 'fmp' | 'mock';
  stale?: boolean; // Flag indicating data may be stale (e.g., market closed)
}

export interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  source: 'fmp' | 'mock';
}

// Cache for VIX data (1 minute TTL)
let vixCache: { data: VixData; expiresAt: number } | null = null;
const VIX_CACHE_TTL_MS = 60_000;

// FMP API configuration
const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api/v3';

/**
 * Fetch VIX data from FMP API
 */
async function fetchVixFromFmp(): Promise<VixData | null> {
  if (!FMP_API_KEY) {
    console.error('[Market] FMP_API_KEY not set - cannot fetch real VIX');
    return null;
  }

  try {
    const url = `${FMP_BASE_URL}/quote/%5EVIX?apikey=${FMP_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('[Market] FMP API error:', response.status, response.statusText);
      return null;
    }

    const data = await response.json();

    // Handle empty response (market may be closed)
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[Market] FMP returned empty data (market may be closed)');
      return null;
    }

    const quote = data[0];
    
    // If price is null/undefined, try previousClose (market closed scenario)
    const vixValue = quote.price ?? quote.previousClose;
    if (vixValue === null || vixValue === undefined) {
      console.warn('[Market] FMP quote missing price and previousClose');
      return null;
    }

    return {
      symbol: 'VIX',
      value: vixValue,
      change: quote.change ?? 0,
      changePercent: quote.changesPercentage ?? 0,
      timestamp: new Date().toISOString(),
      source: 'fmp',
      stale: quote.price === null || quote.price === undefined, // Mark as stale if using previousClose
    };
  } catch (error) {
    console.error('[Market] FMP fetch failed:', error);
    return null;
  }
}

/**
 * Get current VIX value
 * Uses FMP API with fallback to cached data when market is closed
 */
export async function getVix(): Promise<VixData> {
  // Check cache first (if still valid)
  if (vixCache && Date.now() < vixCache.expiresAt) {
    return vixCache.data;
  }

  // Try to fetch from FMP
  const fmpData = await fetchVixFromFmp();

  if (fmpData) {
    vixCache = {
      data: fmpData,
      expiresAt: Date.now() + VIX_CACHE_TTL_MS,
    };
    return fmpData;
  }

  // If FMP fetch failed but we have cached data, return it with stale flag
  // This handles market closed scenarios gracefully
  if (vixCache) {
    console.warn('[Market] FMP unavailable, returning cached VIX data (may be stale)');
    return {
      ...vixCache.data,
      stale: true,
    };
  }

  // No cache and FMP failed - this is a real error
  throw new Error('VIX data unavailable (FMP_API_KEY missing or fetch failed, no cache available)');
}

/**
 * Get quote for a symbol (placeholder implementation)
 * Will be expanded in future phases
 */
export async function getQuote(symbol: string): Promise<QuoteData> {
  // For now, return mock data
  // TODO: Integrate with FMP API for real quotes
  const basePrice = 100 + Math.random() * 50;
  const change = (Math.random() * 4 - 2);
  const changePercent = (change / basePrice) * 100;

  return {
    symbol,
    price: Math.round(basePrice * 100) / 100,
    change: Math.round(change * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    volume: Math.floor(Math.random() * 1_000_000),
    timestamp: new Date().toISOString(),
    source: 'mock',
  };
}
