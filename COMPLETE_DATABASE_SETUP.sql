-- ============================================================================
-- COMPLETE DATABASE SETUP FOR POST GENERATION APP
-- Run this ONCE in your Supabase SQL Editor
-- ============================================================================

-- Create generations table with all required columns
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name TEXT NOT NULL,
  idea_title TEXT NOT NULL,
  account_description TEXT,
  slides JSONB NOT NULL,
  caption TEXT,
  underline_words JSONB,
  font_combination_id TEXT DEFAULT 'combination-1',
  color_theme_id TEXT DEFAULT 'purple-black',
  thumbnail_urls TEXT[] DEFAULT '{}',
  image_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_user_created ON public.generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_id_user ON public.generations(id, user_id);

-- Enable Row Level Security
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can insert their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can update their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete their own generations" ON public.generations;

-- Create RLS policies
CREATE POLICY "Users can view their own generations"
  ON public.generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON public.generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations"
  ON public.generations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON public.generations FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for carousel images (public for thumbnail access)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('carousel-images', 'carousel-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Users can upload their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view carousel images" ON storage.objects;

-- Create storage policies
CREATE POLICY "Users can upload their own carousel images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'carousel-images' AND 
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view carousel images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'carousel-images');

CREATE POLICY "Users can update their own carousel images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'carousel-images' AND 
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own carousel images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'carousel-images' AND 
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Success message
SELECT 'Database setup complete! ✅ You can now use the app.' AS status;

