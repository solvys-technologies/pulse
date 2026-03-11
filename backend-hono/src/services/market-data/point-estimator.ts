// [claude-code 2026-03-11] Point estimator — translates blended IV score to implied point moves
// Uses Rule of 16 + instrument betas from iv-scoring-v2.

import { calculateImpliedPoints, getInstrumentConfig, type ImpliedPoints } from '../iv-scoring-v2.js';

export interface PointEstimate {
  /** The blended IV score this estimate is based on */
  ivScore: number;
  /** Implied daily points move from VIX via Rule of 16 */
  implied: ImpliedPoints;
  /** Score-scaled estimate: what fraction of the daily move this score implies */
  scaledPoints: number;
  /** Ticks on the instrument */
  scaledTicks: number;
  /** Dollar risk per contract at this level */
  scaledDollarRisk: number;
  /** Urgency label */
  urgency: 'low' | 'moderate' | 'elevated' | 'high' | 'extreme';
}

/**
 * Map IV score (0-10) to urgency label
 */
function scoreToUrgency(score: number): PointEstimate['urgency'] {
  if (score <= 2) return 'low';
  if (score <= 4) return 'moderate';
  if (score <= 6) return 'elevated';
  if (score <= 8) return 'high';
  return 'extreme';
}

/**
 * Estimate implied point move for a given IV score and VIX level.
 * The score scales the daily implied move: score/10 * implied daily move.
 */
export function estimatePoints(
  ivScore: number,
  vixLevel: number,
  instrument: string = '/ES',
  currentPrice?: number,
): PointEstimate {
  const config = getInstrumentConfig(instrument);
  const price = currentPrice ?? config?.currentPrice ?? 6000;

  const implied = calculateImpliedPoints(vixLevel, price, instrument);

  // Scale: the IV score represents what fraction of daily implied move is "active"
  const scaleFactor = Math.min(1, ivScore / 10);
  const scaledPoints = Number((implied.adjustedPoints * scaleFactor).toFixed(1));
  const scaledTicks = Math.round(implied.adjustedTicks * scaleFactor);
  const tickValue = config?.tickValue ?? 1;
  const scaledDollarRisk = Number((scaledTicks * tickValue).toFixed(2));

  return {
    ivScore,
    implied,
    scaledPoints,
    scaledTicks,
    scaledDollarRisk,
    urgency: scoreToUrgency(ivScore),
  };
}
