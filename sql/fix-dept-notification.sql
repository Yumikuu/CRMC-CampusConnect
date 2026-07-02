-- ═══════════════════════════════════════════════════════════════
-- FIX: Department Admin Announcement Notifications
-- Notifies all students in the department when admin posts
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Drop old trigger first
DROP TRIGGER IF EXISTS trigger_dept_announcement ON posts;

-- Recreate the function: notify ALL dept students when admin posts in their dept community
CREATE OR REPLACE FUNCTION notify_dept_announcement()
RETURNS TRIGGER AS $$
DECLARE
  comm_dept     TEXT;
  comm_type     TEXT;
  comm_name     TEXT;
  author_name   TEXT;
  author_role   TEXT;
  post_preview  TEXT;
  student_rec   RECORD;
BEGIN
  -- Get the community details
  SELECT type, department, name INTO comm_type, comm_dept, comm_name
  FROM communities
  WHERE id = NEW.community_id;

  -- Only trigger for department communities
  IF comm_type != 'department' OR comm_dept IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verify the author is an admin (not a regular student)
  SELECT admin_role, first_name || ' ' || last_name
  INTO author_role, author_name
  FROM profiles
  WHERE id = NEW.author_id;

  IF author_role IS NULL OR author_role = 'student' THEN
    RETURN NEW;
  END IF;

  -- Build preview (strip announcement prefix)
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
    INSERT INTO notifications (user_id, type, title, message, link, is_read, urgency)
    VALUES (
      student_rec.id,
      'announcement',
      '📢 Department Announcement',
      '📢 ' || COALESCE(author_name, 'Admin') || ': ' || post_preview,
      '/campusfeed.html?post=' || NEW.id,
      false,
      'urgent'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger fires on ANY post by admin in dept community (not just pinned)
CREATE TRIGGER trigger_dept_announcement
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_dept_announcement();

-- Verify trigger exists
SELECT trigger_name, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_dept_announcement';
