-- Journal entries: human psych + agent performance persistence
-- Dual-type table: 'human' entries track ER trend/infractions/discipline,
-- 'agent' entries track proposal counts, win rate, avg RR, total P&L.
-- Upsert key: (user_id, type, date) — one entry per user/type/day.

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('human', 'agent')),
  date DATE NOT NULL,
  -- Human psych fields
  er_trend JSONB,
  infractions JSONB,
  discipline_score NUMERIC(10, 4),
  notes TEXT,
  -- Agent performance fields
  agent_name VARCHAR(100),
  proposal_count INTEGER,
  accepted_count INTEGER,
  win_rate NUMERIC(10, 4),
  avg_rr NUMERIC(10, 4),
  total_pnl NUMERIC(14, 2),
  proposals JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_journal_entries_upsert
  ON journal_entries (user_id, type, date);

CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date
  ON journal_entries (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_journal_entries_type_date
  ON journal_entries (type, date DESC);
