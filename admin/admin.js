// ── ADMIN DASHBOARD LOGIC ──

let adminUser = null;

// ── AUTH GUARD + LOAD ADMIN DATA ──
(async () => {
  const { data: { session } } = await db.auth.getSession();

  if (!session) {
    window.location.href = '../landing page/index.html';
    return;
  }

  // Fetch admin profile
  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    console.error('Could not load profile:', error);
    window.location.href = '../landing page/index.html';
    return;
  }

  // Check if user is admin
  if (!profile.is_admin) {
    // Not an admin, redirect to student feed
    window.location.href = '../campusfeed.html';
    return;
  }

  adminUser = profile;

  // Update UI with admin info
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName = `${profile.first_name} ${profile.last_name}`;

  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminName').textContent = fullName;

  // Load dashboard data
  await loadDashboardStats();
  await loadRecentPosts();
  await loadRecentUsers();
})();

// ── LOAD DASHBOARD STATISTICS ──
async function loadDashboardStats() {
  try {
    // Get total users
    const { count: userCount } = await db
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total posts
    const { count: postCount } = await db
      .from('posts')
      .select('*', { count: 'exact', head: true });

    // Get total comments
    const { count: commentCount } = await db
      .from('comments')
      .select('*', { count: 'exact', head: true });

    // Get flagged posts
    const { count: flaggedCount } = await db
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('is_flagged', true);

    // Update UI
    document.getElementById('totalUsers').textContent = userCount || 0;
    document.getElementById('totalPosts').textContent = postCount || 0;
    document.getElementById('totalComments').textContent = commentCount || 0;
    document.getElementById('flaggedPosts').textContent = flaggedCount || 0;

  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// ── LOAD RECENT POSTS ──
async function loadRecentPosts() {
  try {
    const { data: posts, error } = await db
      .from('posts')
      .select(`
        *,
        profiles:author_id (first_name, last_name),
        communities:community_id (name)
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const container = document.getElementById('recentPosts');
    
    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="loading">No posts yet</div>';
      return;
    }

    container.innerHTML = posts.map(post => {
      const author = post.is_anonymous ? 'Anonymous' : 
                     (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Unknown');
      const initials = post.is_anonymous ? 'A' : 
                      (post.profiles ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : 'U');
      const timeAgo = formatTimeAgo(new Date(post.created_at));
      
      return `
        <div class="activity-item">
          <div class="activity-avatar">${initials}</div>
          <div class="activity-content">
            <div class="activity-title">${author} • ${post.communities?.name || 'General'}</div>
            <div class="activity-text">${escapeHtml(post.content)}</div>
            <div class="activity-time">${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading posts:', err);
    document.getElementById('recentPosts').innerHTML = '<div class="loading">Error loading posts</div>';
  }
}

// ── LOAD RECENT USERS ──
async function loadRecentUsers() {
  try {
    const { data: users, error } = await db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const container = document.getElementById('recentUsers');
    
    if (!users || users.length === 0) {
      container.innerHTML = '<div class="loading">No users yet</div>';
      return;
    }

    container.innerHTML = users.map(user => {
      const fullName = `${user.first_name} ${user.last_name}`;
      const initials = (user.first_name[0] + user.last_name[0]).toUpperCase();
      const timeAgo = formatTimeAgo(new Date(user.created_at));
      
      return `
        <div class="activity-item">
          <div class="activity-avatar">${initials}</div>
          <div class="activity-content">
            <div class="activity-title">${fullName}</div>
            <div class="activity-text">${user.department} • ${user.student_id}</div>
            <div class="activity-time">Joined ${timeAgo}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error loading users:', err);
    document.getElementById('recentUsers').innerHTML = '<div class="loading">Error loading users</div>';
  }
}

// ── HELPER FUNCTIONS ──
function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ── LOGOUT ──
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = '../landing page/index.html';
});
