-- ═══════════════════════════════════════════════════════════════
-- ADD COMMENT REPLIES SUPPORT
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add parent_id column to comments table (self-referencing)
ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- 2. Index for fast reply lookups
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id   ON comments(post_id);

-- 3. RLS policy — replies follow same rules as comments (already covered by existing policies)
-- No additional policies needed since parent_id is just a column on the same table.
