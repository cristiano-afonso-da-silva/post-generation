-- Add template_generation_used field to user_credits table
-- This field tracks whether a user has used the Generate Template feature (one-time limit)

ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS template_generation_used BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_template_generation_used 
ON public.user_credits(user_id, template_generation_used);

-- Note: This field defaults to FALSE, meaning users haven't used the feature yet
-- Once set to TRUE, they cannot use the Generate Template feature again





