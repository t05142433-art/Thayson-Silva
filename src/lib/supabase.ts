import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Interfaces
export interface BotSession {
  userId: string;
  username: string;
  threadId: string | null;
  state: 'idle' | 'sent_initial' | 'sent_ask_test' | 'generating' | 'completed' | 'failed';
  lastMessageId: string | null;
  updated_at?: string;
}

export interface IGConfig {
  key: string;
  value: any;
}
