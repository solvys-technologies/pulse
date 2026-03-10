// [claude-code 2026-03-10] Frontend mirror of backend market-data types

export type MarketDataProvider = 'fmp' | 'unusual-whales' | 'yahoo-finance';

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  timestamp: string;
}

export interface VixData {
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: string;
  stale?: boolean;
}

export interface GammaExposure {
  symbol: string;
  netGex: number;
  callGex: number;
  putGex: number;
  gexFlip: number;
  timestamp: string;
}

export interface OptionsWall {
  symbol: string;
  putWalls: Array<{ strike: number; volume: number; oi: number; notional: number }>;
  callWalls: Array<{ strike: number; volume: number; oi: number; notional: number }>;
  maxPain: number;
  timestamp: string;
}

export interface OptionsFlowItem {
  type: 'call' | 'put';
  strike: number;
  expiry: string;
  premium: number;
  volume: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  unusual: boolean;
}

export interface OptionsFlow {
  symbol: string;
  items: OptionsFlowItem[];
  netPremium: number;
  putCallRatio: number;
  timestamp: string;
}

export interface MarketContext {
  vix?: VixData;
  gex?: GammaExposure;
  walls?: OptionsWall;
  flow?: OptionsFlow;
  quote?: StockQuote;
  fetchedAt: string;
}
