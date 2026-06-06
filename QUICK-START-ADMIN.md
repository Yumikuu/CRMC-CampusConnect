# ⚡ Quick Start: Admin Dashboard in 5 Minutes

## 🎯 Goal
Get your admin dashboard up and running right now.

---

## Step 1: Update Database (2 min)
1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Open this file: `migration-module6-admin-features.sql`
5. Copy ALL the code
6. Paste into Supabase
7. Click **Run**
8. Wait for "Success" message

---

## Step 2: Make Yourself Admin (1 min)
1. Go to **SQL Editor** again
2. Paste this code (replace the email with yours):

```sql
UPDATE profiles 
SET admin_role = 'SSG', account_status = 'approved' 
WHERE email = 'YOUR_EMAIL@HERE.COM';
```

3. Click **Run**
4. You should see "1 row updated"

---

## Step 3: Login (1 min)
1. Open your browser
2. Go to: `http://localhost:8080/admin/login.html`
3. Enter your email and password
4. Click "Login"

---

## 🎉 Done!

You should now see:
- ✅ Admin dashboard with statistics
- ✅ Sidebar navigation
- ✅ User management page
- ✅ Your admin profile in the top right

---

## 🔍 What Can You Do Now?

### View Stats
- Dashboard shows total users, posts, communities, flagged posts

### Manage Users
- Click "All Users" in sidebar
- See all registered students
- Approve pending users
- Suspend bad actors

### View Activity
- See recent posts
- See recent users
- Department breakdown

---

## 🐛 Not Working?

### "Login failed" error?
- Make sure you ran Step 2 with YOUR email
- Check spelling of your email
- Try this in SQL Editor:
  ```sql
  SELECT * FROM profiles WHERE email = 'your@email.com';
  ```
- Make sure `admin_role` shows 'SSG'

### Can't see the page?
- Make sure you're running your local server
- Check the URL: Should be `localhost:8080` (or your port)
- Path should be: `/admin/login.html`

### Database errors?
- Make sure you ran the migration SQL first (Step 1)
- Check Supabase logs for detailed errors

---

## 📚 More Info

- **Full setup guide:** `ADMIN-SETUP-GUIDE.md`
- **Admin features list:** `README-ADMIN.md`
- **Simple test admin:** `create-test-admin-simple.md`

---

**Questions?** Check the browser console (F12) for error messages.

