-- ═══════════════════════════════════════════════════════════════
-- CAMPUS EVENTS TABLE — Module 5: Announcements & Events
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Add missing columns to existing table (safe — won't fail if they already exist)
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS event_time TIME;
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE SET NULL;
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_campus_events_date ON campus_events(event_date);
CREATE INDEX IF NOT EXISTS idx_campus_events_active ON campus_events(is_active, event_date);

-- RLS
ALTER TABLE campus_events ENABLE ROW LEVEL SECURITY;

-- Everyone can view active events
DROP POLICY IF EXISTS "Anyone can view active events" ON campus_events;
CREATE POLICY "Anyone can view active events"
  ON campus_events FOR SELECT
  USING (is_active = true);

-- Admins can manage events
DROP POLICY IF EXISTS "Admins can manage events" ON campus_events;
CREATE POLICY "Admins can manage events"
  ON campus_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.admin_role IS NOT NULL
        AND profiles.admin_role != 'student'
    )
  );

-- Seed some sample events (optional — remove if you have real data)
INSERT INTO campus_events (title, event_date, location, category) VALUES
  ('Foundation Day', CURRENT_DATE + INTERVAL '7 days', 'Main Campus', 'cultural'),
  ('Leadership Summit', CURRENT_DATE + INTERVAL '10 days', 'Auditorium', 'seminar'),
  ('Final Exams Begin', CURRENT_DATE + INTERVAL '14 days', 'All Departments', 'academic'),
  ('Intramurals Opening', CURRENT_DATE + INTERVAL '21 days', 'Gymnasium', 'sports')
ON CONFLICT DO NOTHING;

-- Verify
SELECT * FROM campus_events ORDER BY event_date LIMIT 10;
