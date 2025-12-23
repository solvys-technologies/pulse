/**
 * PsychAssist / Coaching System
 * Trading psychology endpoints that help prevent tilting/overtrading.
 *
 * NOTE: AWS Bedrock integration was removed because it was not deploy-compatible
 * in our current Encore/GitHub pipeline. Keep this service cloud-safe.
 */

import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { db } from "../db";
import log from "encore.dev/log";

/**
 * PsychAssist: Detect and prevent tilting behavior
 * Monitors trading patterns and emotional state
 */
export const checkTiltStatus = api<
  { accountId: number },
  { 
    tiltRisk: "low" | "medium" | "high";
    reason?: string;
    recommendation?: string;
  }
>(
  { method: "GET", path: "/ai/psychassist/tilt-check", auth: true, expose: true },
  async (req) => {
    const auth = getAuthData()!;
    
    log.info("PsychAssist tilt check", { userId: auth.userID, accountId: req.accountId });

    // Query recent trading activity
    const recentTrades = await db.query<{
      trade_count: number;
      loss_streak: number;
      avg_hold_time_seconds: number;
    }>`
      SELECT 
        COUNT(*) as trade_count,
        COALESCE(SUM(CASE WHEN pnl < 0 THEN 1 ELSE 0 END), 0) as loss_streak,
        COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - opened_at))), 0) as avg_hold_time_seconds
      FROM trades
      WHERE user_id = ${auth.userID}
        AND account_id = ${req.accountId}
        AND opened_at > NOW() - INTERVAL '1 hour'
    `;

    const stats = recentTrades[0] || { trade_count: 0, loss_streak: 0, avg_hold_time_seconds: 0 };

    // Tilt detection logic
    let tiltRisk: "low" | "medium" | "high" = "low";
    let reason: string | undefined;
    let recommendation: string | undefined;

    // High frequency trading (more than 10 trades/hour)
    if (stats.trade_count > 10) {
      tiltRisk = "high";
      reason = "High frequency trading detected - possible overtrading";
      recommendation = "Take a 15-minute break. Review your trading plan before continuing.";
    }
    // Multiple consecutive losses
    else if (stats.loss_streak >= 3) {
      tiltRisk = "high";
      reason = "Multiple consecutive losses detected";
      recommendation = "Step away from the screen. Losses compound when emotions are high.";
    }
    // Very short hold times (less than 30 seconds average)
    else if (stats.avg_hold_time_seconds > 0 && stats.avg_hold_time_seconds < 30) {
      tiltRisk = "medium";
      reason = "Very short hold times - possible revenge trading";
      recommendation = "Slow down. Wait for A+ setups only.";
    }
    // Elevated activity
    else if (stats.trade_count > 5) {
      tiltRisk = "medium";
      reason = "Elevated trading activity";
      recommendation = "Check in with yourself - are you following your plan?";
    }

    return {
      tiltRisk,
      reason,
      recommendation,
    };
  }
);
