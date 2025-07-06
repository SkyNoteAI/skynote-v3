-- SkyNote AI - Chat Tables Rollback
-- Created: 2025-07-06
-- Description: Rollback chat tables migration

-- Drop indexes first
DROP INDEX IF EXISTS idx_ai_usage_endpoint;
DROP INDEX IF EXISTS idx_ai_usage_timestamp;
DROP INDEX IF EXISTS idx_ai_usage_user_id;
DROP INDEX IF EXISTS idx_chat_history_timestamp;
DROP INDEX IF EXISTS idx_chat_history_conversation_id;
DROP INDEX IF EXISTS idx_chat_history_user_id;

-- Drop tables
DROP TABLE IF EXISTS ai_usage;
DROP TABLE IF EXISTS chat_history;