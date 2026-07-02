-- ═══════════════════════════════════════════════════════════════
-- CATEGORIZED NOTIFICATION URGENCY
-- Adds urgency levels to notifications for prioritization
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Add urgency column to notifications table ──
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal'
  CHECK (urgency IN ('critical', 'urgent', 'important', 'normal', 'low'));

-- ── 2. Update existing notifications with appropriate urgency ──
-- Flagged post warnings = critical
UPDATE notifications SET urgency = 'critical' WHERE type = 'mention' AND title LIKE '%Flagged%';
-- Announcements = urgent
UPDATE notifications SET urgency = 'urgent' WHERE type = 'announcement';
-- Replies and mentions = important
UPDATE notifications SET urgency = 'important' WHERE type IN ('reply', 'mention') AND urgency = 'normal';
-- Comments = normal (already default)
-- Likes = low
UPDATE notifications SET urgency = 'low' WHERE type = 'like';

-- ── 3. Update notify_on_like trigger to set urgency = 'low' ──
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id  UUID;
  post_title_text TEXT;
  liker_name      TEXT;
BEGIN
  SELECT author_id, COALESCE(title, LEFT(content, 50))
  INTO post_author_id, post_title_text
  FROM posts WHERE id = NEW.post_id;

  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT first_name || ' ' || last_name INTO liker_name
  FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, message, link, is_read, urgency)
  VALUES (
    post_author_id, 'like', 'Someone liked your post',
    liker_name || ' liked your post: "' || post_title_text || '"',
    '/campusfeed.html?post=' || NEW.post_id, false,
    'low'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Update notify_on_comment trigger to set urgency = 'normal' or 'important' ──
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id  UUID;
  post_title_text TEXT;
  commenter_name  TEXT;
  parent_author_id UUID;
BEGIN
  SELECT author_id, COALESCE(title, LEFT(content, 50))
  INTO post_author_id, post_title_text
  FROM posts WHERE id = NEW.post_id;

  SELECT first_name || ' ' || last_name INTO commenter_name
  FROM profiles WHERE id = NEW.author_id;

  -- Reply to comment = important
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author_id FROM comments WHERE id = NEW.parent_id;
    IF parent_author_id IS NOT NULL AND parent_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read, urgency)
      VALUES (
        parent_author_id, 'reply', 'Someone replied to your comment',
        commenter_name || ' replied to your comment on: "' || post_title_text || '"',
        '/campusfeed.html?post=' || NEW.post_id, false,
        'important'
      );
    END IF;
  END IF;

  -- Comment on post = normal
  IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read, urgency)
    VALUES (
      post_author_id, 'comment', 'New comment on your post',
      commenter_name || ' commented on your post: "' || post_title_text || '"',
      '/campusfeed.html?post=' || NEW.post_id, false,
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Update broadcast announcement trigger to set urgency = 'urgent' ──
CREATE OR REPLACE FUNCTION notify_broadcast_announcement()
RETURNS TRIGGER AS $$
DECLARE
  ann_comm_id  UUID;
  author_name  TEXT;
  post_preview TEXT;
  student_rec  RECORD;
BEGIN
  SELECT id INTO ann_comm_id FROM communities WHERE slug = 'ssg-announcements' LIMIT 1;
  IF ann_comm_id IS NULL OR NEW.community_id != ann_comm_id THEN RETURN NEW; END IF;

  SELECT first_name || ' ' || last_name INTO author_name FROM profiles WHERE id = NEW.author_id;
  post_preview := COALESCE(NEW.title, LEFT(regexp_replace(NEW.content, '^📢\s*\[ANNOUNCEMENT\]\s*', '', 'i'), 80));

  FOR student_rec IN
    SELECT id FROM profiles WHERE account_status = 'approved' AND id != NEW.author_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, is_read, urgency)
    VALUES (
      student_rec.id, 'announcement', '📢 New Announcement',
      '📢 ' || COALESCE(author_name, 'Admin') || ': ' || post_preview,
      '/campusfeed.html?post=' || NEW.id, false,
      'urgent'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Update flagged author notification to set urgency = 'critical' ──
CREATE OR REPLACE FUNCTION notify_author_on_flag_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_flagged = true AND NEW.author_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read, urgency)
    VALUES (
      NEW.author_id, 'mention', '⚠️ Post Flagged',
      '⚠️ Your post has been flagged for review. It may contain content that violates community guidelines. An admin will review it shortly.',
      '/campusfeed.html?post=' || NEW.id, false,
      'critical'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_author_on_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_flagged = true AND (OLD.is_flagged = false OR OLD.is_flagged IS NULL) THEN
    IF NEW.author_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read, urgency)
      VALUES (
        NEW.author_id, 'mention', '⚠️ Post Flagged',
        '⚠️ Your post has been flagged for review. It may contain content that violates community guidelines. An admin will review it shortly.',
        '/campusfeed.html?post=' || NEW.id, false,
        'critical'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Create index for urgency-based sorting ──
CREATE INDEX IF NOT EXISTS idx_notifications_urgency ON notifications(user_id, urgency, created_at DESC);

-- ── 8. Verify ──
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'notifications' AND column_name = 'urgency';
