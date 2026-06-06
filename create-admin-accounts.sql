-- ═══════════════════════════════════════════════════════════════
-- CREATE ADMIN ACCOUNTS SCRIPT
-- ═══════════════════════════════════════════════════════════════
-- Instructions:
-- 1. First, make sure the user has registered normally on your site
-- 2. Replace the email addresses below with actual user emails
-- 3. Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ── OPTION 1: Assign SSG Admin (Full Campus Access) ──
-- Replace 'ssg-admin@example.com' with the actual SSG admin email
UPDATE profiles 
SET admin_role = 'SSG' 
WHERE email = 'ssg-admin@example.com';

-- ── OPTION 2: Assign Department Admins ──
-- Replace emails with actual department admin emails

-- CTE Admin (College of Teacher Education)
UPDATE profiles 
SET admin_role = 'CTE' 
WHERE email = 'cte-admin@example.com';

-- CSS Admin (College of Computer Studies)
UPDATE profiles 
SET admin_role = 'CSS' 
WHERE email = 'css-admin@example.com';

-- CBE Admin (College of Business and Entrepreneurship)
UPDATE profiles 
SET admin_role = 'CBE' 
WHERE email = 'cbe-admin@example.com';

-- PSYCH Admin (Psychology Department)
UPDATE profiles 
SET admin_role = 'PSYCH' 
WHERE email = 'psych-admin@example.com';

-- CCJE Admin (College of Criminal Justice Education)
UPDATE profiles 
SET admin_role = 'CCJE' 
WHERE email = 'ccje-admin@example.com';

-- ═══════════════════════════════════════════════════════════════
-- VERIFY ADMIN ACCOUNTS
-- ═══════════════════════════════════════════════════════════════
-- Run this query to check which users are admins:

SELECT 
  id,
  email,
  full_name,
  admin_role,
  created_at
FROM profiles
WHERE admin_role IS NOT NULL
ORDER BY admin_role, email;

-- ═══════════════════════════════════════════════════════════════
-- REMOVE ADMIN ACCESS (if needed)
-- ═══════════════════════════════════════════════════════════════
-- To remove admin access from a user:
-- UPDATE profiles SET admin_role = NULL WHERE email = 'user@example.com';

-- ═══════════════════════════════════════════════════════════════
-- QUICK REFERENCE
-- ═══════════════════════════════════════════════════════════════
-- Admin Roles:
--   • SSG    → Supreme Student Government (full access)
--   • CTE    → College of Teacher Education (department only)
--   • CSS    → College of Computer Studies (department only)
--   • CBE    → College of Business and Entrepreneurship (department only)
--   • PSYCH  → Psychology Department (department only)
--   • CCJE   → College of Criminal Justice Education (department only)
-- 
-- Admin Login URL: /admin/login.html
-- Student Login URL: /landing page/index.html
-- ═══════════════════════════════════════════════════════════════
