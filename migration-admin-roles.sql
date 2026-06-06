-- ═══════════════════════════════════════════════════════════════
-- ADMIN SYSTEM MIGRATION — Multi-Role Admin Structure
-- ═══════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor to upgrade admin system
-- ═══════════════════════════════════════════════════════════════

-- ── STEP 1: Add new admin_role column ──
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS admin_role TEXT DEFAULT NULL
CHECK (admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE'));

-- ── STEP 2: Migrate existing is_admin data ──
-- Convert any existing admins to SSG role (you can change this manually later)
UPDATE profiles 
SET admin_role = 'SSG' 
WHERE is_admin = true;

-- ── STEP 3: Drop old is_admin column (optional - uncomment if you want to remove it) ──
-- ALTER TABLE profiles DROP COLUMN IF EXISTS is_admin;

-- ── STEP 4: Create SSG Announcements Community ──
INSERT INTO communities (slug, name, description, type, department, icon_url) 
VALUES (
  'ssg-announcements', 
  'SSG Announcements', 
  'Official campus-wide announcements from the Supreme Student Government', 
  'public', 
  NULL,
  '👑'
)
ON CONFLICT (slug) DO NOTHING;

-- ── STEP 5: Update RLS Policies for Admin Access ──

-- Drop existing admin-related policies if they exist
DROP POLICY IF EXISTS "Admin can view all posts" ON posts;
DROP POLICY IF EXISTS "Admin can delete any post" ON posts;
DROP POLICY IF EXISTS "Admin can update any post" ON posts;

-- Create new role-based admin policies

-- SSG Admin: Full access to all posts
CREATE POLICY "SSG admin can view all posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.admin_role = 'SSG'
    )
  );

CREATE POLICY "SSG admin can update any post"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.admin_role = 'SSG'
    )
  );

CREATE POLICY "SSG admin can delete any post"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.admin_role = 'SSG'
    )
  );

-- Department Admin: Limited to their department posts
CREATE POLICY "Dept admin can view their department posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN communities c ON c.department = p.admin_role
      WHERE p.id = auth.uid() 
      AND p.admin_role IN ('CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
      AND posts.community_id = c.id
    )
  );

CREATE POLICY "Dept admin can update their department posts"
  ON posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN communities c ON c.department = p.admin_role
      WHERE p.id = auth.uid() 
      AND p.admin_role IN ('CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
      AND posts.community_id = c.id
    )
  );

CREATE POLICY "Dept admin can delete their department posts"
  ON posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN communities c ON c.department = p.admin_role
      WHERE p.id = auth.uid() 
      AND p.admin_role IN ('CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
      AND posts.community_id = c.id
    )
  );

-- ── STEP 6: Create admin helper function ──
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND admin_role IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── STEP 7: Create function to check admin role ──
CREATE OR REPLACE FUNCTION get_admin_role()
RETURNS TEXT AS $$
DECLARE
  role TEXT;
BEGIN
  SELECT admin_role INTO role
  FROM profiles 
  WHERE id = auth.uid();
  
  RETURN role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE!
-- ═══════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Manually assign admin roles to users via Supabase dashboard:
--    UPDATE profiles SET admin_role = 'SSG' WHERE email = 'your-ssg-admin@email.com';
--    UPDATE profiles SET admin_role = 'CTE' WHERE email = 'cte-admin@email.com';
--    UPDATE profiles SET admin_role = 'CSS' WHERE email = 'css-admin@email.com';
--    UPDATE profiles SET admin_role = 'CBE' WHERE email = 'cbe-admin@email.com';
--    UPDATE profiles SET admin_role = 'PSYCH' WHERE email = 'psych-admin@email.com';
--    UPDATE profiles SET admin_role = 'CCJE' WHERE email = 'ccje-admin@email.com';
-- 3. Test the new admin login portal
-- ═══════════════════════════════════════════════════════════════
