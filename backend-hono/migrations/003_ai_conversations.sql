CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  model VARCHAR(50),
  thread_id UUID,
  parent_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT ai_conversations_thread_fk FOREIGN KEY (thread_id)
    REFERENCES ai_conversations (id) ON DELETE SET NULL,
  CONSTRAINT ai_conversations_parent_fk FOREIGN KEY (parent_id)
    REFERENCES ai_conversations (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations (id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  model VARCHAR(50),
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user
  ON ai_conversations (user_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_thread
  ON ai_conversations (thread_id);

CREATE INDEX IF NOT EXISTS idx_ai_conversations_updated
  ON ai_conversations (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation
  ON ai_messages (conversation_id, created_at);
