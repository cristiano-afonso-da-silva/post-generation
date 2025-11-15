-- ============================================================================
-- THREADS CONNECTIONS TABLE MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Create threads_connections table to store OAuth tokens
CREATE TABLE IF NOT EXISTS public.threads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threads_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_threads_connections_user_id ON public.threads_connections(user_id);

-- Enable Row Level Security
ALTER TABLE public.threads_connections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own Threads connections" ON public.threads_connections;

-- Create RLS policy
CREATE POLICY "Users can manage their own Threads connections"
  ON public.threads_connections
  FOR ALL
  USING (auth.uid() = user_id);

-- Success message
SELECT 'Threads connections table created successfully! ✅' AS status;


