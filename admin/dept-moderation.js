// ---------------------------------------------------------------
// DEPT MODERATION � Flagged posts and activity log
// ---------------------------------------------------------------

let adminUser = null;
let deptCommunityId = null;
let pendingDeleteId = null;

const DEPT_FULL = {
  'CTE':'College of Teacher Education (CTE)', 'CSS':'College of Computer Studies (CSS)',
  'CBE':'College of Business Education (CBE)', 'PSYCH':'Psychology (PSYCH)',
  'CCJE':'College of Criminal Justice Education (CCJE)'
};

const ACTION_LABELS = {
  approve_user:  { label: 'Approved User',  bg: '#dcfce7', color: '#166534' },
  reject_user:   { label: 'Rejected User',  bg: '#fee2e2', color: '#991b1b' },
  suspend_user:  { label: 'Suspended User', bg: '#fef3c7', color: '#92400e' },
  delete_post:   { label: 'Deleted Post',   bg: '#fee2e2', color: '#991b1b' },
  flag_post:     { label: 'Flagged Post',   bg: '#fef3c7', color: '#92400e' },
  clear_flag:    { label: 'Cleared Flag',   bg: '#dcfce7', color: '#166534' },
  pin_post:      { label: 'Pinned Post',    bg: '#eff6ff', color: '#1e40af' },
  unpin_post:    { label: 'Unpinned Post',  bg: '#f3f4f6', color: '#374151' },
  create_post:   { label: 'Created Post',   bg: '#eff6ff', color: '#1e40af' },
};

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || !['CTE','CSS','CCS','CBE','PSYCH','CCJE'].includes(profile.admin_role)) {
    window.location.href = profile?.admin_role === 'SSG' ? 'main-dashboard.html' : '../campusfeed.html';
    return;
  }
  adminUser = profile;
  initAdminNotifications(profile.id);

  document.getElementById('adminAvatar').textContent = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminName').textContent = `${profile.first_name} ${profile.last_name}`;
  document.getElementById('adminRoleText').textContent = `${profile.admin_role} Admin`;
  document.getElementById('pageTitle').textContent = `${profile.admin_role} Moderation`;
  document.getElementById('pageSubtitle').textContent = `Review flagged content in the ${DEPT_FULL[profile.admin_role]}`;
  document.querySelectorAll('.deptLabel').forEach(el => el.textContent = profile.admin_role);

  // Get department community
  const { data: community } = await db
    .from('communities')
    .select('id')
    .eq('type', 'department')
    .ilike('department', DEPT_FULL[profile.admin_role])
    .single();

  if (community) deptCommunityId = community.id;

  await Promise.all([loadStats(), loadFlaggedPosts()]);
  setupTabs();
})();

// -- STATS --
async function loadStats() {
  if (!deptCommunityId) {
    document.getElementById('statFlagged').textContent = '0';
    document.getElementById('statPending').textContent = '0';
    document.getElementById('statReviewedToday').textContent = '0';
    return;
  }

  const { count: flaggedCount } = await db.from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('community_id', deptCommunityId)
    .eq('is_flagged', true);

  // Pending = flagged posts not yet cleared (same as flaggedCount for simplicity)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const { count: reviewedToday } = await db.from('admin_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('admin_id', adminUser.id)
    .in('action_type', ['clear_flag', 'delete_post'])
    .gte('created_at', todayStart.toISOString());

  document.getElementById('statFlagged').textContent = flaggedCount || 0;
  document.getElementById('statPending').textContent = flaggedCount || 0;
  document.getElementById('statReviewedToday').textContent = reviewedToday || 0;
}

// -- FLAGGED POSTS --
async function loadFlaggedPosts() {
  const container = document.getElementById('panelFlagged');
  container.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:2rem;color:var(--gray-400);"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;"></i><p style="margin-top:0.75rem;">Loading flagged posts...</p></div></div>`;

  if (!deptCommunityId) {
    container.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:2rem;color:var(--gray-400);">Department community not found.</div></div>`;
    return;
  }

  const { data: posts, error } = await db
    .from('posts')
    .select('*, profiles:author_id(first_name, last_name)')
    .eq('community_id', deptCommunityId)
    .eq('is_flagged', true)
    .order('created_at', { ascending: false });

  if (error) { showToast('Failed to load flagged posts', 'error'); return; }

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="card-body" style="text-align:center;padding:3rem;">
          <div style="width:64px;height:64px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;">
            <i class="fas fa-check-circle" style="font-size:1.75rem;color:#16a34a;"></i>
          </div>
          <h3 style="font-size:1.1rem;font-weight:700;color:var(--gray-800);">All Clear!</h3>
          <p style="color:var(--gray-500);font-size:14px;margin-top:0.5rem;">No flagged posts in your department.</p>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = posts.map(post => {
    const author = post.is_anonymous
      ? 'Anonymous'
      : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Unknown');
    const initials = post.is_anonymous ? 'A' : (post.profiles
      ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : '?');
    const preview = (post.content || '').slice(0, 200);
    const time = formatTimeAgo(new Date(post.created_at));

    return `
      <div class="card" style="border-left:4px solid #ef4444;">
        <div class="card-body">
          <div style="display:flex;align-items:flex-start;gap:0.75rem;">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${escapeHtml(initials)}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:6px;">
                <span style="font-weight:600;font-size:14px;">${escapeHtml(author)}</span>
                <span style="padding:2px 8px;background:#fee2e2;color:#dc2626;border-radius:9999px;font-size:11px;font-weight:700;"><i class="fas fa-flag"></i> Flagged</span>
                <span style="font-size:12px;color:var(--gray-400);margin-left:auto;">${time}</span>
              </div>
              ${post.flag_reason ? `<div style="padding:0.5rem 0.75rem;background:#fff7ed;border-left:3px solid #f59e0b;border-radius:4px;font-size:13px;color:#92400e;margin-bottom:0.75rem;"><strong>Flag reason:</strong> ${escapeHtml(post.flag_reason)}</div>` : ''}
              <p style="font-size:14px;color:var(--gray-700);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(preview)}${post.content?.length > 200 ? '�' : ''}</p>
              <div style="display:flex;gap:0.5rem;margin-top:0.875rem;">
                <button onclick="clearFlag('${post.id}')"
                  style="padding:0.375rem 0.875rem;background:#dcfce7;color:#166534;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
                  <i class="fas fa-check"></i> Clear Flag
                </button>
                <button onclick="confirmDeletePost('${post.id}')"
                  style="padding:0.375rem 0.875rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
                  <i class="fas fa-trash"></i> Delete Post
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function clearFlag(postId) {
  const { error } = await db.from('posts').update({ is_flagged: false, flag_reason: null }).eq('id', postId);
  if (error) { showToast('Failed to clear flag', 'error'); return; }
  await logAdminActivity(adminUser.id, 'clear_flag', postId, 'post');
  showToast('Flag cleared', 'success');
  await Promise.all([loadStats(), loadFlaggedPosts()]);
}

function confirmDeletePost(postId) {
  pendingDeleteId = postId;
  document.getElementById('deleteModal').style.display = 'flex';
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.textContent = 'Deleting...'; btn.disabled = true;
  const { error } = await db.from('posts').delete().eq('id', pendingDeleteId);
  btn.textContent = 'Delete'; btn.disabled = false;
  document.getElementById('deleteModal').style.display = 'none';
  if (error) { showToast('Failed to delete post', 'error'); return; }
  await logAdminActivity(adminUser.id, 'delete_post', pendingDeleteId, 'post');
  pendingDeleteId = null;
  showToast('Post deleted', 'success');
  await Promise.all([loadStats(), loadFlaggedPosts()]);
});

document.getElementById('deleteModal').addEventListener('click', e => {
  if (e.target.id === 'deleteModal') e.target.style.display = 'none';
});

// -- ACTIVITY LOG --
async function loadActivityLog() {
  const tbody = document.getElementById('logTableBody');
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--gray-400);"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>`;

  const { data: logs, error } = await db
    .from('admin_activity_logs')
    .select('*')
    .eq('admin_id', adminUser.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:2rem;color:var(--gray-400);">No activity recorded yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = logs.map(log => {
    const meta = ACTION_LABELS[log.action_type] || { label: log.action_type, bg: '#f3f4f6', color: '#374151' };
    const targetTrunc = log.target_id
      ? (log.target_id.length > 12 ? log.target_id.slice(0, 8) + '�' + log.target_id.slice(-4) : log.target_id)
      : '�';
    const time = log.created_at
      ? formatTimeAgo(new Date(log.created_at))
      : '�';

    return `<tr style="border-bottom:1px solid var(--gray-200);" onmouseenter="this.style.background='var(--gray-50)'" onmouseleave="this.style.background=''">
      <td style="padding:0.875rem 1.25rem;">
        <span style="padding:4px 10px;background:${meta.bg};color:${meta.color};border-radius:9999px;font-size:12px;font-weight:700;">${escapeHtml(meta.label)}</span>
      </td>
      <td style="padding:0.875rem 1.25rem;font-size:13px;color:var(--gray-600);font-family:monospace;">${escapeHtml(targetTrunc)}</td>
      <td style="padding:0.875rem 1.25rem;font-size:13px;color:var(--gray-500);">${escapeHtml(time)}</td>
    </tr>`;
  }).join('');
}

// -- TABS --
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('panelFlagged').style.display = tab === 'flagged' ? 'flex' : 'none';
      document.getElementById('panelLog').style.display = tab === 'log' ? 'block' : 'none';
      if (tab === 'log') loadActivityLog();
    });
  });
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'login.html';
});


