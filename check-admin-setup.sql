-- ═══════════════════════════════════════════════════════════════
-- ADMIN SETUP DIAGNOSTIC SCRIPT
-- ═══════════════════════════════════════════════════════════════
-- Run this to verify admin accounts are set up correctly
-- ═══════════════════════════════════════════════════════════════

-- ── Check 1: Do auth users exist? ──
SELECT 
  'AUTH USERS' as check_type,
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ NOT CONFIRMED'
    ELSE '✅ CONFIRMED'
  END as status
FROM auth.users 
WHERE email LIKE '%admin@crmc.edu'
ORDER BY email;

-- ── Check 2: Do profiles exist with admin_role? ──
SELECT 
  'PROFILES' as check_type,
  id,
  email,
  first_name,
  last_name,
  admin_role,
  CASE 
    WHEN admin_role IS NULL THEN '❌ NO ADMIN ROLE'
    WHEN admin_role = 'student' THEN '❌ STUDENT ROLE'
    ELSE '✅ ADMIN ROLE SET'
  END as status
FROM profiles 
WHERE email LIKE '%admin@crmc.edu'
ORDER BY email;

-- ── Check 3: Are auth users linked to profiles? ──
SELECT 
  'AUTH-PROFILE LINK' as check_type,
  au.email,
  CASE 
    WHEN p.id IS NULL THEN '❌ NO PROFILE'
    WHEN p.admin_role IS NULL THEN '❌ NO ADMIN ROLE'
    ELSE '✅ LINKED WITH ADMIN ROLE'
  END as status,
  p.admin_role
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email LIKE '%admin@crmc.edu'
ORDER BY au.email;

-- ── Check 4: List all admin accounts (should show 6) ──
SELECT 
  'FINAL ADMIN LIST' as check_type,
  p.email,
  p.first_name || ' ' || p.last_name as name,
  p.admin_role,
  p.department,
  au.email_confirmed_at IS NOT NULL as email_confirmed
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

-- ═══════════════════════════════════════════════════════════════
-- TROUBLESHOOTING GUIDE
-- ═══════════════════════════════════════════════════════════════
-- 
-- If "NOT CONFIRMED" appears:
--   → Go to Supabase Dashboard → Authentication → Users
--   → Click on the user
--   → Click "Confirm email" or "Send confirmation email"
--
-- If "NO ADMIN ROLE" appears:
--   → Run the execute-create-admins.sql script again
--
-- If "NO PROFILE" appears:
--   → The profile was not created
--   → Run the execute-create-admins.sql script
--
-- ═══════════════════════════════════════════════════════════════
