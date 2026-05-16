-- Schema for IPTV IG Automator

-- 1. Table for Instagram Config (Cookies and Base Payload)
CREATE TABLE ig_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Table for Bot Sessions
CREATE TABLE bot_sessions (
  userId TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  threadId TEXT,
  state TEXT DEFAULT 'idle',
  lastMessageId TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Table for Processed Messages (Group Monitor)
CREATE TABLE processed_messages (
  item_id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial default config (Optional, but helps)
-- INSERT INTO ig_config (key, value) VALUES ('cookies', '{}'), ('payload', '{}');
