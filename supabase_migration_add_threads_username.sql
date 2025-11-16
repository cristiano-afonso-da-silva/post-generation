-- ============================================================================
-- ADD THREADS USERNAME FIELD
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Add threads_username column to threads_connections table
ALTER TABLE public.threads_connections 
ADD COLUMN IF NOT EXISTS threads_username TEXT;

-- Success message
SELECT 'Threads username column added successfully! ✅' AS status;


