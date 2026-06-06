# Develop

During this phase, the developer developed the CRMC CampusConnect prototype in accordance with the planned features. The backend system is implemented with Supabase (PostgreSQL database) for data management, user authentication, and real-time features. The frontend was developed in HTML, CSS, and JavaScript to ensure it is responsive and easy to use. Unlike other projects for which they use different tools like Figma to plan the interface. In this project, the researchers did not use any UI/UX design tool. Instead, the entire interface was designed directly in code, making it easier to make changes.

CRMC CampusConnect has also added several important features, including a two-tier admin system (SSG and Department admins), student authentication and registration, community-based posting with department separation, real-time notifications, and content moderation capabilities. It also allowed administrators to manage posts, moderate content, and view analytics based on their access level. The platform provides a centralized hub for students to connect, share information across various communities, receive campus announcements, and interact with an AI chatbot assistant. Each feature was optimized to make the system more reliable, efficient, and effective for campus-wide communication.

---

## Description of the Prototype

### Figure 5  
*CRMC CampusConnect Landing Page*

**IMAGE HERE**

The CRMC CampusConnect landing page, which is the entry point for students, is shown in Figure 5. It has a clean, responsive interface that allows students to register or log in to the system. The landing page features an overview of platform capabilities including student communities, smart announcements, AI chatbot assistant, automated notifications, event management, and verified content from faculty and administration.

---

### Figure 6  
*CRMC CampusConnect Student Login Modal*

**IMAGE HERE**

Figure 6 shows the login modal that appears when students click the login button. Users can enter their email or student ID and password to access their account. The modal includes options to remember login credentials and recover forgotten passwords, ensuring ease of access while maintaining security.

---

### Figure 7  
*CRMC CampusConnect Campus Feed (Main Dashboard)*

**IMAGE HERE**

Figure 7 presents the main Campus Feed page where students view all posts from across different communities. The interface includes a top navigation bar with search functionality, notifications, AI chatbot access, and profile menu. The left sidebar displays the user's profile information and lists all available communities including the student's department community and public communities such as General, Lost & Found, Marketplace, Academic Help, Campus Discussions, and Student Support. The main feed area allows students to create new posts and view existing posts with trending, latest, and pinned filters.

---

### Figure 8  
*CRMC CampusConnect Community Sidebar and Navigation*

**IMAGE HERE**

Figure 8 displays the left sidebar community navigation panel. The interface shows the logged-in user's profile card with their name, department badge, and avatar. Below, students can access the Campus Feed (all posts), their department-specific community with notification badges showing unread post counts, and public communities categorized by purpose. Each community is represented with distinct icons and colors for easy identification, providing quick navigation between different information channels.

---

### Figure 9  
*CRMC CampusConnect Create Post Interface*

**IMAGE HERE**

Figure 9 shows the create post modal where students can compose and publish posts. Users can add a post title (optional), write their content, select which community to post in, attach photos, and choose to post anonymously. This feature enables students to share information, ask questions, or engage with their peers while maintaining privacy when needed.

---

### Figure 10  
*CRMC CampusConnect Admin Login Page*

**IMAGE HERE**

Figure 10 presents the admin login portal located at `/admin/login.html`. This separate authentication page is exclusively for administrators (SSG Admin and Department Admins). Upon successful login, the system automatically redirects users to their appropriate dashboard based on their admin role, ensuring proper access control and role-based permissions.

---

### Figure 11  
*CRMC CampusConnect SSG Admin Dashboard*

**IMAGE HERE**

Figure 11 shows the SSG (Supreme Student Government) Admin Dashboard, which provides comprehensive campus-wide oversight. The dashboard displays key metrics including total students, total posts, total communities, and flagged posts. SSG administrators have full access to view all users across all departments, manage all posts from any community, create or delete communities, post campus-wide announcements, moderate any content, view global analytics, and assign admin roles.

---

### Figure 12  
*CRMC CampusConnect Department Admin Dashboard*

**IMAGE HERE**

Figure 12 displays the Department Admin Dashboard, designed for administrators with limited, department-specific access. Each department (CTE, CSS, CBE, PSYCH, CCJE) has its own admin who can only view and manage content within their respective department. The dashboard shows department-specific statistics: department students, department posts, comments, and flagged posts. Department admins can view and moderate posts from their department community, but cannot access content from other departments or perform system-wide functions.

---

### Figure 13  
*CRMC CampusConnect Notifications and Alerts Panel*

**IMAGE HERE**

Figure 13 shows the notifications dropdown panel accessible from the top navigation bar. Students receive real-time alerts for various activities including urgent announcements (e.g., library maintenance), comment replies on their posts, new department announcements, and post likes from other students. Notifications are categorized with visual indicators and timestamps, allowing students to quickly identify unread notifications and stay informed about relevant campus activities.

---

### Figure 14  
*CRMC CampusConnect AI Chatbot Assistant*

**IMAGE HERE**

Figure 14 presents the AI Chatbot Assistant widget, a floating interface accessible throughout the platform. The chatbot provides instant answers to common student queries about exam schedules, class suspensions, lost and found items, and department-specific announcements. The interface includes suggested quick questions for common topics, allowing students to get information without browsing through multiple posts or pages.

---

### Figure 15  
*CRMC CampusConnect Right Sidebar Information Widgets*

**IMAGE HERE**

Figure 15 shows the right sidebar containing multiple information widgets. The Announcements widget displays urgent, event, and academic announcements with color-coded tags and timestamps. The Upcoming Events widget presents a calendar-style view of important campus dates including Foundation Day, Leadership Summit, and exam periods. The Active Communities section highlights communities with recent activity, and the Online Now widget shows currently active students on the platform.

---

### Figure 16  
*CRMC CampusConnect Two-Tier Admin Access Control*

**IMAGE HERE**

Figure 16 illustrates the two-tier admin system architecture implemented in CRMC CampusConnect. The diagram shows how SSG Admin has full campus-wide access to all users, posts, communities, and administrative functions, while Department Admins (CTE, CSS, CBE, PSYCH, CCJE) have restricted access limited only to their respective department's users and posts. This role-based access control is enforced through database row-level security policies in Supabase, ensuring proper data segregation and administrative boundaries.

---

## Review

The CRMC CampusConnect system successfully implements a comprehensive student communication and information platform with role-based administration, community organization, and AI-powered assistance. The two-tier admin system ensures proper oversight at both campus-wide and department levels, while the intuitive student interface promotes engagement and information sharing across the CRMC community.
