-- ═══════════════════════════════════════════════════════════════
-- ADD SSG COMMUNITY + EVENTS TABLE
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Add SSG open community (students can post here too)
INSERT INTO communities (slug, name, description, type, department)
VALUES (
  'ssg',
  'SSG — Student Government',
  'Connect with your Supreme Student Government. Ask questions, share concerns, and stay updated.',
  'public',
  NULL
) ON CONFLICT (slug) DO NOTHING;

-- 2. Create events table for upcoming events widget
CREATE TABLE IF NOT EXISTS campus_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  location    TEXT,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS for events
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view events" ON campus_events;
DROP POLICY IF EXISTS "SSG Officer can manage events" ON campus_events;

CREATE POLICY "Everyone can view events"
  ON campus_events FOR SELECT
  USING (is_active = true);

CREATE POLICY "SSG Officer can manage events"
  ON campus_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IN ('SSG', 'SSG_OFFICER')
    )
  );

-- 4. Verify
SELECT slug, name, type FROM communities WHERE slug IN ('ssg', 'ssg-announcements');
