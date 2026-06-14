// ═══════════════════════════════════════════════════════════════
// SSG COMMUNITIES — Create, edit, and delete communities
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let allCommunities = [];
let currentFilter = 'all';
let pendingDeleteId = null;

const TYPE_ICONS = {
  department: { icon: 'fa-building', color: '#6B0F1A' },
  public:     { icon: 'fa-globe',    color: '#2563eb' },
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

  await loadCommunities();
  setupListeners();
})();

async function loadCommunities() {
  const { data, error } = await db.from('communities').select('*').order('type').order('name');
  if (error) { console.error(error); return; }

  // Get post counts for each community
  const withCounts = await Promise.all((data || []).map(async c => {
    const { count } = await db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', c.id);
    return { ...c, postCount: count || 0 };
  }));

  allCommunities = withCounts;
  renderCommunities();
}

function renderCommunities() {
  const filtered = currentFilter === 'all'
    ? allCommunities
    : allCommunities.filter(c => c.type === currentFilter);

  const grid = document.getElementById('communitiesGrid');

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gray-400);"><i class="fas fa-layer-group" style="font-size:2.5rem;"></i><p style="margin-top:1rem;">No communities found.</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(c => {
    const meta = TYPE_ICONS[c.type] || TYPE_ICONS.public;
    return `
      <div class="card" style="transition:box-shadow 0.2s;">
        <div class="card-body">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;">
            <div style="display:flex;align-items:center;gap:0.875rem;min-width:0;">
              <div style="width:48px;height:48px;border-radius:12px;background:${meta.color}18;color:${meta.color};display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;">
                <i class="fas ${meta.icon}"></i>
              </div>
              <div style="min-width:0;">
                <div style="font-weight:700;font-size:15px;color:var(--gray-900);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(c.name)}</div>
                <div style="font-size:12px;color:var(--gray-400);margin-top:2px;">/${escapeHtml(c.slug)}</div>
              </div>
            </div>
            <span style="padding:3px 10px;background:${meta.color}18;color:${meta.color};border-radius:9999px;font-size:11px;font-weight:700;text-transform:capitalize;flex-shrink:0;">${c.type}</span>
          </div>

          ${c.description ? `<p style="margin-top:0.875rem;font-size:13px;color:var(--gray-600);line-height:1.5;">${escapeHtml(c.description)}</p>` : ''}
          ${c.department ? `<div style="margin-top:0.625rem;"><span style="font-size:12px;font-weight:600;color:var(--maroon);background:rgba(107,15,26,0.07);padding:3px 8px;border-radius:6px;"><i class="fas fa-university"></i> ${escapeHtml(c.department.match(/\(([^)]+)\)/)?.[1] || c.department)}</span></div>` : ''}

          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:1rem;padding-top:0.875rem;border-top:1px solid var(--gray-200);">
            <span style="font-size:13px;color:var(--gray-500);"><i class="fas fa-newspaper" style="margin-right:4px;"></i>${c.postCount} posts</span>
            <div style="display:flex;gap:0.5rem;">
              <button onclick="openEditModal('${c.id}')" style="padding:0.375rem 0.875rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-edit"></i> Edit</button>
              <button onclick="confirmDeleteComm('${c.id}', '${escapeHtml(c.name)}')" style="padding:0.375rem 0.875rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openAddModal() {
  document.getElementById('communityModalTitle').textContent = 'New Community';
  document.getElementById('editCommunityId').value = '';
  document.getElementById('communityForm').reset();
  document.getElementById('deptSelectWrap').style.display = 'none';
  document.getElementById('communityModal').style.display = 'flex';
}

function openEditModal(id) {
  const c = allCommunities.find(x => x.id === id);
  if (!c) return;
  document.getElementById('communityModalTitle').textContent = 'Edit Community';
  document.getElementById('editCommunityId').value = c.id;
  document.getElementById('commName').value = c.name;
  document.getElementById('commSlug').value = c.slug;
  document.getElementById('commDesc').value = c.description || '';
  document.getElementById('commType').value = c.type;
  document.getElementById('deptSelectWrap').style.display = c.type === 'department' ? 'block' : 'none';
  if (c.department) document.getElementById('commDept').value = c.department;
  document.getElementById('communityModal').style.display = 'flex';
}

function closeCommunityModal() {
  document.getElementById('communityModal').style.display = 'none';
}

async function saveCommunity() {
  const id = document.getElementById('editCommunityId').value;
  const name = document.getElementById('commName').value.trim();
  const slug = document.getElementById('commSlug').value.trim();
  const description = document.getElementById('commDesc').value.trim();
  const type = document.getElementById('commType').value;
  const department = type === 'department' ? document.getElementById('commDept').value : null;

  if (!name || !slug) { alert('Name and slug are required.'); return; }

  const btn = document.getElementById('saveCommunityBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  const payload = { name, slug, description: description || null, type, department };

  if (id) {
    const { error } = await db.from('communities').update(payload).eq('id', id);
    if (error) { alert('Error: ' + error.message); btn.textContent = 'Save Community'; btn.disabled = false; return; }
  } else {
    const { error } = await db.from('communities').insert(payload);
    if (error) { alert('Error: ' + error.message); btn.textContent = 'Save Community'; btn.disabled = false; return; }
  }

  btn.textContent = 'Save Community'; btn.disabled = false;
  closeCommunityModal();
  await loadCommunities();
}

function confirmDeleteComm(id, name) {
  pendingDeleteId = id;
  document.getElementById('deleteCommMessage').textContent = `Delete "${name}"? All posts in this community will also be deleted. This cannot be undone.`;
  document.getElementById('deleteCommModal').style.display = 'flex';
}

function closeDeleteCommModal() {
  pendingDeleteId = null;
  document.getElementById('deleteCommModal').style.display = 'none';
}

document.getElementById('confirmDeleteCommBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirmDeleteCommBtn');
  btn.textContent = 'Deleting...'; btn.disabled = true;
  const { error } = await db.from('communities').delete().eq('id', pendingDeleteId);
  btn.textContent = 'Delete'; btn.disabled = false;
  if (!error) { closeDeleteCommModal(); await loadCommunities(); }
  else alert('Error: ' + error.message);
});

function setupListeners() {
  document.getElementById('addCommunityBtn').addEventListener('click', openAddModal);

  // Tab filters
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCommunities();
    });
  });

  // Auto-generate slug from name
  document.getElementById('commName').addEventListener('input', e => {
    if (!document.getElementById('editCommunityId').value) {
      document.getElementById('commSlug').value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
  });

  // Show/hide department field
  document.getElementById('commType').addEventListener('change', e => {
    document.getElementById('deptSelectWrap').style.display = e.target.value === 'department' ? 'block' : 'none';
  });

  // Close modals on background click
  document.getElementById('communityModal').addEventListener('click', e => { if (e.target.id === 'communityModal') closeCommunityModal(); });
  document.getElementById('deleteCommModal').addEventListener('click', e => { if (e.target.id === 'deleteCommModal') closeDeleteCommModal(); });
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });
