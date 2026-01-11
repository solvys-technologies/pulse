-- Base Schema for Pulse API
-- Run this first to create all core tables

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  tier VARCHAR(50) DEFAULT 'free',
  balance DECIMAL(12,2) DEFAULT 0,
  daily_pnl DECIMAL(12,2) DEFAULT 0,
  trading_enabled BOOLEAN DEFAULT false,
  algo_enabled BOOLEAN DEFAULT false,
  risk_management BOOLEAN DEFAULT false,
  selected_symbol VARCHAR(20) DEFAULT 'NQ',
  contracts_per_trade INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);

-- News articles table (for RiskFlow feed)
CREATE TABLE IF NOT EXISTS news_articles (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(255) UNIQUE,
  source VARCHAR(100) NOT NULL,
  headline TEXT NOT NULL,
  body TEXT,
  symbols TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_breaking BOOLEAN DEFAULT false,
  urgency VARCHAR(50) DEFAULT 'routine',
  sentiment VARCHAR(50),
  iv_score DECIMAL(3,1),
  published_at TIMESTAMP WITH TIME ZONE,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_articles_external_id ON news_articles(external_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- Trading positions table
CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  contracts INTEGER NOT NULL,
  entry_price DECIMAL(12,4) NOT NULL,
  current_price DECIMAL(12,4),
  unrealized_pnl DECIMAL(12,2) DEFAULT 0,
  stop_loss DECIMAL(12,4),
  take_profit DECIMAL(12,4),
  status VARCHAR(20) DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(user_id, status);

-- ProjectX account connections table
CREATE TABLE IF NOT EXISTS projectx_connections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  account_id VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  account_status VARCHAR(50),
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_projectx_user_id ON projectx_connections(user_id);
