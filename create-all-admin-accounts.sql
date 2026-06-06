-- ═══════════════════════════════════════════════════════════════
-- CREATE ALL ADMIN ACCOUNTS - COMPLETE SETUP
-- ═══════════════════════════════════════════════════════════════
-- IMPORTANT: This script creates admin profiles, but you need to 
-- create the auth users first via Supabase Dashboard
-- ═══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- PART 1: CREATE AUTH USERS (Do this in Supabase Dashboard First!)
-- ══════════════════════════════════════════════════════════════
-- Go to: Supabase Dashboard → Authentication → Users → Add User
-- 
-- Create these 6 users:
-- 
-- 1. SSG Admin
--    Email: ssg.admin@crmc.edu
--    Password: SSG@Admin2024
--    Confirm email: YES
--
-- 2. CTE Admin  
--    Email: cte.admin@crmc.edu
--    Password: CTE@Admin2024
--    Confirm email: YES
--
-- 3. CSS Admin
--    Email: css.admin@crmc.edu
--    Password: CSS@Admin2024
--    Confirm email: YES
--
-- 4. CBE Admin
--    Email: cbe.admin@crmc.edu
--    Password: CBE@Admin2024
--    Confirm email: YES
--
-- 5. PSYCH Admin
--    Email: psych.admin@crmc.edu
--    Password: PSYCH@Admin2024
--    Confirm email: YES
--
-- 6. CCJE Admin
--    Email: ccje.admin@crmc.edu
--    Password: CCJE@Admin2024
--    Confirm email: YES
--
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- PART 2: CREATE/UPDATE PROFILES (Run this SQL after creating auth users)
-- ══════════════════════════════════════════════════════════════

-- Get the user IDs we just created (for reference)
SELECT id, email FROM auth.users 
WHERE email LIKE '%admin@crmc.edu' 
ORDER BY email;

-- Insert or update profiles for all admin accounts
-- Note: If your registration system already created profiles, this will update them
-- If not, you may need to insert them manually

-- ── 1. SSG Admin (Supreme Student Government) ──
INSERT INTO profiles (id, email, full_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'ssg.admin@crmc.edu',
  'SSG Administrator',
  'SSG-2024-001',
  NULL,
  'SSG',
  'Supreme Student Government Administrator - Full Campus Access'
FROM auth.users 
WHERE email = 'ssg.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'SSG Administrator',
  student_id = 'SSG-2024-001',
  admin_role = 'SSG',
  bio = 'Supreme Student Government Administrator - Full Campus Access';

-- ── 2. CTE Admin (College of Teacher Education) ──
INSERT INTO profiles (id, email, full_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'cte.admin@crmc.edu',
  'CTE Administrator',
  'CTE-2024-001',
  'College of Teacher Education (CTE)',
  'CTE',
  'College of Teacher Education Administrator'
FROM auth.users 
WHERE email = 'cte.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'CTE Administrator',
  student_id = 'CTE-2024-001',
  department = 'College of Teacher Education (CTE)',
  admin_role = 'CTE',
  bio = 'College of Teacher Education Administrator';

-- ── 3. CSS Admin (College of Computer Studies) ──
INSERT INTO profiles (id, email, full_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'css.admin@crmc.edu',
  'CSS Administrator',
  'CSS-2024-001',
  'College of Computer Studies (CSS)',
  'CSS',
  'College of Computer Studies Administrator'
FROM auth.users 
WHERE email = 'css.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'CSS Administrator',
  student_id = 'CSS-2024-001',
  department = 'College of Computer Studies (CSS)',
  admin_role = 'CSS',
  bio = 'College of Computer Studies Administrator';

-- ── 4. CBE Admin (College of Business and Entrepreneurship) ──
INSERT INTO profiles (id, email, full_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'cbe.admin@crmc.edu',
  'CBE Administrator',
  'CBE-2024-001',
  'College of Business and Entrepreneurship (CBE)',
  'CBE',
  'College of Business and Entrepreneurship Administrator'
FROM auth.users 
WHERE email = 'cbe.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'CBE Administrator',
  student_id = 'CBE-2024-001',
  department = 'College of Business and Entrepreneurship (CBE)',
  admin_role = 'CBE',
  bio = 'College of Business and Entrepreneurship Administrator';

-- ── 5. PSYCH Admin (Psychology Department) ──
INSERT INTO profiles (id, email, full_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'psych.admin@crmc.edu',
  'Psychology Administrator',
  'PSYCH-2024-001',
  'Psychology (PSYCH)',
  'PSYCH',
  'Psychology Department Administrator'
FROM auth.users 
WHERE email = 'psych.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'Psychology Administrator',
  student_id = 'PSYCH-2024-001',
  department = 'Psychology (PSYCH)',
  admin_role = 'PSYCH',
  bio = 'Psychology Department Administrator';

-- ── 6. CCJE Admin (College of Criminal Justice Education) ──
INSERT INTO profiles (id, email, full_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'ccje.admin@crmc.edu',
  'CCJE Administrator',
  'CCJE-2024-001',
  'College of Criminal Justice Education (CCJE)',
  'CCJE',
  'College of Criminal Justice Education Administrator'
FROM auth.users 
WHERE email = 'ccje.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  full_name = 'CCJE Administrator',
  student_id = 'CCJE-2024-001',
  department = 'College of Criminal Justice Education (CCJE)',
  admin_role = 'CCJE',
  bio = 'College of Criminal Justice Education Administrator';

-- ══════════════════════════════════════════════════════════════
-- PART 3: VERIFY ALL ADMIN ACCOUNTS CREATED
-- ══════════════════════════════════════════════════════════════

SELECT 
  p.id,
  p.email,
  p.full_name,
  p.student_id,
  p.department,
  p.admin_role,
  au.email_confirmed_at,
  au.created_at
FROM profiles p
JOIN auth.users au ON au.id = p.id
WHERE p.admin_role IS NOT NULL
ORDER BY 
  CASE p.admin_role 
    WHEN 'SSG' THEN 1 
    WHEN 'CTE' THEN 2
    WHEN 'CSS' THEN 3
    WHEN 'CBE' THEN 4
    WHEN 'PSYCH' THEN 5
    WHEN 'CCJE' THEN 6
  END;

-- ══════════════════════════════════════════════════════════════
-- EXPECTED OUTPUT: 6 Admin Accounts
-- ══════════════════════════════════════════════════════════════
--
-- | email               | full_name            | admin_role | department |
-- |---------------------|----------------------|------------|------------|
-- | ssg.admin@crmc.edu  | SSG Administrator    | SSG        | NULL       |
-- | cte.admin@crmc.edu  | CTE Administrator    | CTE        | CTE        |
-- | css.admin@crmc.edu  | CSS Administrator    | CSS        | CSS        |
-- | cbe.admin@crmc.edu  | CBE Administrator    | CBE        | CBE        |
-- | psych.admin@crmc.edu| Psychology Admin     | PSYCH      | PSYCH      |
-- | ccje.admin@crmc.edu | CCJE Administrator   | CCJE       | CCJE       |
--
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- PART 4: TEST ADMIN LOGIN
-- ══════════════════════════════════════════════════════════════
-- 
-- Admin Login URL: http://localhost:8080/admin/login.html
-- (or your deployed URL)
--
-- Test Credentials:
--
-- SSG Admin (Full Access):
--   Email: ssg.admin@crmc.edu
--   Password: SSG@Admin2024
--   Expected: Redirect to /admin/ssg-dashboard.html
--
-- CTE Admin (Department Only):
--   Email: cte.admin@crmc.edu
--   Password: CTE@Admin2024
--   Expected: Redirect to /admin/dept-dashboard.html
--
-- CSS Admin (Department Only):
--   Email: css.admin@crmc.edu
--   Password: CSS@Admin2024
--   Expected: Redirect to /admin/dept-dashboard.html
--
-- (Same pattern for CBE, PSYCH, CCJE admins)
--
-- ══════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════
-- TROUBLESHOOTING
-- ══════════════════════════════════════════════════════════════

-- Check if auth users exist:
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
WHERE email LIKE '%admin@crmc.edu';

-- Check if profiles exist:
SELECT id, email, full_name, admin_role 
FROM profiles 
WHERE email LIKE '%admin@crmc.edu';

-- Check if profiles are missing (auth user exists but no profile):
SELECT au.id, au.email, 'Missing Profile' as status
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email LIKE '%admin@crmc.edu' AND p.id IS NULL;

-- Manually assign admin role if needed:
-- UPDATE profiles SET admin_role = 'SSG' WHERE email = 'ssg.admin@crmc.edu';

-- ══════════════════════════════════════════════════════════════
-- SECURITY NOTES
-- ══════════════════════════════════════════════════════════════
-- 
-- ⚠️ CHANGE DEFAULT PASSWORDS IMMEDIATELY AFTER FIRST LOGIN!
-- 
-- These are temporary passwords for initial setup.
-- Each admin should change their password on first login via:
-- 1. Supabase Dashboard → User Settings
-- 2. Or implement a "Change Password" feature in admin dashboard
--
-- Default passwords follow pattern: [ROLE]@Admin2024
-- Make sure to use strong, unique passwords in production!
--
-- ══════════════════════════════════════════════════════════════
