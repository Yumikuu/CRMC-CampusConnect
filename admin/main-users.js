// ═══════════════════════════════════════════════════════════════
// SSG USER MANAGEMENT — Approve, manage, and monitor users
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let allUsers = [];
let currentFilter = 'all';

// ── AUTH GUARD ──
(async () => {
  const { data: { session } } = await db.auth.getSession();

  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || profile.admin_role !== 'SSG') {
    window.location.href = profile?.admin_role ? 'dept-dashboard.html' : '../campusfeed.html';
    return;
  }

  adminUser = profile;

  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName = `${profile.first_name} ${profile.last_name}`;

  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminName').textContent = fullName;

  await loadRecentUsersQuick();
  await loadUsers();
  setupEventListeners();
})();

// Load recent users quick view
async function loadRecentUsersQuick() {
  const el = document.getElementById('recentUsersQuick');
  if (!el) return;
  try {
    const { data: users } = await db.from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!users || users.length === 0) {
      el.innerHTML = '<div style="color:var(--gray-400);font-size:13px;text-align:center;padding:1rem;">No users yet.</div>';
      return;
    }

    const statusColors = { approved: '#16a34a', pending: '#d97706', rejected: '#dc2626', suspended: '#6b7280' };

    el.innerHTML = users.map(u => {
      const fullName = `${u.first_name} ${u.last_name}`;
      const initials = (u.first_name[0] + u.last_name[0]).toUpperCase();
      const dept = u.department?.match(/\(([^)]+)\)/)?.[1] || u.department || '';
      const time = formatTimeAgo(new Date(u.created_at));
      const statusColor = statusColors[u.account_status] || '#6b7280';
      return `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid var(--gray-100);">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:var(--gray-800);">${escapeHtml(fullName)}</div>
            <div style="font-size:11px;color:var(--gray-400);">${dept} · ${u.student_id} · ${time}</div>
          </div>
          <span style="padding:2px 8px;background:${statusColor}18;color:${statusColor};border-radius:9999px;font-size:10px;font-weight:700;text-transform:capitalize;">${u.account_status}</span>
        </div>`;
    }).join('');
  } catch(e) {
    el.innerHTML = '<div style="color:var(--gray-400);font-size:13px;">Failed to load.</div>';
  }
}

// ── LOAD ALL USERS ──
async function loadUsers() {
  try {
    const { data: users, error } = await db
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    allUsers = users || [];
    updateCounts();
    renderUsers();

  } catch (err) {
    console.error('Error loading users:', err);
    showError('Failed to load users');
  }
}

// ── UPDATE STATUS COUNTS ──
function updateCounts() {
  document.getElementById('countAll').textContent = allUsers.length;
  document.getElementById('countApproved').textContent = allUsers.filter(u => u.account_status === 'approved').length;
  document.getElementById('countSuspended').textContent = allUsers.filter(u => u.account_status === 'suspended').length;
}

// ── RENDER USERS TABLE ──
function renderUsers() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const deptFilter = document.getElementById('departmentFilter').value;

  let filtered = allUsers.filter(user => {
    // Filter by status
    if (currentFilter !== 'all' && user.account_status !== currentFilter) return false;

    // Filter by search term
    if (searchTerm) {
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const email = user.email.toLowerCase();
      const studentId = user.student_id.toLowerCase();
      if (!fullName.includes(searchTerm) && !email.includes(searchTerm) && !studentId.includes(searchTerm)) {
        return false;
      }
    }

    // Filter by department
    if (deptFilter && user.department !== deptFilter) return false;

    return true;
  });

  const tbody = document.getElementById('usersTableBody');

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:3rem;text-align:center;color:var(--gray-400);">
          <i class="fas fa-user-slash" style="font-size:2rem;"></i>
          <p style="margin-top:1rem;">No users found</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(user => {
    const fullName = `${user.first_name} ${user.last_name}`;
    const initials = (user.first_name[0] + user.last_name[0]).toUpperCase();
    const timeAgo = formatTimeAgo(new Date(user.created_at));
    const deptShort = user.department.match(/\(([^)]+)\)/)?.[1] || user.department;
    
    let statusBadge = '';
    let statusColor = '';
    
    switch(user.account_status) {
      case 'approved':
        statusBadge = '<i class="fas fa-check-circle"></i> Active';
        statusColor = '#10b981';
        break;
      case 'suspended':
        statusBadge = '<i class="fas fa-ban"></i> Suspended';
        statusColor = '#ef4444';
        break;
      default:
        statusBadge = '<i class="fas fa-check-circle"></i> Active';
        statusColor = '#10b981';
    }

    return `
      <tr style="border-bottom:1px solid var(--gray-200);">
        <td style="padding:1rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px;">
              ${initials}
            </div>
            <div>
              <div style="font-weight:600;font-size:14px;color:var(--gray-900);">${escapeHtml(fullName)}</div>
              <div style="font-size:13px;color:var(--gray-500);">${escapeHtml(user.email)}</div>
            </div>
          </div>
        </td>
        <td style="padding:1rem;">
          <span style="font-family:monospace;font-size:13px;color:var(--gray-700);">${escapeHtml(user.student_id)}</span>
        </td>
        <td style="padding:1rem;">
          <span style="font-size:13px;color:var(--gray-700);font-weight:500;">${escapeHtml(deptShort)}</span>
        </td>
        <td style="padding:1rem;">
          <span style="display:inline-flex;align-items:center;gap:0.375rem;padding:0.25rem 0.75rem;background:${statusColor}15;color:${statusColor};border-radius:9999px;font-size:12px;font-weight:600;">
            ${statusBadge}
          </span>
        </td>
        <td style="padding:1rem;">
          <span style="font-size:13px;color:var(--gray-600);">${timeAgo}</span>
        </td>
        <td style="padding:1rem;">
          <div style="display:flex;gap:0.5rem;justify-content:center;">
            ${user.account_status === 'suspended' ? `
              <button onclick="unsuspendUser('${user.id}')" style="padding:0.375rem 0.75rem;background:#10b981;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
                <i class="fas fa-check"></i> Unsuspend
              </button>
            ` : `
              <button onclick="suspendUser('${user.id}')" style="padding:0.375rem 0.75rem;background:#f59e0b;color:white;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
                <i class="fas fa-ban"></i> Suspend
              </button>
            `}
            <button onclick="viewUserDetails('${user.id}')" style="padding:0.375rem 0.75rem;background:var(--gray-100);color:var(--gray-700);border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;">
              <i class="fas fa-eye"></i> View
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── USER ACTIONS ──
async function suspendUser(userId) {
  if (!confirm('Suspend this user? They will be temporarily blocked from the platform.')) return;

  try {
    const { error } = await db
      .from('profiles')
      .update({ account_status: 'suspended' })
      .eq('id', userId);

    if (error) throw error;

    await logActivity('suspend_user', userId, 'user');

    showSuccess('User suspended');
    await loadUsers();

  } catch (err) {
    console.error('Error suspending user:', err);
    showError('Failed to suspend user');
  }
}

async function unsuspendUser(userId) {
  if (!confirm('Unsuspend this user and restore their access?')) return;

  try {
    const { error } = await db
      .from('profiles')
      .update({ account_status: 'approved' })
      .eq('id', userId);

    if (error) throw error;

    await logActivity('approve_user', userId, 'user');

    showSuccess('User unsuspended');
    await loadUsers();

  } catch (err) {
    console.error('Error unsuspending user:', err);
    showError('Failed to unsuspend user');
  }
}

async function viewUserDetails(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  // Get user's post count
  const { count: postCount } = await db
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);

  // Get user's comment count
  const { count: commentCount } = await db
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('author_id', userId);

  const fullName = `${user.first_name} ${user.last_name}`;
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', month: 'long', day: 'numeric' 
  });

  document.getElementById('userModalBody').innerHTML = `
    <div style="text-align:center;padding:1rem 0;">
      <div style="width:80px;height:80px;border-radius:50%;background:var(--maroon);color:white;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:2rem;">
        ${(user.first_name[0] + user.last_name[0]).toUpperCase()}
      </div>
      <h3 style="margin-top:1rem;font-size:1.25rem;font-weight:700;">${escapeHtml(fullName)}</h3>
      <p style="color:var(--gray-600);font-size:14px;">${escapeHtml(user.email)}</p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1.5rem;padding:1rem;background:var(--gray-50);border-radius:var(--radius-sm);">
      <div>
        <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Student ID</div>
        <div style="margin-top:0.25rem;font-family:monospace;font-weight:600;">${escapeHtml(user.student_id)}</div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Department</div>
        <div style="margin-top:0.25rem;font-weight:600;">${escapeHtml(user.department.match(/\(([^)]+)\)/)?.[1] || user.department)}</div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Status</div>
        <div style="margin-top:0.25rem;font-weight:600;text-transform:capitalize;">${escapeHtml(user.account_status)}</div>
      </div>
      <div>
        <div style="font-size:12px;color:var(--gray-600);font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Joined</div>
        <div style="margin-top:0.25rem;font-weight:600;">${joinDate}</div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-top:1rem;">
      <div style="padding:1rem;background:var(--maroon);color:white;border-radius:var(--radius-sm);text-align:center;">
        <div style="font-size:2rem;font-weight:800;">${postCount || 0}</div>
        <div style="font-size:13px;opacity:0.9;">Posts Created</div>
      </div>
      <div style="padding:1rem;background:#3b82f6;color:white;border-radius:var(--radius-sm);text-align:center;">
        <div style="font-size:2rem;font-weight:800;">${commentCount || 0}</div>
        <div style="font-size:13px;opacity:0.9;">Comments Made</div>
      </div>
    </div>
  `;

  document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('userModal').style.display = 'none';
}

// ── LOG ADMIN ACTIVITY ──
async function logActivity(actionType, targetId, targetType) {
  try {
    await db.from('admin_activity_logs').insert({
      admin_id: adminUser.id,
      action_type: actionType,
      target_id: targetId,
      target_type: targetType,
      details: { timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

// ── EVENT LISTENERS ──
function setupEventListeners() {
  // Filter tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderUsers();
    });
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', renderUsers);

  // Department filter
  document.getElementById('departmentFilter').addEventListener('change', renderUsers);

  // Close modal on background click
  document.getElementById('userModal').addEventListener('click', (e) => {
    if (e.target.id === 'userModal') closeUserModal();
  });
}

// ── HELPER FUNCTIONS ──
// formatTimeAgo, escapeHtml, and showToast are provided by admin-utils.js

function showSuccess(message) { showToast(message, 'success'); }
function showError(message)   { showToast(message, 'error');   }

// ── LOGOUT ──
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'login.html';
});
