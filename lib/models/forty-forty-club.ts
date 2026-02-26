// ============================================================================
// 40/40 Club Trading Model — PIC Playbook
// ============================================================================
// Entry: Price within 40 ticks of key level AND 40%+ daily volume at that level
// Confirmation: 20 EMA over 100 EMA (bullish) or under (bearish) on 15-min
// Timeframe: 15-min anchor, 5-min entry
// Instruments: /MNQ primary, /ES confirmation
// Risk: 1-2R targets, pre-defined stop
// ============================================================================

export type Instrument = '/MNQ' | '/ES';
export type Direction = 'long' | 'short';
export type ModelStatus = 'scanning' | 'setup_found' | 'active_trade' | 'idle';
export type Timeframe = '5m' | '15m';
export type EMAAlignment = 'bullish' | 'bearish' | 'neutral';

export interface FortyFortySetup {
  instrument: Instrument;
  direction: Direction;
  keyLevel: number;
  currentPrice: number;
  ticksFromLevel: number;
  volumeAtLevel: number; // percentage 0-100
  emaAlignment: EMAAlignment;
  timeframe: Timeframe;
  confidence: number; // 0-100
  entryZone: { low: number; high: number };
  stopLoss: number;
  targets: { r1: number; r2: number };
}

export interface MarketData {
  instrument: Instrument;
  currentPrice: number;
  keyLevels: number[];
  volumeProfile: Map<number, number> | Record<number, number>; // level -> % of daily volume
  ema20: number;
  ema100: number;
  timeframe: Timeframe;
  timestamp: number;
}

export interface RiskCalculation {
  positionSize: number;
  riskAmount: number;
  riskPercent: number;
  rewardR1: number;
  rewardR2: number;
  rrRatio: number;
}

// ---------------------------------------------------------------------------
// Tick sizes per instrument
// ---------------------------------------------------------------------------
const TICK_SIZE: Record<Instrument, number> = {
  '/MNQ': 0.25,
  '/ES': 0.25,
};

const TICK_VALUE: Record<Instrument, number> = {
  '/MNQ': 0.50, // $0.50 per tick
  '/ES': 12.50, // $12.50 per tick
};

// ---------------------------------------------------------------------------
// Core evaluation
// ---------------------------------------------------------------------------
export function evaluateSetup(marketData: MarketData): FortyFortySetup | null {
  const { instrument, currentPrice, keyLevels, volumeProfile, ema20, ema100, timeframe } = marketData;
  const tickSize = TICK_SIZE[instrument];

  // Find nearest key level
  let nearestLevel = keyLevels[0];
  let minDistance = Math.abs(currentPrice - keyLevels[0]);
  for (const level of keyLevels) {
    const dist = Math.abs(currentPrice - level);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLevel = level;
    }
  }

  const ticksFromLevel = Math.round(minDistance / tickSize);

  // Check 40 tick condition
  if (ticksFromLevel > 40) return null;

  // Check volume condition (40%+ at that level)
  const volMap = volumeProfile instanceof Map ? volumeProfile : new Map(Object.entries(volumeProfile).map(([k, v]) => [Number(k), v]));
  const volumeAtLevel = volMap.get(nearestLevel) ?? 0;
  if (volumeAtLevel < 40) return null;

  // EMA alignment
  const emaAlignment: EMAAlignment =
    ema20 > ema100 ? 'bullish' : ema20 < ema100 ? 'bearish' : 'neutral';

  if (emaAlignment === 'neutral') return null;

  const direction: Direction = emaAlignment === 'bullish' ? 'long' : 'short';

  // Calculate entry zone, stop, targets
  const buffer = tickSize * 5; // 5-tick buffer
  const stopDistance = tickSize * 20; // 20-tick stop
  const r1Distance = stopDistance * 1; // 1R
  const r2Distance = stopDistance * 2; // 2R

  let entryZone: { low: number; high: number };
  let stopLoss: number;
  let targets: { r1: number; r2: number };

  if (direction === 'long') {
    entryZone = { low: nearestLevel - buffer, high: nearestLevel + buffer };
    stopLoss = nearestLevel - stopDistance;
    targets = { r1: nearestLevel + r1Distance, r2: nearestLevel + r2Distance };
  } else {
    entryZone = { low: nearestLevel - buffer, high: nearestLevel + buffer };
    stopLoss = nearestLevel + stopDistance;
    targets = { r1: nearestLevel - r1Distance, r2: nearestLevel - r2Distance };
  }

  // Confidence: based on ticks proximity + volume concentration + EMA strength
  const proximityScore = Math.max(0, (40 - ticksFromLevel) / 40) * 40;
  const volumeScore = Math.min(volumeAtLevel, 80) / 80 * 40;
  const emaSpread = Math.abs(ema20 - ema100);
  const emaScore = Math.min(emaSpread / (tickSize * 20), 1) * 20;
  const confidence = Math.round(proximityScore + volumeScore + emaScore);

  return {
    instrument,
    direction,
    keyLevel: nearestLevel,
    currentPrice,
    ticksFromLevel,
    volumeAtLevel,
    emaAlignment,
    timeframe,
    confidence,
    entryZone,
    stopLoss,
    targets,
  };
}

// ---------------------------------------------------------------------------
// Risk / position sizing
// ---------------------------------------------------------------------------
export function calculateRisk(
  entry: number,
  stop: number,
  accountSize: number,
  instrument: Instrument = '/MNQ',
  maxRiskPercent: number = 1
): RiskCalculation {
  const tickSize = TICK_SIZE[instrument];
  const tickValue = TICK_VALUE[instrument];
  const stopTicks = Math.abs(entry - stop) / tickSize;
  const riskPerContract = stopTicks * tickValue;
  const maxRisk = accountSize * (maxRiskPercent / 100);
  const positionSize = Math.max(1, Math.floor(maxRisk / riskPerContract));
  const riskAmount = positionSize * riskPerContract;

  return {
    positionSize,
    riskAmount,
    riskPercent: (riskAmount / accountSize) * 100,
    rewardR1: riskAmount,      // 1R
    rewardR2: riskAmount * 2,  // 2R
    rrRatio: 1,                // minimum 1:1 at R1
  };
}

// ---------------------------------------------------------------------------
// Entry validation (pre-flight checks)
// ---------------------------------------------------------------------------
export function validateEntry(setup: FortyFortySetup): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const now = new Date();

  // Not Wednesday (choppy midweek)
  if (now.getDay() === 3) {
    reasons.push('Wednesday — historically choppy, reduced conviction');
  }

  // Not pre-birthday (personal rule placeholder)
  // TODO: Configure personal dates in settings
  const month = now.getMonth() + 1;
  const day = now.getDate();
  if (month === 2 && day >= 10 && day <= 14) {
    reasons.push('Pre-birthday window — emotional trading risk');
  }

  // Confidence threshold
  if (setup.confidence < 60) {
    reasons.push(`Confidence ${setup.confidence}% below 60% threshold`);
  }

  // Volume threshold double-check
  if (setup.volumeAtLevel < 40) {
    reasons.push(`Volume at level ${setup.volumeAtLevel}% below 40% threshold`);
  }

  // Ticks threshold
  if (setup.ticksFromLevel > 40) {
    reasons.push(`${setup.ticksFromLevel} ticks from level exceeds 40-tick max`);
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Model metadata
// ---------------------------------------------------------------------------
export const MODEL_METADATA = {
  name: '40/40 Club',
  id: 'forty-forty-club',
  description: 'Key level proximity + volume concentration model. Enters when price is within 40 ticks of a key level with 40%+ daily volume concentrated there.',
  rules: [
    'Price within 40 ticks of key level',
    'Volume profile shows 40%+ daily volume at level',
    '20 EMA over 100 EMA (bull) or under (bear) on 15-min',
    '15-min anchor, 5-min entry timeframe',
    '/MNQ primary, /ES confirmation',
    '1-2R target range',
    'Pre-defined stop, no manual overrides unless EMA sweep confirms',
  ],
  instruments: ['/MNQ', '/ES'] as Instrument[],
  version: '1.0.0',
} as const;

// ---------------------------------------------------------------------------
// Mock data for UI development
// ---------------------------------------------------------------------------
export function getMockSetup(): FortyFortySetup {
  return {
    instrument: '/MNQ',
    direction: 'long',
    keyLevel: 21450.00,
    currentPrice: 21442.75,
    ticksFromLevel: 29,
    volumeAtLevel: 47,
    emaAlignment: 'bullish',
    timeframe: '15m',
    confidence: 78,
    entryZone: { low: 21448.75, high: 21451.25 },
    stopLoss: 21445.00,
    targets: { r1: 21455.00, r2: 21460.00 },
  };
}

export function getMockMarketData(): MarketData {
  return {
    instrument: '/MNQ',
    currentPrice: 21442.75,
    keyLevels: [21450.00, 21400.00, 21500.00, 21350.00],
    volumeProfile: new Map([[21450, 47], [21400, 32], [21500, 12], [21350, 9]]),
    ema20: 21448.50,
    ema100: 21435.25,
    timeframe: '15m',
    timestamp: Date.now(),
  };
}
