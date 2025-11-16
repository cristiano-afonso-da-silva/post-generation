-- ═══════════════════════════════════════════════════════════════════════════
-- CUSTOM TEMPLATES TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- This table stores user-generated custom carousel templates

-- Create custom_templates table
CREATE TABLE IF NOT EXISTS custom_templates (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_templates_user_id ON custom_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_created_at ON custom_templates(created_at DESC);

-- Enable Row Level Security
ALTER TABLE custom_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own templates
CREATE POLICY "Users can view their own templates"
  ON custom_templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own templates
CREATE POLICY "Users can create their own templates"
  ON custom_templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own templates
CREATE POLICY "Users can update their own templates"
  ON custom_templates
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own templates
CREATE POLICY "Users can delete their own templates"
  ON custom_templates
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_custom_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_templates_updated_at
  BEFORE UPDATE ON custom_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_templates_updated_at();

