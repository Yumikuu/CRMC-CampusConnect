-- ═══════════════════════════════════════════════════════════════
-- CRMC CAMPUSHUB — COMPLETE DATABASE SCHEMA WITH ADMIN SYSTEM
-- ═══════════════════════════════════════════════════════════════
-- Run this entire script in your Supabase SQL Editor
-- This includes ALL tables, triggers, policies, AND admin system
-- ═══════════════════════════════════════════════════════════════

-- ── 1. ENABLE REQUIRED EXTENSIONS ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 2. DROP EXISTING TABLES (FRESH START) ──
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- ── 3. PROFILES TABLE (WITH ADMIN SYSTEM) ──
-- Stores user information (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  student_id TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  department TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT false,
  admin_role TEXT DEFAULT NULL CHECK (admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. COMMUNITIES TABLE ──
-- Department and public communities
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('department', 'public')),
  department TEXT, -- Only for department communities
  member_count INT DEFAULT 0,
  post_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 5. COMMUNITY MEMBERS TABLE ──
-- Track who joined which communities
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- ── 6. POSTS TABLE ──
-- All feed posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  title TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 7. POST LIKES TABLE ──
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ── 8. COMMENTS TABLE ──
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_anonymous BOOLEAN DEFAULT false,
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 9. NOTIFICATIONS TABLE ──
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'reply', 'announcement', 'mention')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 10. CREATE INDEXES FOR PERFORMANCE ──
CREATE INDEX idx_posts_community ON posts(community_id);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_profiles_admin_role ON profiles(admin_role);

-- ── 11. AUTO-UPDATE TIMESTAMP FUNCTION ──
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 12. AUTO-CREATE PROFILE ON USER REGISTRATION ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    student_id,
    first_name,
    last_name,
    department
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'student_id', 'TEMP-' || NEW.id::text),
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Name'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'General')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 13. UPDATE POST/COMMENT COUNTS ──
-- Update post like_count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = like_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_likes_count_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Update post comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = comment_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_comments_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- ── 14. ADMIN HELPER FUNCTIONS ──
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

-- ── 15. ROW LEVEL SECURITY (RLS) POLICIES ──

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PROFILES: Everyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- COMMUNITIES: Everyone can read
CREATE POLICY "Communities are viewable by everyone"
  ON communities FOR SELECT USING (true);

-- COMMUNITY MEMBERS: Everyone can read, users can join/leave
CREATE POLICY "Community members are viewable by everyone"
  ON community_members FOR SELECT USING (true);

CREATE POLICY "Users can join communities"
  ON community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE USING (auth.uid() = user_id);

-- POSTS: Everyone can read, users can create/update their own
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE USING (auth.uid() = author_id);

-- ADMIN POLICIES FOR POSTS
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

CREATE POLICY "Dept admin can view their department posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN communities c ON c.department LIKE '%' || p.admin_role || '%'
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
      JOIN communities c ON c.department LIKE '%' || p.admin_role || '%'
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
      JOIN communities c ON c.department LIKE '%' || p.admin_role || '%'
      WHERE p.id = auth.uid() 
      AND p.admin_role IN ('CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
      AND posts.community_id = c.id
    )
  );

-- POST LIKES: Users can like/unlike
CREATE POLICY "Post likes are viewable by everyone"
  ON post_likes FOR SELECT USING (true);

CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS: Everyone can read, users can create/update their own
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own comments"
  ON comments FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE USING (auth.uid() = author_id);

-- NOTIFICATIONS: Users can only see their own
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- ── 16. SEED DATA: CREATE DEFAULT COMMUNITIES ──
INSERT INTO communities (slug, name, description, type, department) VALUES
  ('cte', 'CTE Community', 'College of Teacher Education', 'department', 'College of Teacher Education (CTE)'),
  ('cbe', 'CBE Community', 'College of Business Education', 'department', 'College of Business Education (CBE)'),
  ('ccje', 'CCJE Community', 'College of Criminal Justice Education', 'department', 'College of Criminal Justice Education (CCJE)'),
  ('css', 'CSS Community', 'College of Computer Studies', 'department', 'College of Computer Studies (CCS)'),
  ('psych', 'PSYCH Community', 'Psychology Department', 'department', 'Psychology (PSYCH)'),
  ('general', 'General Discussion', 'Open discussions for all CRMC students', 'public', NULL),
  ('lostandfound', 'Lost & Found', 'Report or recover lost items on campus', 'public', NULL),
  ('academic', 'Academic Help', 'Study help, schedules, and school concerns', 'public', NULL),
  ('marketplace', 'Marketplace & Sharing', 'Borrow, lend, or share materials with peers', 'public', NULL),
  ('campus', 'Campus Discussions', 'Campus life and student concerns', 'public', NULL),
  ('support', 'Student Support', 'Help and guidance for students', 'public', NULL),
  ('ssg-announcements', 'SSG Announcements', 'Official campus-wide announcements from the Supreme Student Government', 'public', NULL)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- SETUP COMPLETE! 
-- ═══════════════════════════════════════════════════════════════
-- Next steps:
-- 1. Assign admin roles manually:
--    UPDATE profiles SET admin_role = 'SSG' WHERE email = 'your-ssg@email.com';
--    UPDATE profiles SET admin_role = 'CTE' WHERE email = 'cte@email.com';
--    UPDATE profiles SET admin_role = 'CSS' WHERE email = 'css@email.com';
--    UPDATE profiles SET admin_role = 'CBE' WHERE email = 'cbe@email.com';
--    UPDATE profiles SET admin_role = 'PSYCH' WHERE email = 'psych@email.com';
--    UPDATE profiles SET admin_role = 'CCJE' WHERE email = 'ccje@email.com';
-- 
-- 2. Test the admin login at /admin/login.html
-- 3. Test student login at /landing page/index.html
-- ═══════════════════════════════════════════════════════════════

