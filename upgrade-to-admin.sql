-- ═══════════════════════════════════════════════════════════════
-- UPGRADE USER TO ADMIN - Simple Method
-- ═══════════════════════════════════════════════════════════════
-- 
-- HOW TO USE:
-- 1. Register a user normally on your website
-- 2. Find their email in the profiles table
-- 3. Run one of the UPDATE statements below
-- 
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: Find all registered users (to get the email you want to upgrade)
SELECT 
  email,
  first_name,
  last_name,
  student_id,
  department,
  admin_role
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- ═══════════════════════════════════════════════════════════════
-- STEP 2: UPGRADE TO ADMIN
-- Replace 'user@example.com' with the actual email from Step 1
-- ═══════════════════════════════════════════════════════════════

-- Make SSG Admin (Full Access)
UPDATE profiles 
SET admin_role = 'SSG'
WHERE email = 'user@example.com';

-- OR make Department Admin (replace 'CTE' with CSS, CBE, PSYCH, or CCJE)
-- UPDATE profiles 
-- SET admin_role = 'CTE'
-- WHERE email = 'user@example.com';

-- ═══════════════════════════════════════════════════════════════
-- STEP 3: VERIFY IT WORKED
-- ═══════════════════════════════════════════════════════════════

SELECT 
  email,
  first_name || ' ' || last_name as name,
  admin_role,
  student_id,
  department
FROM profiles
WHERE admin_role IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- QUICK EXAMPLES:
-- ═══════════════════════════════════════════════════════════════

-- Make john.doe@student.com an SSG admin:
-- UPDATE profiles SET admin_role = 'SSG' WHERE email = 'john.doe@student.com';

-- Make jane.smith@student.com a CTE admin:
-- UPDATE profiles SET admin_role = 'CTE' WHERE email = 'jane.smith@student.com';

-- Remove admin access:
-- UPDATE profiles SET admin_role = NULL WHERE email = 'user@example.com';

-- ═══════════════════════════════════════════════════════════════
