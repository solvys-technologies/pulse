// [claude-code 2026-03-10] Financial Juice emoji-tier filter — classifies posts by market impact level

export type FJTier = 'critical' | 'high' | 'medium' | 'low';
export type FJUrgency = 'immediate' | 'high' | 'normal';

export interface FJClassification {
  tier: FJTier;
  macroLevel: 1 | 2 | 3 | 4;
  urgency: FJUrgency;
  shouldInclude: boolean; // false for low-tier noise
}

/**
 * Financial Juice emoji-to-impact tier mapping.
 *
 * FJ posting conventions (confirmed from their feed):
 *   🔴 Red circle    — Critical: FOMC, NFP, CPI actual vs forecast, major geopolitical
 *   ⚠️  Warning      — High: Fed speakers, GDP, retail sales, important earnings
 *   🚨 Siren         — High: urgent market alerts
 *   🟡 Yellow circle — Medium: PMI, housing, jobless claims, sector news
 *   🟠 Orange circle — Medium: secondary macro data
 *   🔵 Blue circle   — Low: commentary / analysis → SKIP
 *   (none)           — Low: general noise → SKIP
 */
const EMOJI_TIERS: Array<{
  emoji: string;
  tier: FJTier;
  macroLevel: 1 | 2 | 3 | 4;
  urgency: FJUrgency;
}> = [
  { emoji: '🔴', tier: 'critical', macroLevel: 4, urgency: 'immediate' },
  { emoji: '⚠️', tier: 'high', macroLevel: 3, urgency: 'high' },
  { emoji: '🚨', tier: 'high', macroLevel: 3, urgency: 'high' },
  { emoji: '🟡', tier: 'medium', macroLevel: 2, urgency: 'normal' },
  { emoji: '🟠', tier: 'medium', macroLevel: 2, urgency: 'normal' },
];

const TIER_ORDER: Record<FJTier, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Classify a Financial Juice headline by its emoji prefix.
 * Returns shouldInclude=false for low/no-emoji posts (noise).
 */
export function classifyFJHeadline(text: string): FJClassification {
  for (const entry of EMOJI_TIERS) {
    if (text.includes(entry.emoji)) {
      return {
        tier: entry.tier,
        macroLevel: entry.macroLevel,
        urgency: entry.urgency,
        shouldInclude: true,
      };
    }
  }
  return { tier: 'low', macroLevel: 1, urgency: 'normal', shouldInclude: false };
}

/**
 * Filter an array of tweet-like objects to only those at minTier or above.
 * Objects must have a `text` property.
 */
export function filterByTier<T extends { text: string }>(
  items: T[],
  minTier: FJTier = 'medium'
): Array<T & { fjClassification: FJClassification }> {
  const minLevel = TIER_ORDER[minTier];
  return items
    .map((item) => ({ ...item, fjClassification: classifyFJHeadline(item.text) }))
    .filter(({ fjClassification }) => TIER_ORDER[fjClassification.tier] >= minLevel);
}
