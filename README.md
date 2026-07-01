# CRMC CampusConnect

A centralized student community platform for CRMC (Colegio de la Republica Montessori College) featuring AI-powered content moderation, real-time notifications, and department-based community interaction.

## Live Demo

🌐 **[View Deployed Site](https://crmc-campus-connect.vercel.app/landing-page/index.html)**

## Project Overview

CampusConnect is a web-based student hub that enables campus communication, peer-to-peer assistance, and administrative oversight. It features six integrated modules:

| Module | Description |
|--------|-------------|
| 1. User Registration & RBAC | Secure login with Student ID, department selection, role-based access control |
| 2. Student Posting & Community | Categorized posts (Lost & Found, Academic, Marketplace, General), anonymous posting, comments & replies |
| 3. AI Sentiment Analysis | HuggingFace NLP model + keyword detection + slang decoder for content moderation |
| 4. Automated Notifications | Real-time notifications via Supabase Realtime, broadcast announcements, @mentions |
| 5. Announcements & Information | Dedicated announcements page, campus events, admin broadcasts |
| 6. Admin Dashboard & Analytics | User management, moderation panel, analytics with Chart.js, admin role assignment |

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **AI/NLP:** HuggingFace Inference API (`cardiffnlp/twitter-roberta-base-sentiment-latest`)
- **Deployment:** Vercel
- **Charts:** Chart.js

## Project Structure

```
CRMC-CampusConnect/
├── campusfeed.html/css/js     — Main student feed (posts, comments, likes)
├── announcements.html/css/js  — Dedicated announcements page
├── profile.html/css/js        — User profile page
├── sentiment.js               — AI sentiment analysis + slang decoder
├── supabase.js                — Database client configuration
├── index.html                 — Root redirect
│
├── landing-page/              — Landing page with login/register
│   ├── index.html             — Homepage with hero, features, modals
│   ├── style.css              — Landing page styles
│   ├── homepage.js            — Auth logic (login, register, forgot password)
│   └── reset-password.html    — Password reset page
│
├── admin/                     — Admin dashboard (SSG + Department)
│   ├── login.html             — Admin login portal
│   ├── admin.css              — Shared admin styles
│   ├── main-dashboard.*       — SSG main dashboard
│   ├── main-users.*           — User management
│   ├── main-posts.*           — Post management
│   ├── main-moderation.*      — Flagged content & reports
│   ├── main-analytics.*       — Charts & statistics
│   ├── main-admins.*          — Admin role assignment
│   ├── main-keywords.*        — AI keyword management
│   ├── main-communities.*     — Community management
│   ├── dept-*                 — Department admin pages
│   └── ssg-officer-*          — SSG Officer pages
│
├── Images/                    — Logo & department icons
├── docs/                      — Documentation & guides
└── sql/                       — Database migration scripts
```

## Setup Instructions

### Prerequisites
- A [Supabase](https://supabase.com) account (free tier works)
- A [HuggingFace](https://huggingface.co) account for AI API key
- Git installed on your machine

### 1. Clone the Repository
```bash
git clone https://github.com/Yumikuu/CRMC-CampusConnect.git
cd CRMC-CampusConnect
```

### 2. Database Setup (Supabase)
Run these SQL scripts in your Supabase SQL Editor (in order):

1. `sql/database-schema.sql` — Creates all tables, indexes, RLS policies
2. `sql/auto-flagging.sql` — AI keyword detection triggers
3. `sql/add-english-keywords.sql` — Seed English keywords
4. `sql/add-slang-keywords.sql` — Seed slang/coded keywords
5. `sql/notifications-setup.sql` — Notification triggers (like, comment, reply)
6. `sql/notification-broadcast.sql` — Broadcast announcement triggers
7. `sql/notify-flagged-author.sql` — Warn users when their post is flagged
8. `sql/campus-events-table.sql` — Events table for announcements module

### 3. Configuration
Create a `config.js` file in the root directory:
```javascript
window.HF_API_KEY = 'your_huggingface_api_key_here';
```

Update `supabase.js` with your Supabase project URL and anon key.

### 4. Run Locally
Open with VS Code and use the **Live Server** extension:
- Right-click `landing-page/index.html` → Open with Live Server

### 5. Deploy to Vercel
1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Framework Preset: **Other**
4. Deploy

## Usage

### Student Portal
- Register with Student ID + department
- Browse communities, create posts, comment
- Receive real-time notifications
- Use the AI chatbot for quick searches

### Admin Portal
- Navigate to `/admin/login.html`
- SSG Admin: Full access to all features
- Department Admin: Scoped to their department
- Manage users, moderate content, view analytics

## Admin Roles

| Role | Access |
|------|--------|
| SSG | Full system access — all departments, all features |
| SSG_OFFICER | SSG community + announcements + events |
| CTE/CSS/CBE/PSYCH/CCJE | Department-scoped dashboard, users, posts, moderation |
| student | Standard student access |

## AI Content Moderation

The system uses a 3-layer approach:
1. **Server-side keyword trigger** — Instant detection of flagged words via PostgreSQL trigger
2. **Client-side slang decoder** — Translates coded language (e.g., "8080" → "bobo") before analysis
3. **HuggingFace NLP model** — Sentiment analysis detecting negative tone without explicit keywords

## Team

| Role | Name |
|------|------|
| Team Leader | Albert Reyes |
| Developer | Yumijoy Dela Rama |
| Documentation Specialist | Kint Salas |
| System Analyst | Jameston Molejon |

- **Course:** BSIT
- **School:** Colegio de la Republica Montessori College (CRMC)

## License

This project is developed for academic purposes as a capstone project.
