-- Add account_name and website columns to generations table
-- These fields store the user's account handle and website for use in carousel footers

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS account_name TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Note: Both columns are nullable (optional fields)
-- RLS policies already exist on generations table, so no additional policies needed

