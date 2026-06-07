-- ═══════════════════════════════════════════════════════════════
-- ADD SSG OFFICER ROLE
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Update the admin_role constraint to include SSG_OFFICER
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_admin_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_admin_role_check 
  CHECK (admin_role IN ('SSG', 'SSG_OFFICER', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE', 'student'));

-- 2. Make sure ssg-announcements community exists
INSERT INTO communities (slug, name, description, type, department)
VALUES (
  'ssg-announcements',
  'SSG Announcements',
  'Official campus-wide announcements from the Supreme Student Government',
  'public',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- 3. Verify
SELECT id, slug, name FROM communities WHERE slug = 'ssg-announcements';
