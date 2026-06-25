-- ═══════════════════════════════════════════════════════════════
-- ADD SLANG / CODED KEYWORDS to flagged_keywords table
-- These are commonly used coded words in Filipino/Bisaya student contexts
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

INSERT INTO flagged_keywords (keyword, category, severity) VALUES
  -- Number/letter coded words
  ('8080',        'harassment',    'medium'),
  ('8o8o',        'harassment',    'medium'),
  ('g4g0',        'harassment',    'medium'),
  ('bog0',        'harassment',    'medium'),
  
  -- Tagalog shortened/coded
  ('pota',        'inappropriate', 'high'),
  ('potangina',   'inappropriate', 'high'),
  ('ptngina',     'inappropriate', 'high'),
  ('tangina',     'inappropriate', 'high'),
  ('tanginamo',   'inappropriate', 'high'),
  ('kingina',     'inappropriate', 'high'),
  ('ulul',        'harassment',    'medium'),
  ('engot',       'harassment',    'medium'),
  ('ungas',       'harassment',    'medium'),
  ('inutil',      'harassment',    'medium'),
  ('tarantado',   'harassment',    'medium'),
  ('punyeta',     'inappropriate', 'medium'),
  ('bwisit',      'inappropriate', 'low'),
  ('siraulo',     'harassment',    'medium'),
  
  -- Bisaya slang
  ('buang',       'harassment',    'medium'),
  ('buanga',      'harassment',    'medium'),
  ('yawa',        'inappropriate', 'high'),
  ('bilat',       'inappropriate', 'high'),
  ('piste',       'inappropriate', 'medium'),
  ('giatay',      'inappropriate', 'medium'),
  ('bogo',        'harassment',    'medium'),
  
  -- Social media coded
  ('kms',         'self_harm',     'critical'),
  ('kys',         'violence',      'critical'),
  ('fml',         'inappropriate', 'medium'),
  ('stfu',        'harassment',    'medium'),
  ('gtfo',        'harassment',    'medium')
ON CONFLICT (keyword) DO NOTHING;

-- Verify
SELECT keyword, category, severity FROM flagged_keywords ORDER BY severity, keyword;
