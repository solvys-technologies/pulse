/**
 * IV Agent Integration for PULSE
 * 
 * Formats IV scoring data for AI-powered analysis via OpenClaw gateway.
 * 
 * TODO: Full agent integration with OpenClaw gateway
 * - Connect to gateway at ws://127.0.0.1:7787
 * - Send IV context as structured prompt
 * - Receive AI-enhanced analysis (regime detection, anomaly alerts, trade ideas)
 * 
 * For now, this module provides local formatting of IV score results
 * for display in the PULSE UI.
 */

import { type IVScoreResult, type IVScoringInput, computeIVScore, quickIVScore } from './iv-scoring';

// ─── Agent Request/Response Types ────────────────────────────────────────────

/** Shape of what we'd send to the OpenClaw agent */
export interface IVAgentRequest {
  type: 'iv_analysis';
  payload: {
    scoring: IVScoreResult;
    rawInput: IVScoringInput;
    /** Additional market context for the agent */
    context?: string;
  };
}

/** Shape of what we'd receive back */
export interface IVAgentResponse {
  analysis: string;
  alerts: string[];
  tradeIdeas: string[];
  confidence: number;
}

// ─── Local Formatting (used until agent integration is live) ─────────────────

export interface FormattedIVDisplay {
  score: number;
  legacyScore: number;
  environment: string;
  environmentEmoji: string;
  sizingLabel: string;
  sizingMultiplier: string;
  sizingDetail: string;
  summary: string;
  lastUpdated: string;
  components: {
    label: string;
    value: number;
    weight: string;
  }[];
}

const ENV_EMOJI: Record<string, string> = {
  'Low Vol': '🟢',
  'Normal': '🔵',
  'Elevated': '🟡',
  'Crisis': '🔴',
};

export function formatIVForDisplay(result: IVScoreResult): FormattedIVDisplay {
  return {
    score: result.score,
    legacyScore: result.legacyScore,
    environment: result.environment,
    environmentEmoji: ENV_EMOJI[result.environment] || '⚪',
    sizingLabel: result.sizing.label,
    sizingMultiplier: `${Math.round(result.sizing.sizeMultiplier * 100)}%`,
    sizingDetail: result.sizing.detail,
    summary: `IV Score: ${result.score}/100 (${result.environment}) — ${result.sizing.label}`,
    lastUpdated: new Date(result.timestamp).toLocaleTimeString(),
    components: [
      { label: 'VIX vs Avg', value: result.components.vixVsAvg, weight: '35%' },
      { label: 'Term Structure', value: result.components.termStructure, weight: '20%' },
      { label: 'Put/Call Signal', value: result.components.putCallSignal, weight: '15%' },
      { label: 'IV Percentile', value: result.components.ivPercentile, weight: '30%' },
    ],
  };
}

// ─── TODO: OpenClaw Agent Integration ────────────────────────────────────────

/**
 * TODO: Implement when gateway REST/WS API is available.
 * 
 * Expected flow:
 * 1. computeIVScore() locally for fast display
 * 2. Send IVAgentRequest to gateway for enhanced analysis
 * 3. Gateway routes to an IV-specialist agent prompt
 * 4. Agent returns regime analysis, anomaly alerts, trade ideas
 * 5. Merge agent response into UI alongside local score
 * 
 * Gateway endpoint (tentative):
 *   POST http://127.0.0.1:7787/api/invoke
 *   { "command": "iv_analyze", "params": { ...IVAgentRequest } }
 */
export async function requestAgentAnalysis(
  _input: IVScoringInput
): Promise<IVAgentResponse | null> {
  // TODO: Implement gateway call
  // const result = computeIVScore(input);
  // const req: IVAgentRequest = { type: 'iv_analysis', payload: { scoring: result, rawInput: input } };
  // const res = await fetch('http://127.0.0.1:7787/api/invoke', { method: 'POST', body: JSON.stringify(req) });
  // return res.json();
  return null;
}

// ─── Convenience Exports ─────────────────────────────────────────────────────

export { computeIVScore, quickIVScore, type IVScoreResult, type IVScoringInput };
