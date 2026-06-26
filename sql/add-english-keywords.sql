-- Add English keywords to flagged_keywords table
INSERT INTO flagged_keywords (keyword, category, severity) VALUES
  ('kill myself',    'self_harm',    'critical'),
  ('want to die',    'self_harm',    'critical'),
  ('end my life',    'self_harm',    'critical'),
  ('suicide',        'self_harm',    'critical'),
  ('suicidal',       'self_harm',    'critical'),
  ('i want to kill', 'violence',     'critical'),
  ('kill you',       'violence',     'high'),
  ('i will kill',    'violence',     'high'),
  ('gonna kill',     'violence',     'high'),
  ('hurt you',       'violence',     'high'),
  ('i hate you',     'harassment',   'high'),
  ('bitch',          'harassment',   'high'),
  ('bastard',        'harassment',   'high'),
  ('asshole',        'harassment',   'high'),
  ('worthless',      'harassment',   'high'),
  ('nobody cares',   'self_harm',    'high'),
  ('i give up',      'self_harm',    'high'),
  ('stupid',         'harassment',   'medium'),
  ('idiot',          'harassment',   'medium'),
  ('loser',          'harassment',   'medium'),
  ('ugly',           'harassment',   'medium')
ON CONFLICT (keyword) DO NOTHING;
