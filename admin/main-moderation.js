// ═══════════════════════════════════════════════════════════════
// SSG MODERATION — Flagged posts, user reports, activity log
// ═══════════════════════════════════════════════════════════════

let adminUser = null;

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.admin_role !== 'SSG') {
    window.location.href = profile?.admin_role ? 'dept-dashboard.html' : '../campusfeed.html';
    return;
  }
  adminUser = profile;
  document.getElementById('adminAvatar').textContent = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminName').textContent = `${profile.first_name} ${profile.last_name}`;

  await loadStats();
  await loadFlaggedPosts();
  setupTabs();
})();

async function loadStats() {
  const [{ count: flaggedCount }, { count: reportsCount }] = await Promise.all([
    db.from('posts').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
    db.from('post_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending').catch(() => ({ count: 0 }))
  ]);

  // Reviewed today
  const today = new Date(); today.setHours(0,0,0,0);
  const { count: resolvedCount } = await db.from('admin_activity_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())
    .catch(() => ({ count: 0 }));

  document.getElementById('totalFlagged').textContent = flaggedCount || 0;
  document.getElementById('pendingReports').textContent = reportsCount || 0;
  document.getElementById('resolvedToday').textContent = resolvedCount || 0;
  document.getElementById('countFlagged').textContent = `(${flaggedCount || 0})`;
  document.getElementById('countReports').textContent = `(${reportsCount || 0})`;
}

async function loadFlaggedPosts() {
  const { data: posts, error } = await db
    .from('posts')
    .select(`*, profiles:author_id(first_name, last_name), communities:community_id(name)`)
    .eq('is_flagged', true)
    .order('created_at', { ascending: false });

  const container = document.getElementById('flaggedContainer');

  if (error || !posts?.length) {
    container.innerHTML = `
      <div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--gray-400);">
        <i class="fas fa-check-circle" style="font-size:2.5rem;color:#10b981;"></i>
        <p style="margin-top:1rem;font-size:15px;">No flagged posts — all clear!</p>
      </div></div>`;
    return;
  }

  container.innerHTML = posts.map(post => {
    const author = post.is_anonymous ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Deleted User');
    const community = post.communities?.name || 'Unknown';
    const timeAgo = formatTimeAgo(new Date(post.created_at));

    return `
      <div class="card" style="border-left:4px solid #ef4444;">
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.75rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
              <span style="padding:3px 10px;background:#fee2e2;color:#dc2626;border-radius:9999px;font-size:12px;font-weight:700;"><i class="fas fa-flag"></i> Flagged</span>
              <span style="font-size:13px;font-weight:600;color:var(--maroon);">${escapeHtml(community)}</span>
              <span style="font-size:13px;color:var(--gray-500);">by <strong>${escapeHtml(author)}</strong></span>
              <span style="font-size:12px;color:var(--gray-400);">${timeAgo}</span>
            </div>
          </div>
          ${post.flag_reason ? `<div style="padding:0.5rem 0.75rem;background:#fff7ed;border-radius:6px;margin-bottom:0.75rem;font-size:13px;color:#92400e;"><i class="fas fa-info-circle"></i> <strong>Reason:</strong> ${escapeHtml(post.flag_reason)}</div>` : ''}
          <p style="font-size:14px;color:var(--gray-700);line-height:1.5;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(post.content)}</p>
          <div style="display:flex;gap:0.5rem;margin-top:1rem;justify-content:flex-end;">
            <button onclick="unflagPost('${post.id}')" style="padding:0.5rem 1rem;background:#dcfce7;color:#16a34a;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-check"></i> Clear Flag</button>
            <button onclick="deletePost('${post.id}')" style="padding:0.5rem 1rem;background:#dc2626;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-trash"></i> Delete Post</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadReports() {
  const { data: reports, error } = await db
    .from('post_reports')
    .select(`*, posts:post_id(content, is_anonymous), reporter:reporter_id(first_name, last_name)`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);

  const container = document.getElementById('reportsContainer');

  if (error || !reports?.length) {
    container.innerHTML = `
      <div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--gray-400);">
        <i class="fas fa-check-circle" style="font-size:2.5rem;color:#10b981;"></i>
        <p style="margin-top:1rem;font-size:15px;">No pending reports!</p>
        <p style="font-size:13px;margin-top:0.5rem;">Students can report posts using the report button on the campus feed.</p>
      </div></div>`;
    return;
  }

  const reasonLabels = { spam: 'Spam', harassment: 'Harassment', inappropriate: 'Inappropriate Content', misinformation: 'Misinformation', other: 'Other' };
  const reasonColors = { spam: '#f59e0b', harassment: '#ef4444', inappropriate: '#8b5cf6', misinformation: '#3b82f6', other: '#6b7280' };

  container.innerHTML = reports.map(r => {
    const reporter = r.reporter ? `${r.reporter.first_name} ${r.reporter.last_name}` : 'Anonymous';
    const postContent = r.posts?.content || 'Post unavailable';
    const reasonColor = reasonColors[r.reason] || '#6b7280';
    const timeAgo = formatTimeAgo(new Date(r.created_at));

    return `
      <div class="card" style="border-left:4px solid ${reasonColor};">
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;flex-wrap:wrap;">
            <span style="padding:3px 10px;background:${reasonColor}22;color:${reasonColor};border-radius:9999px;font-size:12px;font-weight:700;">${reasonLabels[r.reason] || r.reason}</span>
            <span style="font-size:13px;color:var(--gray-500);">Reported by <strong>${escapeHtml(reporter)}</strong></span>
            <span style="font-size:12px;color:var(--gray-400);">${timeAgo}</span>
          </div>
          <div style="padding:0.75rem;background:var(--gray-50);border-radius:6px;margin-bottom:0.75rem;">
            <p style="font-size:13px;color:var(--gray-500);margin-bottom:4px;font-weight:600;">Reported Post:</p>
            <p style="font-size:14px;color:var(--gray-700);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(postContent)}</p>
          </div>
          ${r.description ? `<div style="padding:0.5rem 0.75rem;background:#fff7ed;border-radius:6px;margin-bottom:0.75rem;font-size:13px;color:#92400e;"><i class="fas fa-comment"></i> <strong>Details:</strong> ${escapeHtml(r.description)}</div>` : ''}
          <div style="display:flex;gap:0.5rem;justify-content:flex-end;">
            <button onclick="dismissReport('${r.id}')" style="padding:0.5rem 1rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">Dismiss</button>
            <button onclick="resolveReport('${r.id}', '${r.post_id}')" style="padding:0.5rem 1rem;background:#dc2626;color:white;border:none;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-trash"></i> Delete Post</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadActivityLog() {
  const { data: logs, error } = await db
    .from('admin_activity_logs')
    .select(`*, profiles:admin_id(first_name, last_name, admin_role)`)
    .order('created_at', { ascending: false })
    .limit(50);

  const tbody = document.getElementById('activityLogBody');

  if (error || !logs?.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:3rem;text-align:center;color:var(--gray-400);">No activity logged yet.</td></tr>`;
    return;
  }

  const actionLabels = {
    approve_user: { label: 'Approved User', color: '#16a34a', icon: 'fa-user-check' },
    reject_user: { label: 'Rejected User', color: '#dc2626', icon: 'fa-user-times' },
    suspend_user: { label: 'Suspended User', color: '#d97706', icon: 'fa-user-slash' },
    delete_post: { label: 'Deleted Post', color: '#dc2626', icon: 'fa-trash' },
    flag_post: { label: 'Flagged Post', color: '#ef4444', icon: 'fa-flag' },
    unflag_post: { label: 'Cleared Flag', color: '#10b981', icon: 'fa-flag' },
    pin_post: { label: 'Pinned Post', color: '#3b82f6', icon: 'fa-thumbtack' },
    unpin_post: { label: 'Unpinned Post', color: '#6b7280', icon: 'fa-thumbtack' },
  };

  tbody.innerHTML = logs.map(log => {
    const admin = log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'Unknown Admin';
    const role = log.profiles?.admin_role || '';
    const action = actionLabels[log.action_type] || { label: log.action_type, color: '#6b7280', icon: 'fa-cog' };
    const timeAgo = formatTimeAgo(new Date(log.created_at));

    return `
      <tr style="border-bottom:1px solid var(--gray-200);">
        <td style="padding:0.875rem 1rem;">
          <div style="font-weight:600;font-size:13px;">${escapeHtml(admin)}</div>
          <div style="font-size:12px;color:var(--gray-400);">${role} Admin</div>
        </td>
        <td style="padding:0.875rem 1rem;">
          <span style="display:inline-flex;align-items:center;gap:0.375rem;padding:3px 10px;background:${action.color}18;color:${action.color};border-radius:9999px;font-size:12px;font-weight:600;">
            <i class="fas ${action.icon}"></i> ${action.label}
          </span>
        </td>
        <td style="padding:0.875rem 1rem;font-size:13px;color:var(--gray-500);font-family:monospace;">${log.target_id ? log.target_id.slice(0,8) + '...' : '—'}</td>
        <td style="padding:0.875rem 1rem;font-size:13px;color:var(--gray-400);">${timeAgo}</td>
      </tr>
    `;
  }).join('');
}

async function unflagPost(postId) {
  if (!confirm('Clear the flag on this post?')) return;
  const { error } = await db.from('posts').update({ is_flagged: false, flag_reason: null }).eq('id', postId);
  if (!error) { await logActivity('unflag_post', postId, 'post'); await loadStats(); await loadFlaggedPosts(); }
}

async function deletePost(postId) {
  if (!confirm('Delete this post permanently? This cannot be undone.')) return;
  const { error } = await db.from('posts').delete().eq('id', postId);
  if (!error) { await logActivity('delete_post', postId, 'post'); await loadStats(); await loadFlaggedPosts(); }
}

async function dismissReport(reportId) {
  const { error } = await db.from('post_reports').update({ status: 'dismissed', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString() }).eq('id', reportId);
  if (!error) { await loadStats(); await loadReports(); }
}

async function resolveReport(reportId, postId) {
  if (!confirm('Delete the reported post? This cannot be undone.')) return;
  await db.from('posts').delete().eq('id', postId);
  await db.from('post_reports').update({ status: 'reviewed', reviewed_by: adminUser.id, reviewed_at: new Date().toISOString() }).eq('id', reportId);
  await logActivity('delete_post', postId, 'post');
  await loadStats();
  await loadReports();
}

async function logActivity(actionType, targetId, targetType) {
  try { await db.from('admin_activity_logs').insert({ admin_id: adminUser.id, action_type: actionType, target_id: targetId, target_type: targetType }); } catch(e) {}
}

function setupTabs() {
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn[data-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('tabFlagged').style.display = tab === 'flagged' ? 'block' : 'none';
      document.getElementById('tabReports').style.display = tab === 'reports' ? 'block' : 'none';
      document.getElementById('tabActivitylog').style.display = tab === 'activitylog' ? 'block' : 'none';
      if (tab === 'reports') await loadReports();
      if (tab === 'activitylog') await loadActivityLog();
    });
  });
}

function formatTimeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });
