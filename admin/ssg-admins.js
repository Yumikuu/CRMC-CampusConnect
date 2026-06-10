// ═══════════════════════════════════════════════════════════════
// SSG MANAGE ADMINS — Assign, change, and remove admin roles
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let searchTimer = null;

const ROLES = {
  SSG:         { label: 'Main Admin',    color: '#6B0F1A', bg: 'rgba(107,15,26,0.1)',  icon: 'fa-crown'              },
  SSG_OFFICER: { label: 'SSG Officer',  color: '#b7950b', bg: 'rgba(183,149,11,0.1)', icon: 'fa-star'               },
  CTE:         { label: 'CTE Admin',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', icon: 'fa-chalkboard-teacher' },
  CSS:         { label: 'CSS Admin',    color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: 'fa-laptop-code'        },
  CBE:         { label: 'CBE Admin',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: 'fa-briefcase'          },
  PSYCH:       { label: 'PSYCH Admin',  color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', icon: 'fa-brain'              },
  CCJE:        { label: 'CCJE Admin',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: 'fa-gavel'              },
};

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

  await loadRoleCards();
  await loadAdminsTable();
  setupListeners();
})();

// ── ROLE SUMMARY CARDS ──
async function loadRoleCards() {
  const container = document.getElementById('roleCards');

  const counts = await Promise.all(
    Object.entries(ROLES).map(async ([role, meta]) => {
      const { count } = await db.from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('admin_role', role);
      return { role, meta, count: count || 0 };
    })
  );

  container.innerHTML = counts.map(({ role, meta, count }) => `
    <div class="stat-card" style="cursor:default;">
      <div class="stat-icon" style="background:${meta.bg};color:${meta.color};">
        <i class="fas ${meta.icon}"></i>
      </div>
      <div class="stat-content">
        <div class="stat-value" style="color:${meta.color};">${count}</div>
        <div class="stat-label">${meta.label}</div>
      </div>
    </div>
  `).join('');
}

// ── ADMINS TABLE ──
async function loadAdminsTable() {
  const { data: admins, error } = await db
    .from('profiles')
    .select('*')
    .in('admin_role', ['SSG', 'SSG_OFFICER', 'CTE', 'CSS', 'CBE', 'PSYCH', 'CCJE'])
    .order('admin_role')
    .order('last_name');

  const tbody = document.getElementById('adminsTableBody');

  if (error || !admins?.length) {
    tbody.innerHTML = `
      <tr><td colspan="5" style="padding:3rem;text-align:center;color:var(--gray-400);">
        <i class="fas fa-user-shield" style="font-size:2rem;"></i>
        <p style="margin-top:1rem;">No admin accounts found.</p>
        <p style="font-size:13px;margin-top:0.5rem;">Click "Assign Admin Role" to get started.</p>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = admins.map(admin => {
    const fullName = `${admin.first_name} ${admin.last_name}`;
    const initials = (admin.first_name[0] + admin.last_name[0]).toUpperCase();
    const role = ROLES[admin.admin_role];
    const isSelf = admin.id === adminUser.id;
    const deptShort = admin.department?.match(/\(([^)]+)\)/)?.[1] || admin.department || '—';

    return `
      <tr style="border-bottom:1px solid var(--gray-200);">
        <td style="padding:1rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:40px;height:40px;border-radius:50%;background:${role?.color || 'var(--maroon)'};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">
              ${initials}
            </div>
            <div>
              <div style="font-weight:600;font-size:14px;">
                ${escapeHtml(fullName)}
                ${isSelf ? '<span style="font-size:11px;background:#dcfce7;color:#16a34a;padding:2px 6px;border-radius:9999px;margin-left:6px;">You</span>' : ''}
              </div>
              <div style="font-size:12px;color:var(--gray-500);">${escapeHtml(admin.email)}</div>
            </div>
          </div>
        </td>
        <td style="padding:1rem;">
          <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;background:${role?.bg || 'var(--gray-100)'};color:${role?.color || 'var(--gray-700)'};border-radius:9999px;font-size:12px;font-weight:700;">
            <i class="fas ${role?.icon || 'fa-user-shield'}"></i> ${role?.label || admin.admin_role}
          </span>
        </td>
        <td style="padding:1rem;font-size:13px;font-weight:500;color:var(--gray-700);">${escapeHtml(deptShort)}</td>
        <td style="padding:1rem;font-family:monospace;font-size:13px;color:var(--gray-600);">${escapeHtml(admin.student_id)}</td>
        <td style="padding:1rem;">
          <div style="display:flex;gap:0.5rem;justify-content:center;">
            <button onclick="openChangeRole('${admin.id}', '${escapeHtml(fullName)}', '${admin.admin_role}')"
              style="padding:0.375rem 0.75rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
              <i class="fas fa-exchange-alt"></i> Change Role
            </button>
            ${!isSelf ? `
            <button onclick="removeAdmin('${admin.id}', '${escapeHtml(fullName)}')"
              style="padding:0.375rem 0.75rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
              <i class="fas fa-user-minus"></i> Remove
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ── SEARCH STUDENTS ──
async function searchStudents(term) {
  if (!term || term.length < 2) {
    document.getElementById('searchResults').style.display = 'none';
    return;
  }

  const { data: students } = await db
    .from('profiles')
    .select('id, first_name, last_name, email, student_id, department, admin_role')
    .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%,student_id.ilike.%${term}%`)
    .limit(8);

  const resultsBox = document.getElementById('searchResults');

  if (!students?.length) {
    resultsBox.style.display = 'block';
    resultsBox.innerHTML = `<div style="padding:0.75rem 1rem;color:var(--gray-400);font-size:13px;">No students found</div>`;
    return;
  }

  resultsBox.style.display = 'block';
  resultsBox.innerHTML = students.map(s => {
    const fullName = `${s.first_name} ${s.last_name}`;
    const deptShort = s.department?.match(/\(([^)]+)\)/)?.[1] || s.department || '';
    const currentRole = s.admin_role && s.admin_role !== 'student' ? ` • ${s.admin_role} Admin` : '';

    return `
      <div onclick="selectStudent('${s.id}', '${escapeHtml(fullName)}', '${escapeHtml(s.student_id)}', '${escapeHtml(deptShort)}')"
        style="padding:0.75rem 1rem;cursor:pointer;border-bottom:1px solid var(--gray-100);display:flex;align-items:center;gap:0.75rem;"
        onmouseover="this.style.background='var(--gray-50)'" onmouseout="this.style.background='white'">
        <div style="width:34px;height:34px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">
          ${(s.first_name[0] + s.last_name[0]).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:600;font-size:13px;">${escapeHtml(fullName)}${currentRole}</div>
          <div style="font-size:12px;color:var(--gray-500);">${escapeHtml(s.student_id)} • ${escapeHtml(deptShort)}</div>
        </div>
      </div>
    `;
  }).join('');
}

function selectStudent(id, name, studentId, dept) {
  document.getElementById('selectedStudentId').value = id;
  document.getElementById('selectedStudentName').textContent = name;
  document.getElementById('selectedStudentInfo').textContent = `${studentId} • ${dept}`;
  document.getElementById('selectedStudentCard').style.display = 'block';
  document.getElementById('searchResults').style.display = 'none';
  document.getElementById('studentSearch').value = name;
}

// ── ASSIGN ROLE ──
document.getElementById('confirmAssignBtn').addEventListener('click', async () => {
  const userId = document.getElementById('selectedStudentId').value;
  const role = document.getElementById('roleSelect').value;

  if (!userId) { alert('Please select a student first.'); return; }

  const btn = document.getElementById('confirmAssignBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  const { error } = await db.from('profiles').update({ admin_role: role }).eq('id', userId);

  btn.textContent = 'Assign Role'; btn.disabled = false;

  if (error) { alert('Error: ' + error.message); return; }

  closeAssignModal();
  await loadRoleCards();
  await loadAdminsTable();
});

// ── CHANGE ROLE ──
function openChangeRole(userId, name, currentRole) {
  document.getElementById('changeRoleUserId').value = userId;
  document.getElementById('changeRoleAdminInfo').innerHTML = `
    <div style="font-weight:700;font-size:15px;">${escapeHtml(name)}</div>
    <div style="font-size:13px;color:var(--gray-500);margin-top:2px;">Current role: <strong>${currentRole}</strong></div>
  `;
  document.getElementById('newRoleSelect').value = currentRole;
  document.getElementById('changeRoleModal').style.display = 'flex';
}

document.getElementById('confirmChangeRoleBtn').addEventListener('click', async () => {
  const userId = document.getElementById('changeRoleUserId').value;
  const newRole = document.getElementById('newRoleSelect').value;

  const btn = document.getElementById('confirmChangeRoleBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  const { error } = await db.from('profiles').update({ admin_role: newRole }).eq('id', userId);

  btn.textContent = 'Save Change'; btn.disabled = false;

  if (error) { alert('Error: ' + error.message); return; }

  closeChangeRoleModal();
  await loadRoleCards();
  await loadAdminsTable();
});

function closeChangeRoleModal() {
  document.getElementById('changeRoleModal').style.display = 'none';
}

// ── REMOVE ADMIN ──
async function removeAdmin(userId, name) {
  if (!confirm(`Remove admin access for ${name}? They will become a regular student.`)) return;

  const { error } = await db.from('profiles').update({ admin_role: 'student' }).eq('id', userId);

  if (error) { alert('Error: ' + error.message); return; }

  await loadRoleCards();
  await loadAdminsTable();
}

// ── ASSIGN MODAL ──
function openAssignModal() {
  document.getElementById('selectedStudentId').value = '';
  document.getElementById('selectedStudentCard').style.display = 'none';
  document.getElementById('studentSearch').value = '';
  document.getElementById('searchResults').style.display = 'none';
  document.getElementById('assignModal').style.display = 'flex';
}

function closeAssignModal() {
  document.getElementById('assignModal').style.display = 'none';
}

// ── EVENT LISTENERS ──
function setupListeners() {
  document.getElementById('assignAdminBtn').addEventListener('click', openAssignModal);

  document.getElementById('studentSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchStudents(e.target.value.trim()), 350);
  });

  document.getElementById('assignModal').addEventListener('click', e => {
    if (e.target.id === 'assignModal') closeAssignModal();
    // Hide search results when clicking outside
    if (!e.target.closest('#searchResults') && !e.target.closest('#studentSearch')) {
      document.getElementById('searchResults').style.display = 'none';
    }
  });

  document.getElementById('changeRoleModal').addEventListener('click', e => {
    if (e.target.id === 'changeRoleModal') closeChangeRoleModal();
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });
