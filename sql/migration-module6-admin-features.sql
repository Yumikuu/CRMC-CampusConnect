-- ═══════════════════════════════════════════════════════════════
-- MODULE 6 ADMIN DASHBOARD — DATABASE MIGRATION
-- ═══════════════════════════════════════════════════════════════
-- This adds all missing tables and columns for Module 6 features:
-- - User approval system
-- - Content moderation
-- - Activity logs
-- - Post reporting
-- - Analytics support
-- ═══════════════════════════════════════════════════════════════

-- ── 1. UPDATE PROFILES TABLE ──
-- Add admin_role and account_status columns
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS is_admin;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS admin_role TEXT CHECK (admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE', 'student'));

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'approved' CHECK (account_status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Set default admin_role for existing users who have none
-- (Does NOT touch accounts that already have a role set)
UPDATE profiles 
SET admin_role = 'student' 
WHERE admin_role IS NULL;

-- ── 2. UPDATE POSTS TABLE ──
-- Change image_url to array and add moderation fields
-- (Only converts if it's still a TEXT column, safe to run multiple times)
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
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES profiles(id);

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ;

-- ── 3. CREATE ADMIN ACTIVITY LOGS TABLE ──
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('approve_user', 'reject_user', 'suspend_user', 'approve_post', 'reject_post', 'delete_post', 'flag_post', 'unflag_post', 'pin_post', 'unpin_post', 'create_community', 'delete_community')),
  target_id UUID,
  target_type TEXT CHECK (target_type IN ('user', 'post', 'comment', 'community')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. CREATE POST REPORTS TABLE ──
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. CREATE NEW INDEXES ──
CREATE INDEX IF NOT EXISTS idx_posts_flagged ON posts(is_flagged);
CREATE INDEX IF NOT EXISTS idx_posts_moderation ON posts(moderation_status);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_activity_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);
CREATE INDEX IF NOT EXISTS idx_post_reports_post ON post_reports(post_id);

-- ── 6. ENABLE RLS ON NEW TABLES ──
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reports ENABLE ROW LEVEL SECURITY;

-- ── 7. CREATE RLS POLICIES FOR NEW TABLES ──

-- Admin Activity Logs
DROP POLICY IF EXISTS "Admins can view activity logs" ON admin_activity_logs;
CREATE POLICY "Admins can view activity logs"
  ON admin_activity_logs FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
    )
  );

DROP POLICY IF EXISTS "System can insert activity logs" ON admin_activity_logs;
CREATE POLICY "System can insert activity logs"
  ON admin_activity_logs FOR INSERT WITH CHECK (true);

-- Post Reports
DROP POLICY IF EXISTS "Users can view their own reports" ON post_reports;
CREATE POLICY "Users can view their own reports"
  ON post_reports FOR SELECT USING (
    reporter_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
    )
  );

DROP POLICY IF EXISTS "Users can create reports" ON post_reports;
CREATE POLICY "Users can create reports"
  ON post_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Admins can update reports" ON post_reports;
CREATE POLICY "Admins can update reports"
  ON post_reports FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE!
-- ═══════════════════════════════════════════════════════════════
-- Your database now supports:
-- ✅ User approval workflow (account_status field)
-- ✅ Admin role management (admin_role field)
-- ✅ Content moderation tracking
-- ✅ Activity logging for admins
-- ✅ Post reporting system
-- ✅ Multiple image uploads (image_url as array)
-- ═══════════════════════════════════════════════════════════════
