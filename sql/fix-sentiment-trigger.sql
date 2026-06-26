-- ═══════════════════════════════════════════════════════════════
-- FIX SENTIMENT SCORING IN DATABASE TRIGGER
-- This replaces the AFTER INSERT trigger to correctly set
-- sentiment and score based on keywords found
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- Drop old after trigger and function
DROP TRIGGER IF EXISTS trigger_auto_flag_post_after ON posts;
DROP TRIGGER IF EXISTS trigger_auto_flag_post_after_update ON posts;
DROP FUNCTION IF EXISTS auto_flag_post_after();

-- New combined function that handles BOTH flagging AND sentiment
CREATE OR REPLACE FUNCTION auto_flag_post_after()
RETURNS TRIGGER AS $$
DECLARE
  post_text       TEXT;
  kw              RECORD;
  matched_kws     TEXT[]  := ARRAY[]::TEXT[];
  matched_cats    TEXT[]  := ARRAY[]::TEXT[];
  highest_sev     TEXT    := 'none';
  sentiment_val   TEXT    := 'neutral';
  score_val       NUMERIC := 0.00;
  sev_order       INT;
  current_order   INT;
BEGIN
  -- Combine title + content, lowercase
  post_text := LOWER(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));

  -- Scan every keyword
  FOR kw IN SELECT keyword, category, severity FROM flagged_keywords LOOP
    IF post_text LIKE '%' || kw.keyword || '%' THEN
      matched_kws := array_append(matched_kws, kw.keyword);
      IF NOT (kw.category = ANY(matched_cats)) THEN
        matched_cats := array_append(matched_cats, kw.category);
      END IF;
      sev_order := CASE kw.severity
        WHEN 'critical' THEN 4
        WHEN 'high'     THEN 3
        WHEN 'medium'   THEN 2
        WHEN 'low'      THEN 1
        ELSE 0
      END;
      current_order := CASE highest_sev
        WHEN 'critical' THEN 4
        WHEN 'high'     THEN 3
        WHEN 'medium'   THEN 2
        WHEN 'low'      THEN 1
        ELSE 0
      END;
      IF sev_order > current_order THEN
        highest_sev := kw.severity;
      END IF;
    END IF;
  END LOOP;

  -- Set sentiment and score based on highest severity found
  CASE highest_sev
    WHEN 'critical' THEN
      sentiment_val := 'critical';
      score_val     := -1.00;
    WHEN 'high' THEN
      sentiment_val := 'negative';
      score_val     := -0.75;
    WHEN 'medium' THEN
      sentiment_val := 'negative';
      score_val     := -0.40;
    WHEN 'low' THEN
      sentiment_val := 'neutral';
      score_val     := -0.10;
    ELSE
      sentiment_val := 'neutral';
      score_val     := 0.00;
  END CASE;

  -- Insert or update the sentiment record
  INSERT INTO post_sentiment (post_id, sentiment, score, matched_keywords, matched_categories, analyzed_at)
  VALUES (NEW.id, sentiment_val, score_val, matched_kws, matched_cats, NOW())
  ON CONFLICT (post_id) DO UPDATE SET
    sentiment          = EXCLUDED.sentiment,
    score              = EXCLUDED.score,
    matched_keywords   = EXCLUDED.matched_keywords,
    matched_categories = EXCLUDED.matched_categories,
    analyzed_at        = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach AFTER INSERT trigger
CREATE TRIGGER trigger_auto_flag_post_after
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_post_after();

-- Re-attach AFTER UPDATE trigger
CREATE TRIGGER trigger_auto_flag_post_after_update
  AFTER UPDATE OF content, title ON posts
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION auto_flag_post_after();
