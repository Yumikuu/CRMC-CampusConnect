-- ═══════════════════════════════════════════════════════════════
-- CREATE DEPARTMENT ADMIN ACCOUNTS
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── OPTION 1: Upgrade an existing student account to dept admin ──
-- Just change the email and role below, then run it.

-- For CSS Department Admin (change email to any registered student's email):
UPDATE profiles 
SET admin_role = 'CSS', account_status = 'approved'
WHERE email = 'REPLACE_WITH_STUDENT_EMAIL';

-- ── OPTION 2: Check what accounts you already have ──
-- Run this first to see all your registered users:
SELECT email, first_name, last_name, department, admin_role, account_status
FROM profiles
ORDER BY created_at DESC;

-- ── OPTION 3: Create one admin per department at once ──
-- Replace each email with real registered student emails you have

-- UPDATE profiles SET admin_role = 'CTE',  account_status = 'approved' WHERE email = 'cte_student@email.com';
-- UPDATE profiles SET admin_role = 'CSS',  account_status = 'approved' WHERE email = 'css_student@email.com';
-- UPDATE profiles SET admin_role = 'CBE',  account_status = 'approved' WHERE email = 'cbe_student@email.com';
-- UPDATE profiles SET admin_role = 'PSYCH',account_status = 'approved' WHERE email = 'psych_student@email.com';
-- UPDATE profiles SET admin_role = 'CCJE', account_status = 'approved' WHERE email = 'ccje_student@email.com';

-- ── VERIFY: Check the result after running ──
SELECT email, first_name, last_name, department, admin_role 
FROM profiles 
WHERE admin_role IN ('CTE','CSS','CBE','PSYCH','CCJE','SSG');
