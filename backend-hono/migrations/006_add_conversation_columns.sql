-- Add missing columns to ai_conversations table
-- metadata, stale_at, parent_id, thread_id columns

ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS stale_at TIMESTAMP;

ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS parent_id TEXT;

ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS thread_id TEXT;

-- Add missing columns to ai_messages table
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS input_tokens INTEGER;

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS output_tokens INTEGER;

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS total_tokens INTEGER;

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS cost_usd DECIMAL(10,6);

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS model TEXT;

-- Create index for stale_at to optimize cleanup queries
CREATE INDEX IF NOT EXISTS idx_ai_conversations_stale_at
  ON ai_conversations (stale_at)
  WHERE stale_at IS NOT NULL;

-- Create index for thread_id to optimize thread queries
CREATE INDEX IF NOT EXISTS idx_ai_conversations_thread_id
  ON ai_conversations (thread_id)
  WHERE thread_id IS NOT NULL;
