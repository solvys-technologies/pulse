-- Psych Assist vNext schema
-- Adds ER telemetry tables and ProjectX activity ingestion table.

CREATE TABLE IF NOT EXISTS er_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  final_score NUMERIC(10, 4) DEFAULT 0,
  time_in_tilt_seconds INTEGER DEFAULT 0,
  infraction_count INTEGER DEFAULT 0,
  session_duration_seconds INTEGER DEFAULT 0,
  max_tilt_score NUMERIC(10, 4),
  max_tilt_time TIMESTAMPTZ,
  is_finalized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_er_sessions_user_created
  ON er_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_er_sessions_user_finalized
  ON er_sessions (user_id, is_finalized, updated_at DESC);

CREATE TABLE IF NOT EXISTS er_snapshots (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES er_sessions(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL,
  score NUMERIC(10, 4) NOT NULL,
  state VARCHAR(20) NOT NULL,
  audio_levels JSONB,
  keywords JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_er_snapshots_session_created
  ON er_snapshots (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_er_snapshots_user_created
  ON er_snapshots (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS projectx_activity_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  account_id INTEGER NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  event_source VARCHAR(40) DEFAULT 'signalr',
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_trade BOOLEAN DEFAULT FALSE,
  symbol VARCHAR(32),
  side VARCHAR(16),
  quantity NUMERIC(12, 2),
  price NUMERIC(12, 4),
  realized_pnl NUMERIC(14, 2),
  event_weight NUMERIC(8, 2) DEFAULT 1,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projectx_activity_user_account_time
  ON projectx_activity_events (user_id, account_id, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_projectx_activity_user_trade_time
  ON projectx_activity_events (user_id, is_trade, event_timestamp DESC);
