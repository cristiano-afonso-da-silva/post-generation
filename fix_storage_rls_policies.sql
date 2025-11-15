-- Fix Storage RLS Policies for Direct Client-Side Uploads
-- This ensures authenticated users can upload directly to Supabase Storage
-- Run this in your Supabase SQL Editor

-- Ensure the bucket exists and is configured correctly
-- Note: file_size_limit and allowed_mime_types are configured via Supabase Dashboard
-- or via Supabase Management API, not directly in SQL
INSERT INTO storage.buckets (id, name, public) 
VALUES (
  'carousel-images', 
  'carousel-images', 
  true  -- Public for viewing
)
ON CONFLICT (id) DO UPDATE SET 
  public = true;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can upload their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own carousel images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view carousel images" ON storage.objects;

-- Policy: Users can upload to their own folder
-- Path format: {user_id}/{generation_id}/slide-{index}.png
-- The first folder must match auth.uid()
CREATE POLICY "Users can upload their own carousel images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'carousel-images' AND 
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Policy: Public can view all carousel images (for thumbnails)
CREATE POLICY "Public can view carousel images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'carousel-images');

-- Policy: Users can update their own carousel images
CREATE POLICY "Users can update their own carousel images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'carousel-images' AND 
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'carousel-images' AND 
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Policy: Users can delete their own carousel images
CREATE POLICY "Users can delete their own carousel images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'carousel-images' AND 
    auth.role() = 'authenticated' AND
    (string_to_array(name, '/'))[1] = auth.uid()::text
  );

-- Verify policies are created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%carousel%'
ORDER BY policyname;

-- Success message
SELECT 'Storage RLS policies updated! ✅' AS status;

