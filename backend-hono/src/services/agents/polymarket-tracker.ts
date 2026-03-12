// [claude-code 2026-03-11] Polymarket prediction tracker — records agent prediction outcomes
// Polls for resolved markets every 6 hours, compares agent predictions to actual outcomes

import { fetchPolymarket } from '../polymarket-service.js'
import { isPoolAvailable, query } from '../../db/optimized.js'
import { saveJournalEntry } from '../journal-service.js'
import type { AgentProposal } from '../journal-service.js'

const POLL_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours
const DEFAULT_USER_ID = 'system'

let _intervalId: ReturnType<typeof setInterval> | null = null

// ── Types ────────────────────────────────────────────────────────────────────

interface TrackedPrediction {
  id: string
  marketId: string
  marketTitle: string
  predictedOutcome: string
  predictedProbability: number
  agentName: string
  snapshotProbability: number
  createdAt: string
  resolvedAt?: string
  actualOutcome?: string
  result?: 'win' | 'loss'
}

// In-memory store + DB persistence
let _trackedPredictions: TrackedPrediction[] = []

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Record a prediction made by an agent on a Polymarket market.
 * Called when the agent pipeline produces a prediction market take.
 */
export async function recordPrediction(
  marketId: string,
  marketTitle: string,
  predictedOutcome: string,
  predictedProbability: number,
  agentName: string = 'Oracle'
): Promise<string> {
  const id = crypto.randomUUID()
  const prediction: TrackedPrediction = {
    id,
    marketId,
    marketTitle,
    predictedOutcome,
    predictedProbability,
    agentName,
    snapshotProbability: predictedProbability,
    createdAt: new Date().toISOString(),
  }

  _trackedPredictions.push(prediction)

  // Persist to DB
  if (isPoolAvailable()) {
    await query(
      `INSERT INTO polymarket_predictions (
        id, market_id, market_title, predicted_outcome, predicted_probability,
        agent_name, snapshot_probability, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING`,
      [id, marketId, marketTitle, predictedOutcome, predictedProbability,
       agentName, predictedProbability, prediction.createdAt]
    ).catch(err => {
      console.warn('[PolyTracker] DB persist failed:', err)
    })
  }

  return id
}

/**
 * Check for resolved markets and record outcomes.
 */
async function checkResolvedMarkets(): Promise<void> {
  try {
    // Get current markets from Polymarket
    const { markets } = await fetchPolymarket()

    // Load unresolved predictions
    const unresolved = _trackedPredictions.filter(p => !p.resolvedAt)

    if (unresolved.length === 0) return

    for (const prediction of unresolved) {
      const market = markets.find(m => m.id === prediction.marketId)

      // If market not found in active markets, it may have resolved
      // Check if closeTime has passed
      if (!market) {
        // Market no longer in active feed — check DB for resolution
        if (isPoolAvailable()) {
          const result = await query<{ resolved: boolean; actual_outcome: string }>(
            `SELECT resolved, actual_outcome FROM polymarket_predictions WHERE id = $1`,
            [prediction.id]
          ).catch(() => ({ rows: [] }))

          if (result.rows[0]?.resolved) {
            prediction.resolvedAt = new Date().toISOString()
            prediction.actualOutcome = result.rows[0].actual_outcome
            prediction.result = prediction.predictedOutcome.toLowerCase() === prediction.actualOutcome?.toLowerCase()
              ? 'win' : 'loss'
          }
        }
        continue
      }

      // Check if market has closed (closeTime passed)
      if (market.closeTime && new Date(market.closeTime) <= new Date()) {
        // Market has closed — determine outcome
        // If probability > 0.95, outcome is effectively resolved
        if (market.probability > 0.95 || market.probability < 0.05) {
          const actualOutcome = market.probability > 0.5 ? market.outcome : 'No'
          const isWin = prediction.predictedOutcome.toLowerCase() === actualOutcome.toLowerCase()

          prediction.resolvedAt = new Date().toISOString()
          prediction.actualOutcome = actualOutcome
          prediction.result = isWin ? 'win' : 'loss'

          console.log(
            `[PolyTracker] Resolved: "${prediction.marketTitle}" → ${actualOutcome} ` +
            `(agent predicted: ${prediction.predictedOutcome}, result: ${prediction.result})`
          )

          // Persist resolution to DB
          if (isPoolAvailable()) {
            await query(
              `UPDATE polymarket_predictions SET
                resolved = true, actual_outcome = $2, result = $3, resolved_at = $4
              WHERE id = $1`,
              [prediction.id, actualOutcome, prediction.result, prediction.resolvedAt]
            ).catch(err => {
              console.warn('[PolyTracker] DB update failed:', err)
            })
          }

          // Record to journal
          await recordPredictionToJournal(prediction)
        }
      }
    }
  } catch (err) {
    console.error('[PolyTracker] Check resolved markets failed:', err)
  }
}

/**
 * Record a resolved prediction to the journal system.
 */
async function recordPredictionToJournal(prediction: TrackedPrediction): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  const proposal: AgentProposal = {
    id: prediction.id,
    agent: prediction.agentName,
    ticker: 'POLY',
    direction: 'long', // Predictions are always a "long" on the predicted outcome
    status: 'accepted',
    outcome: prediction.result === 'win' ? 'win' : 'loss',
    pnl: prediction.result === 'win' ? 1 : -1, // Binary outcome
    createdAt: prediction.createdAt,
  }

  try {
    await saveJournalEntry(DEFAULT_USER_ID, {
      type: 'agent',
      date: today,
      agentName: prediction.agentName,
      proposalCount: 1,
      acceptedCount: 1,
      winRate: prediction.result === 'win' ? 100 : 0,
      avgRR: 1,
      totalPnl: prediction.result === 'win' ? 1 : -1,
      proposals: [proposal],
    })
  } catch (err) {
    console.error('[PolyTracker] Journal entry failed:', err)
  }
}

// ── Restore from DB ──────────────────────────────────────────────────────────

async function restoreFromDB(): Promise<void> {
  if (!isPoolAvailable()) return

  try {
    const result = await query<Record<string, unknown>>(
      `SELECT * FROM polymarket_predictions WHERE resolved = false ORDER BY created_at DESC LIMIT 100`
    ).catch(() => ({ rows: [] }))

    for (const row of result.rows) {
      _trackedPredictions.push({
        id: row.id as string,
        marketId: row.market_id as string,
        marketTitle: row.market_title as string,
        predictedOutcome: row.predicted_outcome as string,
        predictedProbability: Number(row.predicted_probability),
        agentName: row.agent_name as string,
        snapshotProbability: Number(row.snapshot_probability),
        createdAt: row.created_at as string,
      })
    }

    if (_trackedPredictions.length > 0) {
      console.log(`[PolyTracker] Restored ${_trackedPredictions.length} unresolved predictions from DB`)
    }
  } catch {
    // Silent — fresh start is fine
  }
}

// ── Polling ──────────────────────────────────────────────────────────────────

export function startPolymarketTracking(): void {
  if (_intervalId) return

  console.log('[PolyTracker] Starting prediction market tracking...')

  restoreFromDB().catch(() => {})

  // Check immediately, then every 6 hours
  checkResolvedMarkets()
  _intervalId = setInterval(checkResolvedMarkets, POLL_INTERVAL_MS)

  console.log(`[PolyTracker] Polling every ${POLL_INTERVAL_MS / 3600000}h`)
}

export function stopPolymarketTracking(): void {
  if (_intervalId) {
    clearInterval(_intervalId)
    _intervalId = null
  }
  console.log('[PolyTracker] Stopped')
}

// ── Query Functions ──────────────────────────────────────────────────────────

export function getTrackedPredictions(): TrackedPrediction[] {
  return _trackedPredictions
}

export function getPredictionStats(): {
  total: number
  resolved: number
  wins: number
  losses: number
  winRate: number
} {
  const resolved = _trackedPredictions.filter(p => p.resolvedAt)
  const wins = resolved.filter(p => p.result === 'win').length
  const losses = resolved.filter(p => p.result === 'loss').length
  return {
    total: _trackedPredictions.length,
    resolved: resolved.length,
    wins,
    losses,
    winRate: resolved.length > 0 ? (wins / resolved.length) * 100 : 0,
  }
}
