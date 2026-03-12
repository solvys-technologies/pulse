-- Context Bank: Unified snapshot + desk reports + consolidated briefs

-- Persisted snapshots (every 5th version, pruned to last 100)
CREATE TABLE IF NOT EXISTS context_bank_snapshots (
  id SERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  snapshot JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cb_snapshots_version ON context_bank_snapshots(version DESC);

-- Agent desk reports
CREATE TABLE IF NOT EXISTS desk_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  desk VARCHAR(20) NOT NULL,
  agent VARCHAR(20) NOT NULL,
  snapshot_version INTEGER NOT NULL,
  summary TEXT NOT NULL,
  alerts JSONB NOT NULL DEFAULT '[]',
  trade_ideas JSONB DEFAULT '[]',
  risk_flags JSONB DEFAULT '[]',
  confidence INTEGER NOT NULL DEFAULT 50,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_desk_reports_desk ON desk_reports(desk, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_desk_reports_version ON desk_reports(snapshot_version);
CREATE INDEX IF NOT EXISTS idx_desk_reports_created ON desk_reports(created_at DESC);

-- Harper consolidated briefs
CREATE TABLE IF NOT EXISTS consolidated_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_version INTEGER NOT NULL,
  executive_summary TEXT NOT NULL,
  top_alerts JSONB NOT NULL DEFAULT '[]',
  top_trade_ideas JSONB NOT NULL DEFAULT '[]',
  risk_matrix JSONB NOT NULL DEFAULT '[]',
  approval_queue JSONB NOT NULL DEFAULT '[]',
  desk_report_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefs_created ON consolidated_briefs(created_at DESC);
