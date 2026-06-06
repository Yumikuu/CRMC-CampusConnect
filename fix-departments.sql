-- ═══════════════════════════════════════════════════════════════
-- FIX DEPARTMENT ADMIN ROLES — Correct Department List
-- ═══════════════════════════════════════════════════════════════
-- Run this to fix the admin_role constraint with correct departments
-- ═══════════════════════════════════════════════════════════════

-- ── STEP 1: Drop the old constraint ──
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_admin_role_check;

-- ── STEP 2: Add correct constraint with 5 real departments ──
ALTER TABLE profiles 
ADD CONSTRAINT profiles_admin_role_check 
CHECK (admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE'));

-- ── STEP 3: Drop incorrect RLS policies ──
DROP POLICY IF EXISTS "Dept admin can view their department posts" ON posts;
DROP POLICY IF EXISTS "Dept admin can update their department posts" ON posts;
DROP POLICY IF EXISTS "Dept admin can delete their department posts" ON posts;

-- ── STEP 4: Recreate policies with correct department list ──
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

-- ═══════════════════════════════════════════════════════════════
-- FIX COMPLETE!
-- ═══════════════════════════════════════════════════════════════
-- Now you can assign admin roles with correct departments:
-- UPDATE profiles SET admin_role = 'CTE' WHERE email = 'cte@email.com';
-- UPDATE profiles SET admin_role = 'CSS' WHERE email = 'css@email.com';
-- UPDATE profiles SET admin_role = 'CBE' WHERE email = 'cbe@email.com';
-- UPDATE profiles SET admin_role = 'PSYCH' WHERE email = 'psych@email.com';
-- UPDATE profiles SET admin_role = 'CCJE' WHERE email = 'ccje@email.com';
-- ═══════════════════════════════════════════════════════════════
