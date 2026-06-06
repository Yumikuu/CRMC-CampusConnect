# Admin System — Multi-Role Admin Dashboard

**Status:** `implemented` ✅  
**Priority:** `high`  
**Module:** Module 1 — User Profiles & Department Segmentation  
**Created:** June 4, 2026  
**Approach:** Design First

---

## 🎯 Overview

Transform the CRMC CampusHub admin system from a single admin role to a **two-tier permission system**:

1. **SSG Admin** (Supreme Student Government) — Full campus-wide access
2. **Department Admins** (5 departments) — Limited to their department only

This enables:
- SSG to manage the entire platform
- Department heads to moderate their own communities
- Proper access control and data isolation
- Scalable permission management

---

## 👥 Admin Roles

### 1️⃣ SSG Admin (Super Admin) 👑

**Role:** `admin_role = 'SSG'`

**Access Level:** FULL SYSTEM ACCESS

**Permissions:**
- ✅ View ALL communities (department + public)
- ✅ View ALL posts across entire campus
- ✅ Create/delete communities
- ✅ Post campus-wide announcements
- ✅ Manage events for entire campus
- ✅ View global analytics and stats
- ✅ Moderate ANY post/comment
- ✅ Manage ALL users (suspend, verify, delete)
- ✅ Assign department admin roles
- ✅ Access all dashboard sections

**Dashboard Sections:**
- Global Dashboard (all stats)
- All Users Management
- All Posts Management
- Global Moderation Queue
- Campus-Wide Analytics
- Community Management (create/delete)
- Admin Role Assignment

**Community Posting:**
- Can post in **SSG Announcements** community
- Can post in ANY community (as SSG official)

---

### 2️⃣ Department Admins (5 Departments) 🏫

**Roles:**
- `admin_role = 'CTE'` — CTE Department Admin
- `admin_role = 'CSS'` — CSS Department Admin
- `admin_role = 'CBE'` — CBE Department Admin
- `admin_role = 'PSYCH'` — PSYCH Department Admin
- `admin_role = 'CCJE'` — CCJE Department Admin

**Access Level:** LIMITED TO THEIR DEPARTMENT

**Permissions:**
- ✅ View ONLY their department community
- ✅ View ONLY posts from their department
- ✅ Post announcements for their department
- ✅ Moderate posts in their department (flag/delete)
- ✅ View their department users only
- ✅ View their department analytics
- ❌ CANNOT access other departments
- ❌ CANNOT create communities
- ❌ CANNOT see global system data
- ❌ CANNOT manage users outside their department
- ❌ CANNOT access SSG tools

**Dashboard Sections:**
- Department Dashboard (dept stats only)
- Department Users
- Department Posts
- Department Moderation Queue
- Department Analytics

**Community Posting:**
- Can post ONLY in their department community
- Posts appear as official department announcements

---

## 🏘️ Community Structure

### ✅ Create SSG Community

**New Community:**
```
Community Name: SSG Announcements
Slug: ssg-announcements
Type: public
Description: Official campus-wide announcements from the Supreme Student Government
```

**Purpose:**
- Campus-wide official announcements
- SSG events and updates
- All students see SSG posts
- Only SSG Admin can post here

### 📋 Updated Community List

**General Communities** (All students see):
```
1. General Discussion
2. Lost & Found
3. Academic Help
4. Marketplace & Sharing
5. Campus Discussions
6. Student Support
7. ✨ SSG Announcements (NEW!)
```

**Department Communities** (Department-specific):
```
1. CTE Community → CTE Admin access
2. CSS Community → CSS Admin access
3. CBE Community → CBE Admin access
4. PSYCH Community → PSYCH Admin access
5. CCJE Community → CCJE Admin access
```

---

## 🗄️ Database Design

### 📊 Update `profiles` Table

**CHANGE:**
```sql
-- OLD:
is_admin BOOLEAN DEFAULT false

-- NEW:
admin_role TEXT DEFAULT NULL
```

**Values:**
```sql
NULL or 'student' → Regular student (no admin access)
'SSG' → SSG Admin (super admin)
'CTE' → CTE Department Admin
'CSS' → CSS Department Admin
'CBE' → CBE Department Admin
'PSYCH' → PSYCH Department Admin
'CCJE' → CCJE Department Admin
```

**Check Constraint:**
```sql
CHECK (admin_role IN (NULL, 'student', 'SSG', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE'))
```

### 🔐 RLS Policies for Admin Access

**Admin Post Access:**
```sql
-- SSG Admin: See ALL posts
-- Dept Admin: See ONLY their department posts
CREATE POLICY "Admin post access based on role"
  ON posts FOR SELECT
  USING (
    CASE 
      WHEN auth.uid() IN (
        SELECT id FROM profiles WHERE admin_role = 'SSG'
      ) THEN true  -- SSG sees everything
      WHEN auth.uid() IN (
        SELECT id FROM profiles 
        WHERE admin_role IN ('CTE', 'CSS', 'CBE', 'CHTM', 'CAS')
      ) THEN community_id IN (
        SELECT id FROM communities 
        WHERE department = (
          SELECT admin_role FROM profiles WHERE id = auth.uid()
        )
      )  -- Dept admin sees only their dept
      ELSE false
    END
  );
```

### 📝 Communities Table Update

**Add SSG Community:**
```sql
INSERT INTO communities (slug, name, description, type, department) 
VALUES (
  'ssg-announcements', 
  'SSG Announcements', 
  'Official campus-wide announcements from SSG', 
  'public', 
  NULL
);
```

---

## 🎨 UI/UX Design

### 🖥️ Admin Dashboard Layout

#### SSG Admin Dashboard
```
┌─────────────────────────────────────────────────────┐
│ SIDEBAR                     TOP BAR                 │
│ ├─ Dashboard               [SSG Admin] [John Doe]  │
│ ├─ All Users                                        │
│ ├─ All Posts               MAIN CONTENT             │
│ ├─ All Communities         ┌─────────────────────┐ │
│ ├─ Moderation Queue        │ GLOBAL STATS        │ │
│ ├─ Campus Analytics        │ Total Users: 1,234  │ │
│ ├─ Manage Admins           │ Total Posts: 5,678  │ │
│ └─ Logout                  │ All Departments     │ │
│                             └─────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

#### Department Admin Dashboard (e.g., CTE Admin)
```
┌─────────────────────────────────────────────────────┐
│ SIDEBAR                     TOP BAR                 │
│ ├─ Dashboard               [CTE Admin] [Jane Doe]  │
│ ├─ CTE Users                                        │
│ ├─ CTE Posts               MAIN CONTENT             │
│ ├─ CTE Moderation          ┌─────────────────────┐ │
│ ├─ CTE Analytics           │ CTE STATS           │ │
│ └─ Logout                  │ CTE Users: 234      │ │
│                             │ CTE Posts: 567      │ │
│                             │ CTE Only            │ │
│                             └─────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 🎯 Dashboard Features by Role

| Feature | SSG Admin | Dept Admin |
|---------|-----------|------------|
| View all users | ✅ | ❌ (dept only) |
| View all posts | ✅ | ❌ (dept only) |
| Create communities | ✅ | ❌ |
| Delete posts (any) | ✅ | ❌ (dept only) |
| Post announcements | ✅ (all) | ✅ (dept only) |
| View analytics | ✅ (global) | ✅ (dept only) |
| Assign admin roles | ✅ | ❌ |

### 📱 UI Components

#### Admin Badge Display
```html
<!-- SSG Admin -->
<div class="admin-badge ssg">
  <i class="fas fa-crown"></i>
  <span>SSG Admin</span>
</div>

<!-- Department Admin -->
<div class="admin-badge dept">
  <i class="fas fa-shield-alt"></i>
  <span>CTE Admin</span>
</div>
```

#### Post Announcement Form
```
For SSG Admin:
┌─────────────────────────────────┐
│ Post Announcement               │
│                                 │
│ Community: [SSG Announcements▼] │
│ Title: _____________________    │
│ Content: ___________________    │
│                                 │
│ [☐ Pin to top]                  │
│ [Post Announcement]             │
└─────────────────────────────────┘

For CTE Admin:
┌─────────────────────────────────┐
│ Post Announcement               │
│                                 │
│ Community: CTE Community (fixed)│
│ Title: _____________________    │
│ Content: ___________________    │
│                                 │
│ [☐ Pin to top]                  │
│ [Post Announcement]             │
└─────────────────────────────────┘
```

---

## 🔒 Login & Authentication

### ❓ Separate Login Pages?

**Answer: YES — Separate Admin Login Portal**

**Why:**
- ✅ **Better Security** — Admin portal isolated from students
- ✅ **URL Separation** — `/admin/login.html` vs student login
- ✅ **Access Control** — Students can't accidentally access admin pages
- ✅ **Professional** — Dedicated admin interface
- ✅ **Clearer Permissions** — Admin credentials distinct from student accounts

### 🚪 Login Structure

**Student Login:**
```
URL: /landing page/index.html
Purpose: Student authentication
Redirect: /campusfeed.html (student feed)
Requirement: admin_role must be NULL
```

**Admin Login:**
```
URL: /admin/login.html
Purpose: Admin authentication
Redirect: Based on admin_role
Requirement: admin_role must NOT be NULL
```

### 🔄 Login Flows

#### Student Login Flow:
```
1. Student visits /landing page/index.html
2. Enters student credentials
3. System authenticates
4. Check admin_role:
   - IF admin_role IS NULL → ✅ Redirect to /campusfeed.html
   - IF admin_role IS NOT NULL → ❌ Show error: "Please use admin portal"
```

#### Admin Login Flow:
```
1. Admin visits /admin/login.html
2. Enters admin credentials
3. System authenticates
4. Check admin_role:
   - IF admin_role IS NULL → ❌ Show error: "Not an admin account"
   - IF admin_role = 'SSG' → ✅ Redirect to /admin/ssg-dashboard.html
   - IF admin_role IN ('CTE','CSS','CBE','CHTM','CAS') → ✅ Redirect to /admin/dept-dashboard.html
```

### 💻 Implementation

**Student Login (landing page/homepage.js):**
```javascript
// After successful authentication
const { data: profile } = await supabase
  .from('profiles')
  .select('admin_role')
  .eq('id', user.id)
  .single();

if (profile.admin_role && profile.admin_role !== 'student') {
  // This is an admin account
  alert('Please use the admin portal to login.');
  await supabase.auth.signOut();
  return;
}

// Regular student - proceed to feed
window.location.href = '../campusfeed.html';
```

**Admin Login (admin/login.js):**
```javascript
// After successful authentication
const { data: profile } = await supabase
  .from('profiles')
  .select('admin_role, first_name, last_name')
  .eq('id', user.id)
  .single();

if (!profile.admin_role || profile.admin_role === 'student') {
  // Not an admin account
  alert('Access denied. This account does not have admin privileges.');
  await supabase.auth.signOut();
  return;
}

// Redirect based on admin role
if (profile.admin_role === 'SSG') {
  window.location.href = 'ssg-dashboard.html';  // SSG Admin Dashboard
} else {
  window.location.href = 'dept-dashboard.html';  // Department Admin Dashboard
}
```

### 🔐 Security Benefits

1. **URL Isolation** — Admin portal at different path
2. **Role Validation** — Double-check admin_role on both logins
3. **Prevent Cross-Access** — Students blocked from admin, admins guided to correct portal
4. **Clearer User Experience** — Each user type has dedicated entry point
5. **Future-Proof** — Can add 2FA or extra security to admin login only

---

## 📦 File Structure

```
CRMC CampusHub/
├─ admin/
│  ├─ login.html               ← ✨ NEW: Admin Login Page
│  ├─ login.js                 ← ✨ NEW: Admin authentication logic
│  ├─ ssg-dashboard.html       ← SSG Admin Dashboard
│  ├─ dept-dashboard.html      ← Department Admin Dashboard
│  ├─ admin-common.js          ← Shared admin functions
│  ├─ admin.css                ← Admin styles
│  ├─ users.html               ← User management (role-filtered)
│  ├─ posts.html               ← Post management (role-filtered)
│  ├─ moderation.html          ← Moderation queue (role-filtered)
│  └─ analytics.html           ← Analytics (role-filtered)
├─ landing page/
│  ├─ index.html               ← Student Login Page
│  ├─ homepage.js              ← Student authentication logic (updated)
│  └─ ...
├─ campusfeed.html             ← Student feed (protected)
└─ database/
   ├─ migration-admin-roles.sql  ← Database migration script
   └─ seed-ssg-community.sql     ← Create SSG community
```

---

## ✅ Confirmation Checklist

Before proceeding to tasks, confirm:

- ✅ **SSG gets their own community for announcements?**
  - YES — "SSG Announcements" community created

- ✅ **1 SSG Admin + 5 Department Admins = 6 total admins?**
  - YES — 1 SSG + 5 Dept Admins

- ✅ **Department admins ONLY see their department?**
  - YES — RLS policies enforce department isolation

- ✅ **Separate admin login page?**
  - YES — `/admin/login.html` for admins, `/landing page/index.html` for students

- ✅ **Admin dashboard already exists?**
  - YES — Needs to be split into SSG and Dept versions

---

## 📊 Current System Progress Estimate

Based on existing features and this spec:

| Module | Completion |
|--------|------------|
| User Registration & Auth | ~85% ✅ |
| Student Posting & Feed | ~70% ✅ |
| Admin System (current) | ~20% ⚠️ |
| Admin System (after spec) | ~0% (need to rebuild) |
| AI Sentiment Analysis | ~0% (planned for later) |

**Overall System:** ~60% complete

**After implementing this spec:** ~75% complete

---

## 🚀 Next Steps

1. Review this design specification
2. Confirm all details match your vision
3. Create implementation tasks
4. Start with database migration
5. Build SSG dashboard
6. Build department dashboard
7. Update login logic
8. Test role-based access

---

**Ready to proceed?**
