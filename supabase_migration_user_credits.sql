-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining INTEGER NOT NULL DEFAULT 1,
  total_credits_used INTEGER NOT NULL DEFAULT 0,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT CHECK (subscription_status IN ('active', 'canceled', 'past_due')),
  current_plan TEXT CHECK (current_plan IN ('plan-10', 'plan-20', 'plan-50', 'plan-100')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);

-- Create index on stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_user_credits_stripe_customer_id ON public.user_credits(stripe_customer_id);

-- Create index on stripe_subscription_id
CREATE INDEX IF NOT EXISTS idx_user_credits_stripe_subscription_id ON public.user_credits(stripe_subscription_id);

-- Enable Row Level Security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can update their own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users can insert their own initial credit record" ON public.user_credits;

-- Create RLS policies
-- Users can only read their own credit records
CREATE POLICY "Users can view their own credits"
  ON public.user_credits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own credit records (for deducting credits)
CREATE POLICY "Users can update their own credits"
  ON public.user_credits
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can insert their own initial credit record
CREATE POLICY "Users can insert their own initial credit record"
  ON public.user_credits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON public.user_credits;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


