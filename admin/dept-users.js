// ═══════════════════════════════════════════════════════════════
// DEPT USERS — Manage department students
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let allUsers = [];
let currentFilter = 'all';

const DEPT_FULL = {
  'CTE':  'college of teacher education (cte)',
  'CSS':  'college of computer studies (css)',
  'CBE':  'college of business education (cbe)',
  'PSYCH':'psychology (psych)',
  'CCJE': 'college of criminal justice education (ccje)'
};

const STATUS_COLORS = {
  pending:   '#f59e0b',
  approved:  '#10b981',
  suspended: '#ef4444',
  rejected:  '#6b7280',
};

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || !['CTE','CSS','CBE','PSYCH','CCJE'].includes(profile.admin_role)) {
    window.location.href = profile?.admin_role === 'SSG' ? 'main-dashboard.html' : '../campusfeed.html';
    return;
  }
  adminUser = profile;
  initAdminNotifications(profile.id);

  document.getElementById('adminAvatar').textContent = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminName').textContent = `${profile.first_name} ${profile.last_name}`;
  document.getElementById('adminRoleText').textContent = `${profile.admin_role} Admin`;
  document.getElementById('pageTitle').textContent = `${profile.admin_role} Users`;
  document.getElementById('pageSubtitle').textContent = `Manage students in the ${DEPT_FULL[profile.admin_role]}`;
  document.querySelectorAll('.deptLabel').forEach(el => el.textContent = profile.admin_role);

  await loadUsers();
  setupListeners();
})();

async function loadUsers() {
  const { data: users, error } = await db
    .from('profiles')
    .select('*')
    .ilike('department', DEPT_FULL[adminUser.admin_role])
    .not('admin_role', 'in', '("SSG","SSG_OFFICER","CTE","CSS","CBE","PSYCH","CCJE")')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Failed to load users: ' + error.message, 'error');
    return;
  }

  allUsers = users || [];
  updateTabCounts();
  renderUsers();
}

function updateTabCounts() {
  document.getElementById('countAll').textContent       = `(${allUsers.length})`;
  document.getElementById('countPending').textContent   = `(${allUsers.filter(u => u.account_status === 'pending').length})`;
  document.getElementById('countApproved').textContent  = `(${allUsers.filter(u => u.account_status === 'approved').length})`;
  document.getElementById('countSuspended').textContent = `(${allUsers.filter(u => u.account_status === 'suspended').length})`;
}

function getFilteredUsers() {
  let list = allUsers;
  if (currentFilter !== 'all') {
    list = list.filter(u => u.account_status === currentFilter);
  }
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  if (search) {
    list = list.filter(u =>
      (`${u.first_name} ${u.last_name}`).toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search) ||
      (u.student_id || '').toLowerCase().includes(search)
    );
  }
  return list;
}

function renderUsers() {
  const tbody = document.getElementById('usersTableBody');
  const list = getFilteredUsers();

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:3rem;color:var(--gray-400);">
      <i class="fas fa-users" style="font-size:2rem;"></i>
      <p style="margin-top:0.75rem;">No users found</p>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(user => {
    const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || '?';
    const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
    const status = user.account_status || 'pending';
    const color = STATUS_COLORS[status] || '#6b7280';
    const joined = user.created_at
      ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '—';

    let actionBtns = `
      <button onclick="viewUser('${user.id}')"
        style="padding:0.375rem 0.75rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
        <i class="fas fa-eye"></i> View
      </button>`;

    if (status === 'pending') {
      actionBtns += `
        <button onclick="updateStatus('${user.id}','approved')"
          style="padding:0.375rem 0.75rem;background:#dcfce7;color:#166534;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
          <i class="fas fa-check"></i> Approve
        </button>
        <button onclick="updateStatus('${user.id}','rejected')"
          style="padding:0.375rem 0.75rem;background:#fee2e2;color:#991b1b;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
          <i class="fas fa-times"></i> Reject
        </button>`;
    } else if (status === 'approved') {
      actionBtns += `
        <button onclick="updateStatus('${user.id}','suspended')"
          style="padding:0.375rem 0.75rem;background:#fee2e2;color:#991b1b;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
          <i class="fas fa-ban"></i> Suspend
        </button>`;
    } else if (status === 'suspended') {
      actionBtns += `
        <button onclick="updateStatus('${user.id}','approved')"
          style="padding:0.375rem 0.75rem;background:#dcfce7;color:#166534;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
          <i class="fas fa-check"></i> Unsuspend
        </button>`;
    }

    return `<tr style="border-bottom:1px solid var(--gray-200);transition:background .15s;" onmouseenter="this.style.background='var(--gray-50)'" onmouseleave="this.style.background=''">
      <td style="padding:0.875rem 1.25rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="width:38px;height:38px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${escapeHtml(initials)}</div>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--gray-900);">${escapeHtml(fullName)}</div>
            <div style="font-size:12px;color:var(--gray-500);">${escapeHtml(user.email || '—')}</div>
          </div>
        </div>
      </td>
      <td style="padding:0.875rem 1.25rem;font-size:13px;color:var(--gray-700);">${escapeHtml(user.student_id || '—')}</td>
      <td style="padding:0.875rem 1.25rem;">
        <span style="padding:3px 10px;background:${color}20;color:${color};border-radius:9999px;font-size:12px;font-weight:700;text-transform:capitalize;">${escapeHtml(status)}</span>
      </td>
      <td style="padding:0.875rem 1.25rem;font-size:13px;color:var(--gray-600);">${joined}</td>
      <td style="padding:0.875rem 1.25rem;">
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">${actionBtns}</div>
      </td>
    </tr>`;
  }).join('');
}

async function updateStatus(userId, newStatus) {
  const labels = { approved: 'Approved', rejected: 'Rejected', suspended: 'Suspended' };
  const { error } = await db.from('profiles').update({ account_status: newStatus }).eq('id', userId);
  if (error) { showToast('Update failed: ' + error.message, 'error'); return; }

  // log activity
  const actionMap = { approved: 'approve_user', rejected: 'reject_user', suspended: 'suspend_user' };
  await logAdminActivity(adminUser.id, actionMap[newStatus] || newStatus, userId, 'profile');

  showToast(`User ${labels[newStatus] || newStatus}`, 'success');
  await loadUsers();
}

async function viewUser(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  const modalBody = document.getElementById('userModalBody');
  modalBody.innerHTML = `<div style="text-align:center;padding:1rem 0;"><i class="fas fa-spinner fa-spin" style="font-size:1.5rem;color:var(--gray-400);"></i></div>`;
  document.getElementById('userModal').style.display = 'flex';

  // Fetch post count
  const { count: postCount } = await db.from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);

  // Fetch comment count via posts joined — Supabase client can query comments table directly
  const { count: commentCount } = await db.from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId);

  const initials = ((user.first_name?.[0] || '') + (user.last_name?.[0] || '')).toUpperCase() || '?';
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
  const status = user.account_status || 'pending';
  const color = STATUS_COLORS[status] || '#6b7280';
  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  modalBody.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <div style="width:72px;height:72px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">${escapeHtml(initials)}</div>
      <div style="text-align:center;">
        <div style="font-size:1.1rem;font-weight:700;color:var(--gray-900);">${escapeHtml(fullName)}</div>
        <div style="font-size:13px;color:var(--gray-500);">${escapeHtml(user.email || '—')}</div>
        <span style="margin-top:6px;display:inline-block;padding:3px 12px;background:${color}20;color:${color};border-radius:9999px;font-size:12px;font-weight:700;text-transform:capitalize;">${escapeHtml(status)}</span>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-bottom:1.25rem;">
      <div style="background:var(--gray-50);padding:0.875rem;border-radius:var(--radius-sm);text-align:center;">
        <div style="font-size:1.5rem;font-weight:800;color:var(--maroon);">${postCount || 0}</div>
        <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">Posts</div>
      </div>
      <div style="background:var(--gray-50);padding:0.875rem;border-radius:var(--radius-sm);text-align:center;">
        <div style="font-size:1.5rem;font-weight:800;color:var(--maroon);">${commentCount || 0}</div>
        <div style="font-size:12px;color:var(--gray-500);margin-top:2px;">Comments</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:0.5rem;">
      <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--gray-100);">
        <span style="font-size:13px;color:var(--gray-500);font-weight:500;">Student ID</span>
        <span style="font-size:13px;font-weight:600;color:var(--gray-800);">${escapeHtml(user.student_id || '—')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--gray-100);">
        <span style="font-size:13px;color:var(--gray-500);font-weight:500;">Department</span>
        <span style="font-size:13px;font-weight:600;color:var(--gray-800);">${escapeHtml(user.department || '—')}</span>
      </div>
      <div style="display:flex;justify-content:space-between;padding:0.5rem 0;">
        <span style="font-size:13px;color:var(--gray-500);font-weight:500;">Joined</span>
        <span style="font-size:13px;font-weight:600;color:var(--gray-800);">${joined}</span>
      </div>
    </div>`;
}

function setupListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderUsers();
    });
  });

  let t;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(renderUsers, 300);
  });

  document.getElementById('userModal').addEventListener('click', e => {
    if (e.target.id === 'userModal') e.target.style.display = 'none';
  });
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'login.html';
});

