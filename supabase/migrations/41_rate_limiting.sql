-- Migration 24: Rate Limiting
-- Adds rate limiting infrastructure for order creation and other operations

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits (user_id, action, created_at DESC);

-- Auto-cleanup: delete entries older than 2 hours
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < now() - INTERVAL '2 hours';
END;
$$;

-- Check rate limit: returns true if within limit, false if exceeded
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  attempt_count INT;
BEGIN
  -- Cleanup old entries first
  PERFORM cleanup_rate_limits();

  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > now() - (p_window_minutes || ' minutes')::INTERVAL;

  IF attempt_count >= p_max_attempts THEN
    RETURN FALSE; -- Rate limit exceeded
  END IF;

  -- Record this attempt
  INSERT INTO rate_limits (user_id, action) VALUES (p_user_id, p_action);

  RETURN TRUE; -- Within limit
END;
$$;

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the system can read/write rate_limits (via SECURITY DEFINER functions)
-- No direct user access needed
