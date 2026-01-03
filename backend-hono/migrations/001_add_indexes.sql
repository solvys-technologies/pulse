CREATE INDEX IF NOT EXISTS idx_news_articles_published
  ON news_articles (published_at DESC);

CREATE INDEX IF NOT EXISTS idx_news_articles_breaking
  ON news_articles (is_breaking);

CREATE INDEX IF NOT EXISTS idx_news_articles_symbols
  ON news_articles USING GIN (symbols);
