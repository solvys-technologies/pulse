-- News Feed Cache
-- Stores analyzed news headlines for all users (shared cache)
-- Avoids duplicate API calls and AI analysis

CREATE TABLE IF NOT EXISTS news_feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id VARCHAR(255) UNIQUE NOT NULL,
  source VARCHAR(50) NOT NULL,
  headline TEXT NOT NULL,
  body TEXT,
  symbols TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  is_breaking BOOLEAN DEFAULT FALSE,
  urgency VARCHAR(20) DEFAULT 'normal',
  sentiment VARCHAR(20),
  iv_score DECIMAL(4,2),
  macro_level INTEGER CHECK (macro_level >= 1 AND macro_level <= 4),
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_news_feed_published ON news_feed_items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_feed_macro_level ON news_feed_items (macro_level DESC);
CREATE INDEX IF NOT EXISTS idx_news_feed_source ON news_feed_items (source);
CREATE INDEX IF NOT EXISTS idx_news_feed_breaking ON news_feed_items (is_breaking) WHERE is_breaking = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_feed_symbols ON news_feed_items USING GIN (symbols);

-- Cleanup: Remove items older than 48 hours (run periodically)
-- CREATE INDEX IF NOT EXISTS idx_news_feed_cleanup ON news_feed_items (created_at) WHERE created_at < NOW() - INTERVAL '48 hours';
