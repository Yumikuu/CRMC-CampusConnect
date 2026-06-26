-- ═══════════════════════════════════════════════════════════════
-- FIX MIGRATION — Run this INSTEAD of migration-module6-admin-features.sql
-- ═══════════════════════════════════════════════════════════════

-- ── STEP 1: Fix the admin_role constraint to allow 'student' ──
-- Drop the old constraint first, then recreate it with 'student' included
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_admin_role_check;

ALTER TABLE profiles 
  ADD CONSTRAINT profiles_admin_role_check 
  CHECK (admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE', 'student'));

-- ── STEP 2: Add account_status column if not exists ──
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'approved' 
  CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Set approved for all existing users
UPDATE profiles 
SET account_status = 'approved' 
WHERE account_status IS NULL;

-- ── STEP 3: Set 'student' for anyone who has NULL admin_role ──
-- (This will NOT touch your SSG account since it already has admin_role = 'SSG')
UPDATE profiles 
SET admin_role = 'student' 
WHERE admin_role IS NULL;

-- ── STEP 4: Update posts table ──
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'image_url'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE posts
      ALTER COLUMN image_url TYPE TEXT[] USING 
        CASE 
          WHEN image_url IS NULL THEN NULL
          WHEN image_url = '' THEN NULL
          ELSE ARRAY[image_url]
        END;
  END IF;
END $$;

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' 
  CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- ── STEP 5: Create admin_activity_logs table ──
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_id UUID,
  target_type TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 6: Create post_reports table ──
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── STEP 7: Indexes ──
CREATE INDEX IF NOT EXISTS idx_posts_flagged ON posts(is_flagged);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON post_reports(post_id);

-- ── STEP 8: RLS ──
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can view activity logs"
  ON admin_activity_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_role IN ('SSG','CTE','CSS','CBE','PSYCH','CCJE'))
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON admin_activity_logs;
CREATE POLICY "System can insert activity logs"
  ON admin_activity_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own reports" ON post_reports;
CREATE POLICY "Users can view their own reports"
  ON post_reports FOR SELECT USING (
    reporter_id = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_role IN ('SSG','CTE','CSS','CBE','PSYCH','CCJE'))
  );

DROP POLICY IF EXISTS "Users can create reports" ON post_reports;
CREATE POLICY "Users can create reports"
  ON post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can update reports" ON post_reports;
CREATE POLICY "Admins can update reports"
  ON post_reports FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND admin_role IN ('SSG','CTE','CSS','CBE','PSYCH','CCJE'))
  );

-- ── DONE ──
-- Verify your SSG account is still correct:
SELECT id, email, admin_role, account_status FROM profiles WHERE admin_role = 'SSG';
