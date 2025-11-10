-- Add image_urls column to generations table to cache image URLs
-- This prevents having to list storage files on every request

ALTER TABLE generations
ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Add thumbnail_urls column if it doesn't exist (for history page)
ALTER TABLE generations
ADD COLUMN IF NOT EXISTS thumbnail_urls TEXT[] DEFAULT '{}';

-- Create index on user_id and created_at for faster queries
CREATE INDEX IF NOT EXISTS idx_generations_user_created 
ON generations(user_id, created_at DESC);

-- Create index on id and user_id for faster single generation lookups
CREATE INDEX IF NOT EXISTS idx_generations_id_user 
ON generations(id, user_id);

