-- ═══════════════════════════════════════════════════════════════
-- SETUP STORAGE BUCKET FOR POST IMAGES
-- ═══════════════════════════════════════════════════════════════
-- Run this after creating the 'post-images' bucket in Supabase Dashboard
-- ═══════════════════════════════════════════════════════════════

-- Allow anyone to read images (public bucket)
CREATE POLICY "Public can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ═══════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════
-- Users can now upload images to: post-images/{user_id}/{filename}
-- Images will be publicly accessible via URL
-- ═══════════════════════════════════════════════════════════════
