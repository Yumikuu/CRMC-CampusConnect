-- ═══════════════════════════════════════════════════════════════
-- AUTO-FLAGGING SYSTEM — AI-Assisted Content Detection
-- Module 3: Sentiment Analysis & Content Detection
-- Run this entire script in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── 1. CREATE FLAGGED KEYWORDS TABLE ──
-- Stores the keywords/patterns the system watches for
CREATE TABLE IF NOT EXISTS flagged_keywords (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword     TEXT NOT NULL UNIQUE,
  category    TEXT NOT NULL CHECK (category IN ('harassment', 'violence', 'self_harm', 'spam', 'inappropriate', 'urgent')),
  severity    TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. SEED KEYWORDS ──
-- Filipino + English keywords relevant to a school environment
INSERT INTO flagged_keywords (keyword, category, severity) VALUES
  -- Self-harm / distress (critical)
  ('suicidal',        'self_harm',    'critical'),
  ('kill myself',     'self_harm',    'critical'),
  ('want to die',     'self_harm',    'critical'),
  ('end my life',     'self_harm',    'critical'),
  ('gusto ko nang mamatay', 'self_harm', 'critical'),
  ('di ko na kaya',   'self_harm',    'high'),
  ('wala na akong silbi', 'self_harm', 'high'),

  -- Violence / threats (high)
  ('bomb',            'violence',     'high'),
  ('threat',          'violence',     'high'),
  ('kill',            'violence',     'high'),
  ('attack',          'violence',     'high'),
  ('patayin',         'violence',     'high'),
  ('pagbabanta',      'violence',     'high'),

  -- Harassment / bullying (high)
  ('bully',           'harassment',   'high'),
  ('harass',          'harassment',   'high'),
  ('blackmail',       'harassment',   'high'),
  ('gago',            'harassment',   'medium'),
  ('bobo',            'harassment',   'medium'),
  ('tanga',           'harassment',   'medium'),
  ('putang ina',      'harassment',   'high'),
  ('tang ina',        'harassment',   'high'),
  ('leche',           'harassment',   'medium'),

  -- Inappropriate content (medium)
  ('nude',            'inappropriate','high'),
  ('porn',            'inappropriate','high'),
  ('sex',             'inappropriate','medium'),
  ('drugs',           'inappropriate','high'),
  ('shabu',           'inappropriate','high'),
  ('marijuana',       'inappropriate','high'),

  -- Spam patterns (low)
  ('free money',      'spam',         'low'),
  ('click here',      'spam',         'low'),
  ('buy now',         'spam',         'low'),
  ('promo',           'spam',         'low'),

  -- Urgent / distress (flagged for admin attention)
  ('help me',         'urgent',       'medium'),
  ('emergency',       'urgent',       'high'),
  ('tulong',          'urgent',       'medium'),
  ('saklolo',         'urgent',       'high'),
  ('nasaktan',        'urgent',       'medium'),
  ('inaabuso',        'urgent',       'high'),
  ('inabuso',         'urgent',       'high')

ON CONFLICT (keyword) DO NOTHING;

-- ── 3. SENTIMENT SCORES TABLE ──
-- Stores the analysis result for each post
CREATE TABLE IF NOT EXISTS post_sentiment (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE UNIQUE,
  sentiment     TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative', 'critical')),
  score         NUMERIC(4,2) DEFAULT 0,   -- -1.0 (very negative) to 1.0 (very positive)
  matched_keywords  TEXT[],               -- which keywords triggered the flag
  matched_categories TEXT[],              -- which categories were matched
  analyzed_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4A. BEFORE INSERT TRIGGER — sets is_flagged on the post row ──
CREATE OR REPLACE FUNCTION auto_flag_post_before()
RETURNS TRIGGER AS $$
DECLARE
  post_text       TEXT;
  kw              RECORD;
  matched_kws     TEXT[]  := ARRAY[]::TEXT[];
  matched_cats    TEXT[]  := ARRAY[]::TEXT[];
  highest_sev     TEXT    := 'none';
  should_flag     BOOLEAN := false;
  flag_reason_val TEXT    := '';
  sev_order       INT;
  current_order   INT;
BEGIN
  post_text := LOWER(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));

  FOR kw IN SELECT keyword, category, severity FROM flagged_keywords LOOP
    IF post_text LIKE '%' || kw.keyword || '%' THEN
      matched_kws := array_append(matched_kws, kw.keyword);
      IF NOT (kw.category = ANY(matched_cats)) THEN
        matched_cats := array_append(matched_cats, kw.category);
      END IF;
      sev_order := CASE kw.severity
        WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
      END;
      current_order := CASE highest_sev
        WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
      END;
      IF sev_order > current_order THEN highest_sev := kw.severity; END IF;
    END IF;
  END LOOP;

  IF array_length(matched_kws, 1) > 0 THEN
    CASE highest_sev
      WHEN 'critical' THEN
        should_flag     := true;
        flag_reason_val := 'Critical content detected: ' || array_to_string(matched_kws, ', ');
      WHEN 'high' THEN
        should_flag     := true;
        flag_reason_val := 'High-risk content detected: ' || array_to_string(matched_kws, ', ');
      WHEN 'medium' THEN
        should_flag     := true;
        flag_reason_val := 'Potentially inappropriate content: ' || array_to_string(matched_kws, ', ');
      ELSE
        should_flag := false;
    END CASE;
  END IF;

  IF should_flag THEN
    NEW.is_flagged        := true;
    NEW.flag_reason       := flag_reason_val;
    NEW.moderation_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4B. AFTER INSERT TRIGGER — writes sentiment record once post row exists ──
CREATE OR REPLACE FUNCTION auto_flag_post_after()
RETURNS TRIGGER AS $$
DECLARE
  post_text      TEXT;
  kw             RECORD;
  matched_kws    TEXT[]  := ARRAY[]::TEXT[];
  matched_cats   TEXT[]  := ARRAY[]::TEXT[];
  highest_sev    TEXT    := 'none';
  sentiment_val  TEXT    := 'neutral';
  score_val      NUMERIC := 0;
  sev_order      INT;
  current_order  INT;
BEGIN
  post_text := LOWER(COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.content, ''));

  FOR kw IN SELECT keyword, category, severity FROM flagged_keywords LOOP
    IF post_text LIKE '%' || kw.keyword || '%' THEN
      matched_kws := array_append(matched_kws, kw.keyword);
      IF NOT (kw.category = ANY(matched_cats)) THEN
        matched_cats := array_append(matched_cats, kw.category);
      END IF;
      sev_order := CASE kw.severity
        WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
      END;
      current_order := CASE highest_sev
        WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0
      END;
      IF sev_order > current_order THEN highest_sev := kw.severity; END IF;
    END IF;
  END LOOP;

  IF array_length(matched_kws, 1) > 0 THEN
    CASE highest_sev
      WHEN 'critical' THEN sentiment_val := 'critical'; score_val := -1.0;
      WHEN 'high'     THEN sentiment_val := 'negative'; score_val := -0.75;
      WHEN 'medium'   THEN sentiment_val := 'negative'; score_val := -0.4;
      WHEN 'low'      THEN sentiment_val := 'neutral';  score_val := -0.1;
      ELSE NULL;
    END CASE;
  END IF;

  INSERT INTO post_sentiment (post_id, sentiment, score, matched_keywords, matched_categories)
  VALUES (NEW.id, sentiment_val, score_val, matched_kws, matched_cats)
  ON CONFLICT (post_id) DO UPDATE SET
    sentiment          = EXCLUDED.sentiment,
    score              = EXCLUDED.score,
    matched_keywords   = EXCLUDED.matched_keywords,
    matched_categories = EXCLUDED.matched_categories,
    analyzed_at        = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. ATTACH TRIGGERS TO POSTS TABLE ──

-- BEFORE INSERT: set is_flagged on the new row
DROP TRIGGER IF EXISTS trigger_auto_flag_post_before ON posts;
CREATE TRIGGER trigger_auto_flag_post_before
  BEFORE INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_post_before();

-- AFTER INSERT: write sentiment record (post row now exists)
DROP TRIGGER IF EXISTS trigger_auto_flag_post_after ON posts;
CREATE TRIGGER trigger_auto_flag_post_after
  AFTER INSERT ON posts
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_post_after();

-- BEFORE UPDATE: re-check flagging if content changes
DROP TRIGGER IF EXISTS trigger_auto_flag_post_update ON posts;
CREATE TRIGGER trigger_auto_flag_post_update
  BEFORE UPDATE OF content, title ON posts
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION auto_flag_post_before();

-- AFTER UPDATE: re-write sentiment if content changes
DROP TRIGGER IF EXISTS trigger_auto_flag_post_after_update ON posts;
CREATE TRIGGER trigger_auto_flag_post_after_update
  AFTER UPDATE OF content, title ON posts
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content OR OLD.title IS DISTINCT FROM NEW.title)
  EXECUTE FUNCTION auto_flag_post_after();

-- ── 6. RLS POLICIES FOR NEW TABLES ──
ALTER TABLE flagged_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_sentiment   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage flagged keywords"        ON flagged_keywords;
DROP POLICY IF EXISTS "Post sentiment readable by author and admins" ON post_sentiment;
DROP POLICY IF EXISTS "System can write sentiment scores"         ON post_sentiment;
DROP POLICY IF EXISTS "System can update sentiment scores"        ON post_sentiment;

CREATE POLICY "Admins can manage flagged keywords"
  ON flagged_keywords FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
    )
  );

CREATE POLICY "Post sentiment readable by author and admins"
  ON post_sentiment FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_sentiment.post_id
      AND posts.author_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND admin_role IN ('SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE')
    )
  );

CREATE POLICY "System can write sentiment scores"
  ON post_sentiment FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update sentiment scores"
  ON post_sentiment FOR UPDATE
  USING (true);

-- ── 7. HELPER VIEW FOR ADMIN DASHBOARD ──
-- Admins can query this to see flagged posts with sentiment info
CREATE OR REPLACE VIEW flagged_posts_with_sentiment AS
  SELECT
    p.id,
    p.content,
    p.title,
    p.flag_reason,
    p.is_flagged,
    p.moderation_status,
    p.created_at,
    ps.sentiment,
    ps.score,
    ps.matched_keywords,
    ps.matched_categories,
    pr.first_name,
    pr.last_name,
    pr.department,
    c.name AS community_name
  FROM posts p
  LEFT JOIN post_sentiment ps ON ps.post_id = p.id
  LEFT JOIN profiles pr       ON pr.id = p.author_id
  LEFT JOIN communities c     ON c.id = p.community_id
  WHERE p.is_flagged = true
  ORDER BY
    CASE ps.sentiment
      WHEN 'critical' THEN 1
      WHEN 'negative' THEN 2
      ELSE 3
    END,
    p.created_at DESC;

-- ── DONE ──
-- Test it: insert a post with content 'gago ka' and check is_flagged = true
-- SELECT * FROM flagged_posts_with_sentiment;
