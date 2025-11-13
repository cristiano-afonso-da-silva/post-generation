-- ============================================================================
-- DELETE ALL GENERATION DATA FOR USER: 516d50a0-9086-4e15-a735-3175e61406b7
-- ============================================================================
-- WARNING: This will permanently delete all generation data for this user.
-- Run this script in your Supabase SQL Editor.
-- ============================================================================

-- Set the user ID
DO $$
DECLARE
  target_user_id UUID := '516d50a0-9086-4e15-a735-3175e61406b7';
  deleted_count INTEGER;
BEGIN
  -- Delete all generations for this user
  DELETE FROM public.generations
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Report the results
  RAISE NOTICE 'Deleted % generation records for user %', deleted_count, target_user_id;
END $$;

-- ============================================================================
-- STORAGE CLEANUP (Manual Step Required)
-- ============================================================================
-- After running the SQL above, you also need to delete the storage files.
-- 
-- Option 1: Via Supabase Dashboard
--   1. Go to Storage > carousel-images bucket
--   2. Navigate to folder: 516d50a0-9086-4e15-a735-3175e61406b7
--   3. Delete the entire folder
--
-- Option 2: Via SQL (if you have storage admin access)
--   Note: This requires bypassing RLS, so you may need to run as service role
--   Uncomment and run the following if you have proper permissions:
--
-- DELETE FROM storage.objects
-- WHERE bucket_id = 'carousel-images'
--   AND name LIKE '516d50a0-9086-4e15-a735-3175e61406b7/%';
--
-- ============================================================================





