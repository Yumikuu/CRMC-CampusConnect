-- ═══════════════════════════════════════════════════════════════
-- Remove "Campus Discussions" community (slug: 'campus')
-- Keep "General" community — they are the same thing
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Move any existing posts from 'campus' → 'general'
UPDATE posts
SET community_id = (SELECT id FROM communities WHERE slug = 'general')
WHERE community_id = (SELECT id FROM communities WHERE slug = 'campus');

-- Step 2: Delete the Campus Discussions community
DELETE FROM communities WHERE slug = 'campus';

-- Verify: should no longer show 'campus' in the list
SELECT slug, name FROM communities ORDER BY name;
