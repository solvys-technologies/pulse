-- [claude-code 2026-03-11] Polymarket prediction tracking table
-- Records agent predictions on Polymarket markets for performance tracking

CREATE TABLE IF NOT EXISTS polymarket_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id VARCHAR(255) NOT NULL,
  market_title TEXT NOT NULL,
  predicted_outcome VARCHAR(100) NOT NULL,
  predicted_probability DECIMAL(5,4) NOT NULL,
  agent_name VARCHAR(50) NOT NULL DEFAULT 'Oracle',
  snapshot_probability DECIMAL(5,4) NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  actual_outcome VARCHAR(100),
  result VARCHAR(10), -- 'win' or 'loss'
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poly_predictions_unresolved
  ON polymarket_predictions (resolved) WHERE resolved = FALSE;

CREATE INDEX IF NOT EXISTS idx_poly_predictions_created
  ON polymarket_predictions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_poly_predictions_agent
  ON polymarket_predictions (agent_name, created_at DESC);
