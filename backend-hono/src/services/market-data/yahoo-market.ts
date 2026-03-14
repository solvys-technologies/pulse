// [claude-code 2026-03-14] Yahoo Finance market data client — replaces FMP
// No API key needed. Uses Yahoo Finance v8 chart API.
import type { StockQuote, VixData } from './types.js';

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

async function yahooFetch(symbol: string): Promise<any> {
  const url = `${YAHOO_BASE}/${encodeURIComponent(symbol)}?range=1d&interval=1m`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo data for ${symbol}`);
  return result;
}

export async function getQuote(symbol: string): Promise<StockQuote> {
  const result = await yahooFetch(symbol);
  const meta = result.meta;
  const price = meta?.regularMarketPrice ?? 0;
  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? price;
  const change = price - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol: meta?.symbol ?? symbol,
    price,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: meta?.regularMarketVolume ?? 0,
    timestamp: new Date().toISOString(),
  };
}

export async function getVix(): Promise<VixData> {
  const result = await yahooFetch('%5EVIX');
  const meta = result.meta;
  const value = meta?.regularMarketPrice;
  if (value == null) throw new Error('VIX quote missing price');

  const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? value;
  const change = value - prevClose;
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

  return {
    value,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    high: meta?.regularMarketDayHigh ?? value,
    low: meta?.regularMarketDayLow ?? value,
    previousClose: prevClose,
    timestamp: new Date().toISOString(),
    stale: false,
  };
}
