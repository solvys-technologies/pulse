/**
 * Boardroom types
 * Shared backend contracts for boardroom and intervention messages.
 */

export type BoardroomAgent =
  | 'Oracle'
  | 'Feucht'
  | 'Sentinel'
  | 'Charles'
  | 'Horace'
  | 'Harper'
  | 'Unknown';

export interface BoardroomMessage {
  id: string;
  agent: BoardroomAgent;
  emoji: string;
  content: string;
  timestamp: string;
  role: 'user' | 'assistant' | 'system';
}

export interface InterventionMessage {
  id: string;
  sender: 'User' | 'Harper' | 'Unknown';
  content: string;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Structured Intervention types                                      */
/* ------------------------------------------------------------------ */

export type InterventionType =
  | 'risk_alert'
  | 'overtrading_warning'
  | 'rule_violation'
  | 'market_event'
  | 'position_check';

export type InterventionSeverity = 'info' | 'warning' | 'critical';

export interface StructuredIntervention {
  id: string;
  agent: BoardroomAgent;
  type: InterventionType;
  severity: InterventionSeverity;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/*  Trade Idea types                                                   */
/* ------------------------------------------------------------------ */

export type TradeDirection = 'long' | 'short' | 'neutral';
export type ConvictionLevel = 'low' | 'medium' | 'high' | 'max';

export interface TradeIdea {
  id: string;
  agent: BoardroomAgent;
  instrument: string;
  direction: TradeDirection;
  conviction: ConvictionLevel;
  entry?: number;
  stopLoss?: number;
  target?: number;
  riskReward?: number;
  thesis: string;
  keyLevels?: { label: string; price: number }[];
  timestamp: string;
}
