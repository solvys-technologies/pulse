-- Coaching system tables for PsychAssist and NTN reports

-- NTN (Need-To-Know) Reports table
CREATE TABLE IF NOT EXISTS ntn_reports (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'daily',
  content TEXT NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_report_date UNIQUE (user_id, report_date, report_type)
);

CREATE INDEX IF NOT EXISTS idx_ntn_reports_user_id ON ntn_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ntn_reports_date ON ntn_reports(report_date);

-- Trades table for PsychAssist tilt detection
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  contract_id TEXT,
  symbol TEXT,
  side TEXT NOT NULL,
  size INTEGER NOT NULL,
  entry_price DECIMAL(18, 6),
  exit_price DECIMAL(18, 6),
  pnl DECIMAL(18, 2),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
  closed_at TIMESTAMP WITH TIME ZONE,
  strategy TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_opened_at ON trades(opened_at);

-- Tilt events tracking
CREATE TABLE IF NOT EXISTS tilt_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id INTEGER NOT NULL,
  risk_level TEXT NOT NULL,
  reason TEXT,
  recommendation TEXT,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tilt_events_user_id ON tilt_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tilt_events_created_at ON tilt_events(created_at);
