-- Migration 25: Push Tokens table
-- Stores Expo Push Tokens for customers and drivers

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT,
  device_model TEXT,
  app_type TEXT NOT NULL DEFAULT 'customer' CHECK (app_type IN ('customer', 'driver')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one token per user per app
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_user_app
  ON push_tokens (user_id, app_type);

-- Index for looking up tokens by user
CREATE INDEX IF NOT EXISTS idx_push_tokens_active
  ON push_tokens (is_active, app_type) WHERE is_active = true;

-- Enable RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can manage own push tokens"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to get push tokens for a list of user IDs (used by Edge Functions)
CREATE OR REPLACE FUNCTION get_push_tokens(p_user_ids UUID[], p_app_type TEXT DEFAULT NULL)
RETURNS TABLE(user_id UUID, token TEXT, app_type TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT pt.user_id, pt.token, pt.app_type
  FROM push_tokens pt
  WHERE pt.user_id = ANY(p_user_ids)
    AND pt.is_active = true
    AND (p_app_type IS NULL OR pt.app_type = p_app_type);
END;
$$;
