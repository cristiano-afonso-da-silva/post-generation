-- Create generations table
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can insert their own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete their own generations" ON public.generations;

-- Create RLS policies
CREATE POLICY "Users can view their own generations"
  ON public.generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations"
  ON public.generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations"
  ON public.generations FOR DELETE
  USING (auth.uid() = user_id);

-- Create storage bucket for note images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('note-images', 'note-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for note-images bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Create storage policies
-- Note: Supabase storage path format is {user_id}/{generation_id}/slide-{index}.png
-- We check that the first folder (user_id) matches the authenticated user
CREATE POLICY "Users can upload their own images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'note-images' AND 
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view their own images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'note-images' AND 
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'note-images' AND 
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

