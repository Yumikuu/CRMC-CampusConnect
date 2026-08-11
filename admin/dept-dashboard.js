// ═══════════════════════════════════════════════════════════════
// DEPARTMENT ADMIN DASHBOARD — Limited Department Access
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let departmentCommunityId = null;
let selectedImages = [];

const DEPT_FULL_NAMES = {
  'CTE':  'College of Teacher Education (CTE)',
  'CSS':  'College of Computer Studies (CSS)',
  'CCS':  'College of Computer Studies (CSS)',
  'CBE':  'College of Business Education (CBE)',
  'PSYCH':'Psychology (PSYCH)',
  'CCJE': 'College of Criminal Justice Education (CCJE)'
};

const DEPT_COLORS = {
  'CTE': '#3b82f6', 'CSS': '#10b981', 'CCS': '#10b981', 'CBE': '#f59e0b',
  'PSYCH': '#8b5cf6', 'CCJE': '#ef4444'
};

// ── AUTH GUARD ──
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile, error } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (error || !profile) { window.location.href = 'login.html'; return; }

  const validDeptRoles = ['CTE', 'CSS', 'CCS', 'CBE', 'PSYCH', 'CCJE'];
  if (!validDeptRoles.includes(profile.admin_role)) {
    window.location.href = profile.admin_role === 'SSG' ? 'main-dashboard.html' : '../campusfeed.html';
    return;
  }

  adminUser = profile;

  // Get this admin's department community
  const { data: community } = await db
    .from('communities')
    .select('id, name')
    .eq('type', 'department')
    .ilike('department', DEPT_FULL_NAMES[profile.admin_role])
    .single();

  if (community) departmentCommunityId = community.id;

  // Update UI
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName = `${profile.first_name} ${profile.last_name}`;
  const dept = profile.admin_role;
  const color = DEPT_COLORS[dept] || 'var(--maroon)';

  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminAvatar').style.background = `linear-gradient(135deg, ${color}, ${color}cc)`;
  document.getElementById('adminName').textContent = fullName;
  document.getElementById('adminRoleText').textContent = `${dept} Administrator`;
  document.getElementById('deptTitle').textContent = `${dept} Dashboard`;
  document.getElementById('deptRole').textContent = `${dept} Department Administrator`;
  const navDept1 = document.getElementById('navDeptName');
  const navDept2 = document.getElementById('navDeptName2');
  if (navDept1) navDept1.textContent = dept;
  if (navDept2) navDept2.textContent = dept;
  document.getElementById('deptUsersLabel').textContent = `${dept} Students`;
  document.getElementById('deptPostsLabel').textContent = `${dept} Posts`;

  // Initialize notification bell
  initAdminNotifications(adminUser.id);

  await loadDepartmentStats();
  await loadRecentPosts();
  await loadRecentUsers();
  setupListeners();
})();

// ── STATS ──
async function loadDepartmentStats() {
  try {
    const deptFull = DEPT_FULL_NAMES[adminUser.admin_role];

    const { count: userCount } = await db.from('profiles')
      .select('*', { count: 'exact', head: true }).ilike('department', deptFull);

    let postCount = 0, commentCount = 0, flaggedCount = 0;

    if (departmentCommunityId) {
      const [pc, fc] = await Promise.all([
        db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', departmentCommunityId),
        db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', departmentCommunityId).eq('is_flagged', true),
      ]);
      postCount = pc.count || 0;
      flaggedCount = fc.count || 0;

      const { data: posts } = await db.from('posts').select('id').eq('community_id', departmentCommunityId);
      if (posts?.length) {
        const { count: cc } = await db.from('comments').select('*', { count: 'exact', head: true }).in('post_id', posts.map(p => p.id));
        commentCount = cc || 0;
      }
    }

    document.getElementById('deptUsers').textContent    = userCount    || 0;
    document.getElementById('deptPosts').textContent    = postCount    || 0;
    document.getElementById('deptComments').textContent = commentCount || 0;
    document.getElementById('deptFlagged').textContent  = flaggedCount || 0;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

// ── RECENT POSTS ──
async function loadRecentPosts() {
  const container = document.getElementById('recentPosts');
  if (!departmentCommunityId) {
    container.innerHTML = '<div class="loading">No department community found</div>';
    return;
  }
  const { data: posts, error } = await db.from('posts')
    .select('*, profiles:author_id(first_name, last_name)')
    .eq('community_id', departmentCommunityId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !posts?.length) {
    container.innerHTML = '<div class="loading">No posts yet in your department</div>';
    return;
  }

  container.innerHTML = posts.map(post => {
    const author = post.is_anonymous ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Unknown');
    const initials = post.is_anonymous ? 'A' : (post.profiles ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : '?');
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    return `
      <div class="activity-item">
        <div class="activity-avatar">${initials}</div>
        <div class="activity-content">
          <div class="activity-title">
            ${escapeHtml(author)}
            ${post.is_pinned ? '<span style="font-size:11px;background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:9999px;margin-left:4px;"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
            ${post.is_flagged ? '<span style="font-size:11px;background:#fee2e2;color:#dc2626;padding:2px 6px;border-radius:9999px;margin-left:4px;"><i class="fas fa-flag"></i> Flagged</span>' : ''}
          </div>
          <div class="activity-text">${escapeHtml(post.content)}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      </div>`;
  }).join('');
}

// ── RECENT USERS ──
async function loadRecentUsers() {
  const container = document.getElementById('recentUsers');
  const deptFull = DEPT_FULL_NAMES[adminUser.admin_role];
  const { data: users, error } = await db.from('profiles')
    .select('*').ilike('department', deptFull)
    .order('created_at', { ascending: false }).limit(5);

  if (error || !users?.length) {
    container.innerHTML = '<div class="loading">No users yet in your department</div>';
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
          <div class="activity-title">${escapeHtml(fullName)}</div>
          <div class="activity-text">${escapeHtml(user.student_id)}</div>
          <div class="activity-time">Joined ${timeAgo}</div>
        </div>
      </div>`;
  }).join('');
}

// ── CREATE POST ──
function setPostType(type) {
  document.getElementById('postType').value = type;
  const isAnnouncement = type === 'announcement';

  document.getElementById('typePost').style.background       = isAnnouncement ? 'var(--gray-100)' : 'var(--maroon)';
  document.getElementById('typePost').style.color            = isAnnouncement ? 'var(--gray-700)' : 'white';
  document.getElementById('typePost').style.border           = isAnnouncement ? '1px solid var(--gray-300)' : 'none';
  document.getElementById('typeAnnouncement').style.background = isAnnouncement ? '#f59e0b' : 'var(--gray-100)';
  document.getElementById('typeAnnouncement').style.color      = isAnnouncement ? 'white' : 'var(--gray-700)';
  document.getElementById('typeAnnouncement').style.border     = isAnnouncement ? 'none' : '1px solid var(--gray-300)';
  document.getElementById('announcementBadge').style.display  = isAnnouncement ? 'block' : 'none';
}

async function submitPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) { showToast('Please write something first.', 'error'); return; }
  if (!departmentCommunityId) { showToast('Department community not found.', 'error'); return; }

  const btn = document.getElementById('submitPostBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
  btn.disabled = true;

  try {
    const isAnnouncement = document.getElementById('postType').value === 'announcement';
    const isPinned = document.getElementById('pinPost').checked;

    // Upload images first
    let imageUrls = [];
    if (selectedImages.length > 0) {
      for (const file of selectedImages) {
        const fileName = `dept-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
        const { data: uploadData, error: uploadErr } = await db.storage
          .from('post-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (!uploadErr) {
          const { data: { publicUrl } } = db.storage.from('post-images').getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }
    }

    const postPayload = {
      community_id: departmentCommunityId,
      author_id: adminUser.id,
      content: isAnnouncement ? `📢 [ANNOUNCEMENT]\n\n${content}` : content,
      is_anonymous: false,
      is_pinned: isPinned,
      image_url: imageUrls.length > 0 ? imageUrls : null,
    };

    const { error } = await db.from('posts').insert(postPayload);
    if (error) throw error;

    showToast(isAnnouncement ? 'Announcement published!' : 'Post published!', 'success');
    document.getElementById('createPostModal').style.display = 'none';
    document.getElementById('postContent').value = '';
    document.getElementById('pinPost').checked = false;
    document.getElementById('imagePreviewRow').innerHTML = '';
    selectedImages = [];
    setPostType('post');
    await loadRecentPosts();
    await loadDepartmentStats();

  } catch (err) {
    console.error('Post error:', err);
    showToast('Failed to publish: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish';
    btn.disabled = false;
  }
}

// ── IMAGE HANDLING ──
function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  const remaining = 5 - selectedImages.length;
  const toAdd = files.slice(0, remaining);

  toAdd.forEach(file => {
    selectedImages.push(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const preview = document.getElementById('imagePreviewRow');
      const div = document.createElement('div');
      div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0;';
      div.innerHTML = `
        <img src="${ev.target.result}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--gray-200);" />
        <button onclick="removeImage(${selectedImages.length - 1}, this.parentNode)"
          style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#dc2626;color:white;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-times"></i>
        </button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });

  if (files.length > remaining) showToast('Max 5 images allowed.', 'info');
  e.target.value = '';
}

function removeImage(index, el) {
  selectedImages.splice(index, 1);
  el.remove();
}

// ── EVENT LISTENERS ──
function setupListeners() {
  document.getElementById('createPostBtn').addEventListener('click', () => {
    document.getElementById('createPostModal').style.display = 'flex';
  });

  document.getElementById('postImages').addEventListener('change', handleImageSelect);

  document.getElementById('createPostModal').addEventListener('click', e => {
    if (e.target.id === 'createPostModal') document.getElementById('createPostModal').style.display = 'none';
  });
}

function formatTimeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });

