-- Add onboarding preferences columns to user_credits table
-- These fields store all the user's onboarding information and preferences

ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS brand_name TEXT,
ADD COLUMN IF NOT EXISTS brand_handle TEXT,
ADD COLUMN IF NOT EXISTS brand_intention TEXT,
ADD COLUMN IF NOT EXISTS topics TEXT[],
ADD COLUMN IF NOT EXISTS template_style TEXT,
ADD COLUMN IF NOT EXISTS copy_tone TEXT[];

-- Note: All columns are nullable (optional fields) to support existing users
-- first_name: User's first name
-- brand_name: User's brand/business name (optional)
-- brand_handle: User's brand handle (optional)
-- brand_intention: User's brand intention/description
-- topics: Array of selected topics (e.g., ['Building a startup', 'Marketing & content'])
-- template_style: One value from TEMPLATE_STYLE_OPTIONS (e.g., 'Clean & minimal', 'Warm & friendly', 'Bold & punchy', 'Dark & techy')
-- copy_tone: Array of up to 2 values from COPY_TONE_OPTIONS (e.g., ['Friendly & casual', 'Bold & direct'])
-- RLS policies already exist on user_credits table, so no additional policies needed

