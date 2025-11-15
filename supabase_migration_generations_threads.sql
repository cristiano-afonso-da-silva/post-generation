-- ============================================================================
-- GENERATIONS TABLE THREADS COLUMNS MIGRATION
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add Threads posting columns to generations table
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS threads_post_id TEXT,
ADD COLUMN IF NOT EXISTS threads_posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS threads_post_status TEXT DEFAULT NULL;

-- Create index for Threads post status queries
CREATE INDEX IF NOT EXISTS idx_generations_threads_status ON public.generations(user_id, threads_post_status);

-- Success message
SELECT 'Generations table updated with Threads columns successfully! ✅' AS status;


