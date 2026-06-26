# 🎯 Simple Admin Setup Guide
## Get Your Admin Dashboard Running in 3 Easy Steps

---

## 📋 What You Need
- Access to your Supabase project dashboard
- A registered student account (you'll upgrade this to admin)

---

## ⚙️ STEP 1: Update Your Database

Go to your Supabase Dashboard → SQL Editor and run this SQL file:

**File to run:** `migration-module6-admin-features.sql`

This adds:
- ✅ User approval system
- ✅ Admin roles (SSG, department admins)
- ✅ Activity logs
- ✅ Post reporting
- ✅ Content moderation features

**How to run it:**
1. Open Supabase Dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy everything from `migration-module6-admin-features.sql`
5. Paste it into the editor
6. Click "Run" button

**Expected result:** You should see "Success. No rows returned" (this is good!)

---

## 👤 STEP 2: Create Your Admin Account

### Option A: Register a New Admin Account
1. Go to your website: `http://localhost:8080/landing page/index.html`
2. Click "Register"
3. Fill in the form:
   - First Name: `Admin`
   - Last Name: `SSG`
   - Student ID: `SSG-2026`
   - Email: `admin@crmc.edu` (or any email)
   - Password: `admin123` (remember this!)
   - Department: Choose any (doesn't matter for SSG admin)
4. Click "Register"

### Option B: Upgrade Your Existing Account
Skip to Step 3 and use your existing email

---

## 🔓 STEP 3: Upgrade Account to Admin

Go to Supabase Dashboard → SQL Editor and run:

### For SSG Admin (Full Access):
```sql
UPDATE profiles 
SET admin_role = 'SSG', account_status = 'approved' 
WHERE email = 'admin@crmc.edu';
```
👆 Replace `admin@crmc.edu` with your actual email

### For Department Admin (Limited Access):
```sql
-- For CTE Department Admin
UPDATE profiles 
SET admin_role = 'CTE', account_status = 'approved' 
WHERE email = 'cte.admin@crmc.edu';

-- For CSS Department Admin
UPDATE profiles 
SET admin_role = 'CSS', account_status = 'approved' 
WHERE email = 'css.admin@crmc.edu';

-- For CBE Department Admin
UPDATE profiles 
SET admin_role = 'CBE', account_status = 'approved' 
WHERE email = 'cbe.admin@crmc.edu';

-- For PSYCH Department Admin
UPDATE profiles 
SET admin_role = 'PSYCH', account_status = 'approved' 
WHERE email = 'psych.admin@crmc.edu';

-- For CCJE Department Admin
UPDATE profiles 
SET admin_role = 'CCJE', account_status = 'approved' 
WHERE email = 'ccje.admin@crmc.edu';
```

---

## ✅ STEP 4: Login to Admin Dashboard

1. Go to: `http://localhost:8080/admin/login.html`
2. Enter your admin email and password
3. Click "Login"

**You should now see:**
- **SSG Admin:** Full dashboard with all users, posts, moderation, analytics
- **Department Admin:** Department-specific dashboard with limited access

---

## 🎉 What's Now Available

### SSG Admin Can:
- ✅ View and approve all users (any department)
- ✅ View and moderate all posts (any community)
- ✅ Suspend/unsuspend users
- ✅ View analytics across all departments
- ✅ Manage flagged content
- ✅ View activity logs
- ✅ Create/manage communities

### Department Admin Can:
- ✅ View users from their department only
- ✅ View posts from their department community only
- ✅ Moderate department-specific content
- ✅ View department statistics
- ❌ Cannot access other departments
- ❌ Cannot perform campus-wide actions

---

## 🚀 Admin Dashboard Pages

After logging in, you can access:

1. **Dashboard** (`ssg-dashboard.html`) - Overview with key stats
2. **All Users** (`ssg-users.html`) - User approval and management
3. **All Posts** (`ssg-posts.html`) - View and moderate posts
4. **Communities** (`ssg-communities.html`) - Manage communities
5. **Moderation** (`ssg-moderation.html`) - Review flagged content
6. **Analytics** (`ssg-analytics.html`) - Charts and reports
7. **Manage Admins** (`ssg-admins.html`) - Add/remove admin roles

---

## 🐛 Troubleshooting

### Can't login to admin?
- Make sure you ran the migration SQL first
- Check that `admin_role` is set (run: `SELECT * FROM profiles WHERE email = 'youremail@crmc.edu'`)
- Make sure you're using the admin login page (`/admin/login.html`)

### Stuck on pending approval?
- Run: `UPDATE profiles SET account_status = 'approved' WHERE email = 'youremail@crmc.edu'`

### Department admin can't see anything?
- Department admins can only see their own department's data
- Make sure their `admin_role` matches their department (CTE, CSS, CBE, PSYCH, CCJE)

---

## 📊 Module 6 Features Checklist

- ✅ Centralized dashboard with stats
- ✅ User approval system
- ✅ Content moderation interface
- ✅ Activity logging
- ✅ Post reporting system
- ✅ Analytics and reports
- ✅ Role-based access control (SSG vs Department)
- ✅ Data visualization (charts in analytics page)

---

## 💡 Quick Tips

1. **SSG Admin** = Supreme Student Government = Full campus-wide access
2. **Department Admin** = Department-specific access only
3. Regular students have `admin_role = 'student'` or `NULL`
4. Use `account_status` to approve/reject user registrations
5. All admin actions are logged in `admin_activity_logs` table

---

## 🎯 Next Steps

1. Create more admin accounts for each department
2. Test user approval workflow
3. Test post moderation
4. Review analytics dashboard
5. Customize admin pages as needed

---

**Need help?** Check the browser console for errors or check Supabase logs.

