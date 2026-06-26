-- ═══════════════════════════════════════════════════════════════
-- NOTIFY POST AUTHOR WHEN THEIR POST IS FLAGGED
-- Sends a warning notification to the user
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_author_on_flag()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when is_flagged changes from false to true
  IF NEW.is_flagged = true AND (OLD.is_flagged = false OR OLD.is_flagged IS NULL) THEN
    -- Don't notify anonymous posts (author_id could be null)
    IF NEW.author_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, link, is_read)
      VALUES (
        NEW.author_id,
        'mention',  -- reuse 'mention' type since there's no 'warning' type
        '⚠️ Post Flagged',
        '⚠️ Your post has been flagged for review. It may contain content that violates community guidelines. An admin will review it shortly.',
        '/campusfeed.html?post=' || NEW.id,
        false
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_author_flagged ON posts;
CREATE TRIGGER trigger_notify_author_flagged
  AFTER UPDATE OF is_flagged ON posts
  FOR EACH ROW
  EXECUTE FUNCTION notify_author_on_flag();

-- Also trigger on INSERT when the BEFORE trigger auto-flags
CREATE OR REPLACE FUNCTION notify_author_on_flag_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_flagged = true AND NEW.author_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, is_read)
    VALUES (
      NEW.author_id,
      'mention',
      '⚠️ Post Flagged',
      '⚠️ Your post has been flagged for review. It may contain content that violates community guidelines. An admin will review it shortly.',
      '/campusfeed.html?post=' || NEW.id,
      false
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_author_flagged_insert ON posts;
CREATE TRIGGER trigger_notify_author_flagged_insert
  AFTER INSERT ON posts
  FOR EACH ROW
  WHEN (NEW.is_flagged = true)
  EXECUTE FUNCTION notify_author_on_flag_insert();

-- Verify
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_name LIKE '%notify_author_flagged%';
