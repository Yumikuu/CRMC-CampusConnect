# 🎯 Create Test Admin Account - SIMPLE STEPS

## Step 1: Register a Normal User First
1. Go to: `http://localhost:8080/landing page/index.html`
2. Click "Register"
3. Fill in:
   - First Name: `Admin`
   - Last Name: `Test`
   - Student ID: `ADMIN-001`
   - Email: `admin@test.com` (use any email you want)
   - Password: `admin123` (remember this!)
   - Department: Pick any (doesn't matter for SSG admin)
4. Click "Register"

## Step 2: Upgrade to SSG Admin
1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste this:
```sql
UPDATE profiles 
SET admin_role = 'SSG' 
WHERE email = 'admin@test.com';
```
3. Click "Run"

## Step 3: Login as Admin
1. Go to: `http://localhost:8080/admin/login.html`
2. Email: `admin@test.com`
3. Password: `admin123`
4. Click "Login"

You should now see the SSG Admin Dashboard! ✅

## Testing Other Admin Types:

### CTE Department Admin:
```sql
UPDATE profiles 
SET admin_role = 'CTE' 
WHERE email = 'youremail@test.com';
```

### CSS Department Admin:
```sql
UPDATE profiles 
SET admin_role = 'CSS' 
WHERE email = 'youremail@test.com';
```

That's it! Much simpler than before! 🎉
