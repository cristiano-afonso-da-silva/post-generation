-- Migration: Update default credits for new users from 5 to 10
-- This migration updates the DEFAULT value for credits_remaining column

-- Alter the column to change the default value
ALTER TABLE public.user_credits 
ALTER COLUMN credits_remaining SET DEFAULT 10;

-- Note: This only affects NEW records created after this migration
-- Existing users will keep their current credit balance
-- If you want to give existing users with less than 10 credits a boost to 10, 
-- uncomment the line below:
-- UPDATE public.user_credits SET credits_remaining = 10 WHERE credits_remaining < 10;






