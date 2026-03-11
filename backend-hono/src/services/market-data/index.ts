// [claude-code 2026-03-10] Unified market data interface — consumed by QuickPulse + Morning Brief
import * as fmpMarket from './fmp-market.js';
import * as unusualWhales from './unusual-whales.js';
import type { MarketContext } from './types.js';

/**
 * Get full market context for a symbol.
 * Used by QuickPulse skill and Morning Brief.
 * All providers are fetched in parallel; failures degrade gracefully.
 */
export async function getMarketContext(symbol: string): Promise<MarketContext> {
  const [quoteResult, vixResult, gexResult, wallsResult, flowResult] = await Promise.allSettled([
    fmpMarket.getQuote(symbol),
    fmpMarket.getVix(),
    unusualWhales.isAvailable() ? unusualWhales.getGammaExposure(symbol) : Promise.resolve(null),
    unusualWhales.isAvailable() ? unusualWhales.getOptionsWalls(symbol) : Promise.resolve(null),
    unusualWhales.isAvailable() ? unusualWhales.getOptionsFlow(symbol) : Promise.resolve(null),
  ]);

  return {
    quote: quoteResult.status === 'fulfilled' ? quoteResult.value : undefined,
    vix: vixResult.status === 'fulfilled' ? vixResult.value : undefined,
    gex: gexResult.status === 'fulfilled' && gexResult.value ? gexResult.value : undefined,
    walls: wallsResult.status === 'fulfilled' && wallsResult.value ? wallsResult.value : undefined,
    flow: flowResult.status === 'fulfilled' && flowResult.value ? flowResult.value : undefined,
    fetchedAt: new Date().toISOString(),
  };
}

export { fmpMarket, unusualWhales };
export * from './types.js';
