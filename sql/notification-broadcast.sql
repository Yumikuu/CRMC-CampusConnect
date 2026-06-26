-- ═══════════════════════════════════════════════════════════════
-- BROADCAST NOTIFICATIONS — Module 4 Enhancement
-- Sends notifications to all students when admin posts an announcement
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Enable Supabase Realtime on the notifications table ──
-- This allows the client to subscribe to live changes
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ── 2. TRIGGER: Broadcast notification when a post is created in ssg-announcements ──
CREATE OR REPLACE FUNCTION notify_broadcast_announcement()
RETURNS TRIGGER AS $$
DECLARE
  ann_comm_id  UUID;
  author_name  TEXT;
  post_preview TEXT;
  student_rec  RECORD;
BEGIN
  -- Get the ssg-announcements community ID
  SELECT id INTO ann_comm_id
  FROM communities
  WHERE slug = 'ssg-announcements'
  LIMIT 1;

  -- Only trigger for posts in ssg-announcements community
  IF ann_comm_id IS NULL OR NEW.community_id != ann_comm_id THEN
    RETURN NEW;
  END IF;

  -- Get the author's name
  SELECT first_name || ' ' || last_name
  INTO author_name
  FROM profiles
  WHERE id = NEW.author_id;

  -- Build a short preview of the announcement (strip the prefix)
  post_preview := COALESCE(
    NEW.title,
    LEFT(regexp_replace(NEW.content, '^📢\s*\[ANNOUNCEMENT\]\s*', '', 'i'), 80)
  );

  -- Notify ALL approved students (not the author themselves)
  FOR student_rec IN
    SELECT id FROM profiles
    WHERE account_status = 'approved'
      AND id != NEW.author_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      student_rec.id,
      'announcement',
      '📢 New Announcement',
      '📢 ' || COALESCE(author_name, 'Admin') || ': ' || post_preview,
      '/campusfeed.html?post=' || NEW.id,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_broadcast_announcement ON posts;
CREATE TRIGGER trigger_broadcast_announcement
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_broadcast_announcement();


-- ── 3. TRIGGER: Department-specific broadcast for dept admin announcements ──
-- When a dept admin posts in their department community with is_pinned = true,
-- notify all students in that department
CREATE OR REPLACE FUNCTION notify_dept_announcement()
RETURNS TRIGGER AS $$
DECLARE
  comm_dept     TEXT;
  comm_type     TEXT;
  author_name   TEXT;
  author_role   TEXT;
  post_preview  TEXT;
  student_rec   RECORD;
BEGIN
  -- Only trigger for pinned posts (announcements)
  IF NOT NEW.is_pinned THEN
    RETURN NEW;
  END IF;

  -- Get the community details
  SELECT type, department INTO comm_type, comm_dept
  FROM communities
  WHERE id = NEW.community_id;

  -- Only trigger for department communities (not public ones or ssg-announcements)
  IF comm_type != 'department' OR comm_dept IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verify the author is an admin (not a regular student pinning somehow)
  SELECT admin_role, first_name || ' ' || last_name
  INTO author_role, author_name
  FROM profiles
  WHERE id = NEW.author_id;

  IF author_role IS NULL OR author_role = 'student' THEN
    RETURN NEW;
  END IF;

  -- Build preview
  post_preview := COALESCE(
    NEW.title,
    LEFT(regexp_replace(NEW.content, '^📢\s*\[ANNOUNCEMENT\]\s*', '', 'i'), 80)
  );

  -- Notify all approved students in this department
  FOR student_rec IN
    SELECT id FROM profiles
    WHERE account_status = 'approved'
      AND department ILIKE '%' || comm_dept || '%'
      AND id != NEW.author_id
  LOOP
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      student_rec.id,
      'announcement',
      '📢 Department Announcement',
      '📢 ' || COALESCE(author_name, 'Admin') || ': ' || post_preview,
      '/campusfeed.html?post=' || NEW.id,
      false
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_dept_announcement ON posts;
CREATE TRIGGER trigger_dept_announcement
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_dept_announcement();


-- ── 4. TRIGGER: Notify on @mention in posts ──
-- This is a server-side backup for @mention detection
-- (the client-side also handles it, but this catches admin panel posts too)
CREATE OR REPLACE FUNCTION notify_on_mention()
RETURNS TRIGGER AS $$
DECLARE
  mention_match  TEXT;
  mentioned_user RECORD;
  author_name    TEXT;
BEGIN
  -- Get author name
  SELECT first_name || ' ' || last_name INTO author_name
  FROM profiles WHERE id = NEW.author_id;

  -- Look for @FirstName LastName patterns in post content
  FOR mention_match IN
    SELECT (regexp_matches(NEW.content, '@([A-Za-z]+ [A-Za-z]+)', 'g'))[1]
  LOOP
    -- Try to find this user
    SELECT id, first_name, last_name INTO mentioned_user
    FROM profiles
    WHERE (first_name || ' ' || last_name) ILIKE mention_match
    LIMIT 1;

    -- If found and not the author, send notification
    IF mentioned_user.id IS NOT NULL AND mentioned_user.id != NEW.author_id THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        mentioned_user.id,
        'mention',
        'You were mentioned',
        COALESCE(author_name, 'Someone') || ' mentioned you in a post',
        '/campusfeed.html?post=' || NEW.id,
        false
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_on_mention ON posts;
CREATE TRIGGER trigger_notify_on_mention
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_mention();


-- ── 5. VERIFY: Check all notification triggers are set up ──
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_notify%' OR trigger_name LIKE 'trigger_broadcast%' OR trigger_name LIKE 'trigger_dept%'
ORDER BY trigger_name;
