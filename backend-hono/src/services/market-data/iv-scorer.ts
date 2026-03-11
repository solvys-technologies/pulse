// [claude-code 2026-03-11] Blended IV score service — 60% VIX + 40% headline heat
// Provides a single 0-10 composite score for the /api/market-data/iv-score endpoint.

import { fetchVIX, type VIXData } from '../vix-service.js';
import { calculateIVScoreV2, classifyEventType, type StackedEvent } from '../iv-scoring-v2.js';

export interface BlendedIVScore {
  /** Composite 0-10 score (60% VIX component + 40% headline component) */
  score: number;
  /** VIX-only component score (0-10) */
  vixComponent: number;
  /** Headline-only component score (0-10) */
  headlineComponent: number;
  /** Weight breakdown */
  weights: { vix: number; headlines: number };
  /** VIX snapshot */
  vix: {
    level: number;
    percentChange: number;
    isSpike: boolean;
    spikeDirection: 'up' | 'down' | 'none';
    staleMinutes: number;
  };
  /** Headline event count used */
  eventCount: number;
  /** Human-readable rationale lines */
  rationale: string[];
  timestamp: string;
}

const VIX_WEIGHT = 0.6;
const HEADLINE_WEIGHT = 0.4;

/**
 * Map VIX level to a 0-10 score.
 * VIX 10 → ~2, VIX 15 → ~3, VIX 20 → ~5, VIX 30 → ~7, VIX 40 → ~8.5, VIX 50+ → 10
 */
function vixToScore(vix: number): number {
  if (vix <= 0) return 0;
  if (vix >= 50) return 10;
  // Piecewise linear: [10→2, 15→3, 20→5, 30→7, 40→8.5, 50→10]
  const breakpoints = [
    { vix: 10, score: 2 },
    { vix: 15, score: 3 },
    { vix: 20, score: 5 },
    { vix: 30, score: 7 },
    { vix: 40, score: 8.5 },
    { vix: 50, score: 10 },
  ];
  if (vix <= breakpoints[0].vix) return breakpoints[0].score * (vix / breakpoints[0].vix);
  for (let i = 1; i < breakpoints.length; i++) {
    if (vix <= breakpoints[i].vix) {
      const prev = breakpoints[i - 1];
      const curr = breakpoints[i];
      const t = (vix - prev.vix) / (curr.vix - prev.vix);
      return prev.score + t * (curr.score - prev.score);
    }
  }
  return 10;
}

/**
 * Calculate a blended IV score: 60% VIX + 40% headline heat.
 * Headline heat comes from the V2 scoring engine applied to recent DB events.
 */
export async function calculateBlendedIVScore(
  recentEvents: StackedEvent[],
  instrument: string = '/ES',
  currentPrice?: number,
): Promise<BlendedIVScore> {
  const rationale: string[] = [];

  // Fetch VIX
  const vixData = await fetchVIX();
  const vixScore = vixToScore(vixData.level);
  rationale.push(`VIX ${vixData.level.toFixed(1)} → component score ${vixScore.toFixed(1)}/10`);

  // Headline component via V2 engine
  let headlineScore = 0;
  if (recentEvents.length > 0) {
    const v2Result = calculateIVScoreV2({
      events: recentEvents,
      vixLevel: vixData.level,
      previousVixLevel: vixData.previousLevel,
      vixUpdateMinutes: vixData.staleMinutes,
      currentPrice: currentPrice ?? 6000,
      instrument,
      isMarketClosed: false,
    });
    headlineScore = v2Result.score;
    rationale.push(`${recentEvents.length} headline events → component score ${headlineScore.toFixed(1)}/10`);
  } else {
    rationale.push('No recent headline events → headline component 0');
  }

  // Blend
  const blended = vixScore * VIX_WEIGHT + headlineScore * HEADLINE_WEIGHT;
  const clamped = Math.min(10, Math.max(0, Number(blended.toFixed(1))));
  rationale.push(`Blended: (${vixScore.toFixed(1)} × ${VIX_WEIGHT}) + (${headlineScore.toFixed(1)} × ${HEADLINE_WEIGHT}) = ${clamped}`);

  return {
    score: clamped,
    vixComponent: Number(vixScore.toFixed(1)),
    headlineComponent: Number(headlineScore.toFixed(1)),
    weights: { vix: VIX_WEIGHT, headlines: HEADLINE_WEIGHT },
    vix: {
      level: vixData.level,
      percentChange: vixData.percentChange,
      isSpike: vixData.isSpike,
      spikeDirection: vixData.spikeDirection,
      staleMinutes: vixData.staleMinutes,
    },
    eventCount: recentEvents.length,
    rationale,
    timestamp: new Date().toISOString(),
  };
}

/** Re-export classifyEventType for handler use */
export { classifyEventType };
