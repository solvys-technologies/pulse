// [claude-code 2026-03-05] Nightly cron: enriches Economic Events DB with FMP actuals → writes to Econ Prints DB.

import { fetchEconCalendar, writeEconPrint, updateEventActual } from '../econ-calendar-service.js';
import { createFmpService } from '../fmp-service.js';
import { injectEconPrintToFeed } from '../riskflow/econ-bridge.js';

const ENRICHER_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INTRADAY_CHECK_MS = 5 * 60 * 1000; // 5 min during market hours
let enricherTimer: ReturnType<typeof setInterval> | null = null;
let intradayTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Nightly enrichment: fetch today's calendar events, cross-ref FMP for actuals,
 * write prints to Econ Prints DB and update the event row's Actual field.
 */
export async function runEconEnrichment(): Promise<{ processed: number; written: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const fmp = createFmpService();
  let processed = 0;
  let written = 0;

  try {
    // Get today's events from Notion
    const events = await fetchEconCalendar({ from: today, to: today });
    if (!events.length) {
      console.log('[EconEnricher] No events for today');
      return { processed: 0, written: 0 };
    }

    // Get FMP prints for cross-reference
    const fmpData = await fmp.getLatestPrints();
    const fmpEvents = fmpData?.events ?? [];

    for (const event of events) {
      processed++;
      // Skip events that already have actuals
      if (event.actual) continue;

      // Try to match FMP event by name (fuzzy)
      const fmpMatch = fmpEvents.find((f) =>
        f.name.toLowerCase().includes(event.name.toLowerCase().slice(0, 10)) ||
        event.name.toLowerCase().includes(f.name.toLowerCase().slice(0, 10))
      );

      if (!fmpMatch || fmpMatch.actual == null) continue;

      // Write print to Econ Prints DB
      const result = await writeEconPrint({
        eventName: event.name,
        date: today,
        actual: fmpMatch.actual,
        forecast: fmpMatch.forecast ?? undefined,
        previous: fmpMatch.previous ?? undefined,
      });

      if (result) {
        written++;
        // Also update the Economic Events row with the actual
        await updateEventActual(event.id, String(fmpMatch.actual));
        // Inject into RiskFlow feed for IV scoring engine
        await injectEconPrintToFeed({
          eventName: event.name,
          actual: fmpMatch.actual,
          forecast: fmpMatch.forecast ?? undefined,
          previous: fmpMatch.previous ?? undefined,
          date: today,
        }).catch((err) => console.error('[EconEnricher] Bridge inject error:', err));
        console.log(`[EconEnricher] Wrote print: ${event.name} = ${fmpMatch.actual}`);
      }
    }

    console.log(`[EconEnricher] Done: ${processed} processed, ${written} written`);
  } catch (err) {
    console.error('[EconEnricher] Enrichment error:', err);
  }

  return { processed, written };
}

/** Check if we're in US market hours (8:00-17:00 ET) */
function isMarketHours(): boolean {
  const now = new Date();
  const etHour = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours();
  return etHour >= 8 && etHour <= 17;
}

/**
 * Start the enricher with two modes:
 * - Intraday (every 5 min during market hours): catch hot prints as they drop
 * - Nightly (every 24h): final sweep for any missed actuals
 */
export function startEconEnricher(): void {
  console.log('[EconEnricher] Starting enrichment scheduler');

  // Nightly sweep
  enricherTimer = setInterval(() => {
    runEconEnrichment().catch((err) => console.error('[EconEnricher] Nightly error:', err));
  }, ENRICHER_INTERVAL_MS);

  // Intraday checks during market hours
  intradayTimer = setInterval(() => {
    if (isMarketHours()) {
      runEconEnrichment().catch((err) => console.error('[EconEnricher] Intraday error:', err));
    }
  }, INTRADAY_CHECK_MS);

  // Run once on startup
  runEconEnrichment().catch((err) => console.error('[EconEnricher] Initial run error:', err));
}

export function stopEconEnricher(): void {
  if (enricherTimer) { clearInterval(enricherTimer); enricherTimer = null; }
  if (intradayTimer) { clearInterval(intradayTimer); intradayTimer = null; }
}
