-- Systemic risk state persistence (causal chains, rhyme cache)
CREATE TABLE IF NOT EXISTS systemic_risk_state (
  id SERIAL PRIMARY KEY,
  state_type VARCHAR(50) NOT NULL,
  state_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_systemic_risk_state_type ON systemic_risk_state(state_type);

-- Add systemic risk columns to news_feed_items (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'news_feed_items') THEN
    ALTER TABLE news_feed_items ADD COLUMN IF NOT EXISTS systemic_source VARCHAR(50);
    ALTER TABLE news_feed_items ADD COLUMN IF NOT EXISTS chain_id VARCHAR(100);
    ALTER TABLE news_feed_items ADD COLUMN IF NOT EXISTS rhyme_id VARCHAR(100);
  END IF;
END
$$;
