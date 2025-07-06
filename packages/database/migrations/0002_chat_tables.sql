-- SkyNote AI - Chat Tables Migration
-- Created: 2025-07-06
-- Description: Add tables for AI chat functionality

-- Chat history table
CREATE TABLE chat_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sources TEXT, -- JSON array of source citations
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- AI usage tracking table
CREATE TABLE ai_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER DEFAULT 0,
    model TEXT NOT NULL,
    endpoint TEXT NOT NULL, -- 'chat', 'search', 'suggestions', etc.
    cost_estimate REAL, -- Estimated cost in dollars
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_conversation_id ON chat_history(conversation_id);
CREATE INDEX idx_chat_history_timestamp ON chat_history(timestamp);
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_timestamp ON ai_usage(timestamp);
CREATE INDEX idx_ai_usage_endpoint ON ai_usage(endpoint);