-- Add account_handle and website columns to user_credits table
-- These fields store the user's account handle (e.g., @username) and website for use in carousel footers

ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS account_handle TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Note: Both columns are nullable (optional fields)
-- RLS policies already exist on user_credits table, so no additional policies needed






