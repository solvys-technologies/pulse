// [claude-code 2026-03-10] FMP market data client — quotes, VIX, technicals, earnings calendar
import type { StockQuote, VixData } from './types.js';

const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

const getApiKey = (): string | undefined =>
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.FMP_API_KEY;

async function fmpFetch<T>(path: string): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('FMP_API_KEY not configured');

  const sep = path.includes('?') ? '&' : '?';
  const url = `${FMP_BASE}${path}${sep}apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw Object.assign(new Error(`FMP ${res.status}: ${body.slice(0, 200)}`), { status: res.status });
  }
  return res.json() as Promise<T>;
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  const data = await fmpFetch<any[]>(`/quote/${encodeURIComponent(symbol)}`);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No quote data for ${symbol}`);
  }
  const q = data[0];
  return {
    symbol: q.symbol ?? symbol,
    price: q.price ?? q.previousClose ?? 0,
    change: q.change ?? 0,
    changePercent: q.changesPercentage ?? 0,
    volume: q.volume ?? 0,
    marketCap: q.marketCap ?? undefined,
    pe: q.pe ?? undefined,
    timestamp: new Date().toISOString(),
  };
}

export async function getVix(): Promise<VixData> {
  // ^VIX must be URL-encoded as %5EVIX
  const data = await fmpFetch<any[]>('/quote/%5EVIX');
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('No VIX data returned from FMP');
  }
  const q = data[0];
  const value = q.price ?? q.previousClose;
  if (value == null) throw new Error('VIX quote missing price and previousClose');

  return {
    value,
    change: q.change ?? 0,
    changePercent: q.changesPercentage ?? 0,
    high: q.dayHigh ?? value,
    low: q.dayLow ?? value,
    previousClose: q.previousClose ?? value,
    timestamp: new Date().toISOString(),
    stale: q.price == null, // stale if we fell back to previousClose
  };
}

export async function getTechnicalIndicators(symbol: string, period = 14): Promise<any> {
  return fmpFetch<any>(`/technical_indicator/daily/${encodeURIComponent(symbol)}?period=${period}&type=rsi`);
}

export async function getEarningsCalendar(from?: string, to?: string): Promise<any[]> {
  const now = new Date();
  const defaultFrom = from ?? now.toISOString().slice(0, 10);
  const defaultTo = to ?? new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  return fmpFetch<any[]>(`/earning_calendar?from=${defaultFrom}&to=${defaultTo}`);
}
