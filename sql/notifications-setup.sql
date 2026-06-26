-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATIONS SYSTEM — Module 4: Automated Notification System
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. MAKE SURE notifications TABLE HAS RLS ENABLED ──
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid duplicates
DROP POLICY IF EXISTS "Users can view own notifications"   ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications"    ON notifications;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System (triggers) can insert notifications for anyone
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ── 2. TRIGGER: Notify post author when someone LIKES their post ──
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id  UUID;
  post_title_text TEXT;
  liker_name      TEXT;
BEGIN
  -- Get the post author and title
  SELECT author_id, COALESCE(title, LEFT(content, 50))
  INTO post_author_id, post_title_text
  FROM posts
  WHERE id = NEW.post_id;

  -- Don't notify if user likes their own post
  IF post_author_id IS NULL OR post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get the liker's name
  SELECT first_name || ' ' || last_name
  INTO liker_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Insert notification for post author
  INSERT INTO notifications (user_id, type, title, message, link, is_read)
  VALUES (
    post_author_id,
    'like',
    'Someone liked your post',
    liker_name || ' liked your post: "' || post_title_text || '"',
    '/campusfeed.html?post=' || NEW.post_id,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_like ON post_likes;
CREATE TRIGGER trigger_notify_on_like
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_like();

-- ── 3. TRIGGER: Notify post author when someone COMMENTS on their post ──
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id  UUID;
  post_title_text TEXT;
  commenter_name  TEXT;
  parent_author_id UUID;
BEGIN
  -- Get the post author and title
  SELECT author_id, COALESCE(title, LEFT(content, 50))
  INTO post_author_id, post_title_text
  FROM posts
  WHERE id = NEW.post_id;

  -- Get commenter's name
  SELECT first_name || ' ' || last_name
  INTO commenter_name
  FROM profiles
  WHERE id = NEW.author_id;

  -- If this is a REPLY (has parent_id), notify the parent comment author too
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author_id
    FROM comments
    WHERE id = NEW.parent_id;

    -- Notify parent comment author (if not replying to themselves)
    IF parent_author_id IS NOT NULL AND parent_author_id != NEW.author_id THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        parent_author_id,
        'reply',
        'Someone replied to your comment',
        commenter_name || ' replied to your comment on: "' || post_title_text || '"',
        '/campusfeed.html?post=' || NEW.post_id,
        false
      );
    END IF;
  END IF;

  -- Notify post author about the comment (if not commenting on own post)
  IF post_author_id IS NOT NULL AND post_author_id != NEW.author_id THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      post_author_id,
      'comment',
      'New comment on your post',
      commenter_name || ' commented on your post: "' || post_title_text || '"',
      '/campusfeed.html?post=' || NEW.post_id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_comment ON comments;
CREATE TRIGGER trigger_notify_on_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_comment();

-- ── 4. VERIFY: Check triggers exist ──
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name IN ('trigger_notify_on_like', 'trigger_notify_on_comment')
ORDER BY trigger_name;
