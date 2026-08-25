-- Create/Update Admin Profiles
-- Run this after creating auth users in Supabase Dashboard

-- Get the user IDs (for reference)
SELECT id, email FROM auth.users 
WHERE email LIKE '%admin@crmc.edu' 
ORDER BY email;

-- 1. SSG Admin (Supreme Student Government)
INSERT INTO profiles (id, email, first_name, last_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'ssg.admin@crmc.edu',
  'SSG',
  'Administrator',
  'SSG-2024-001',
  'General',
  'SSG',
  'Supreme Student Government Administrator - Full Campus Access'
FROM auth.users 
WHERE email = 'ssg.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  first_name = 'SSG',
  last_name = 'Administrator',
  student_id = 'SSG-2024-001',
  admin_role = 'SSG',
  bio = 'Supreme Student Government Administrator - Full Campus Access';

-- 2. CTE Admin (College of Teacher Education)
INSERT INTO profiles (id, email, first_name, last_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'cte.admin@crmc.edu',
  'CTE',
  'Administrator',
  'CTE-2024-001',
  'College of Teacher Education (CTE)',
  'CTE',
  'College of Teacher Education Administrator'
FROM auth.users 
WHERE email = 'cte.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  first_name = 'CTE',
  last_name = 'Administrator',
  student_id = 'CTE-2024-001',
  department = 'College of Teacher Education (CTE)',
  admin_role = 'CTE',
  bio = 'College of Teacher Education Administrator';

-- 3. CSS Admin (College of Computer Studies)
INSERT INTO profiles (id, email, first_name, last_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'css.admin@crmc.edu',
  'CSS',
  'Administrator',
  'CSS-2024-001',
  'College of Computer Studies (CCS)',
  'CSS',
  'College of Computer Studies Administrator'
FROM auth.users 
WHERE email = 'css.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  first_name = 'CSS',
  last_name = 'Administrator',
  student_id = 'CSS-2024-001',
  department = 'College of Computer Studies (CCS)',
  admin_role = 'CSS',
  bio = 'College of Computer Studies Administrator';

-- 4. CBE Admin (College of Business and Entrepreneurship)
INSERT INTO profiles (id, email, first_name, last_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'cbe.admin@crmc.edu',
  'CBE',
  'Administrator',
  'CBE-2024-001',
  'College of Business and Entrepreneurship (CBE)',
  'CBE',
  'College of Business and Entrepreneurship Administrator'
FROM auth.users 
WHERE email = 'cbe.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  first_name = 'CBE',
  last_name = 'Administrator',
  student_id = 'CBE-2024-001',
  department = 'College of Business and Entrepreneurship (CBE)',
  admin_role = 'CBE',
  bio = 'College of Business and Entrepreneurship Administrator';

-- 5. PSYCH Admin (Psychology Department)
INSERT INTO profiles (id, email, first_name, last_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'psych.admin@crmc.edu',
  'PSYCH',
  'Administrator',
  'PSYCH-2024-001',
  'Psychology (PSYCH)',
  'PSYCH',
  'Psychology Department Administrator'
FROM auth.users 
WHERE email = 'psych.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  first_name = 'PSYCH',
  last_name = 'Administrator',
  student_id = 'PSYCH-2024-001',
  department = 'Psychology (PSYCH)',
  admin_role = 'PSYCH',
  bio = 'Psychology Department Administrator';

-- 6. CCJE Admin (College of Criminal Justice Education)
INSERT INTO profiles (id, email, first_name, last_name, student_id, department, admin_role, bio)
SELECT 
  id,
  'ccje.admin@crmc.edu',
  'CCJE',
  'Administrator',
  'CCJE-2024-001',
  'College of Criminal Justice Education (CCJE)',
  'CCJE',
  'College of Criminal Justice Education Administrator'
FROM auth.users 
WHERE email = 'ccje.admin@crmc.edu'
ON CONFLICT (id) 
DO UPDATE SET
  first_name = 'CCJE',
  last_name = 'Administrator',
  student_id = 'CCJE-2024-001',
  department = 'College of Criminal Justice Education (CCJE)',
  admin_role = 'CCJE',
  bio = 'College of Criminal Justice Education Administrator';

-- Verify all admin accounts created
SELECT 
  p.id,
  p.email,
  p.first_name || ' ' || p.last_name AS full_name,
  p.student_id,
  p.department,
  p.admin_role
FROM profiles p
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

