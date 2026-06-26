-- ═══════════════════════════════════════════════════════════════
-- UPDATE POSTS TABLE TO SUPPORT MULTIPLE IMAGES
-- ═══════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Change image_url from TEXT to TEXT[] (array of texts)
-- First, convert existing image_url values to array format
ALTER TABLE posts 
ALTER COLUMN image_url TYPE TEXT[] 
USING CASE 
  WHEN image_url IS NULL THEN NULL 
  ELSE ARRAY[image_url]
END;

-- ═══════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════
-- Posts can now store up to 5 image URLs in an array
-- Example: ['url1', 'url2', 'url3']
-- ═══════════════════════════════════════════════════════════════
