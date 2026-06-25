// ═══════════════════════════════════════════════════════════════
// SSG KEYWORD MANAGEMENT — Module 3: Admin UI for flagging keywords
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let allKeywords = [];
let currentFilter = 'all';

const SEVERITY_STYLES = {
  critical: { bg: '#fee2e2', color: '#dc2626', label: 'Critical' },
  high:     { bg: '#fef3c7', color: '#d97706', label: 'High' },
  medium:   { bg: '#dbeafe', color: '#2563eb', label: 'Medium' },
  low:      { bg: '#dcfce7', color: '#059669', label: 'Low' },
};

const CATEGORY_LABELS = {
  self_harm:     'Self Harm',
  violence:      'Violence',
  harassment:    'Harassment',
  inappropriate: 'Inappropriate',
  spam:          'Spam',
  urgent:        'Urgent',
};

// ── AUTH + INIT ──
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

  await loadKeywords();
  setupListeners();
})();

// ── LOAD KEYWORDS ──
async function loadKeywords() {
  const { data: keywords, error } = await db
    .from('flagged_keywords')
    .select('*')
    .order('severity')
    .order('category')
    .order('keyword');

  if (error) {
    console.error('Error loading keywords:', error);
    return;
  }

  allKeywords = keywords || [];
  updateStats();
  renderTable();
}

// ── UPDATE STATS ──
function updateStats() {
  const critical = allKeywords.filter(k => k.severity === 'critical').length;
  const high = allKeywords.filter(k => k.severity === 'high').length;
  const medium = allKeywords.filter(k => k.severity === 'medium').length;

  document.getElementById('statCritical').textContent = critical;
  document.getElementById('statHigh').textContent = high;
  document.getElementById('statMedium').textContent = medium;
  document.getElementById('statTotal').textContent = allKeywords.length;
}

// ── RENDER TABLE ──
function renderTable() {
  const tbody = document.getElementById('keywordsTableBody');
  let filtered = allKeywords;

  if (currentFilter !== 'all') {
    filtered = allKeywords.filter(k => k.category === currentFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="5" style="padding:3rem;text-align:center;color:var(--gray-400);">
        <i class="fas fa-filter" style="font-size:1.5rem;display:block;margin-bottom:0.5rem;"></i>
        No keywords found${currentFilter !== 'all' ? ' in this category' : ''}.
      </td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(kw => {
    const sev = SEVERITY_STYLES[kw.severity] || SEVERITY_STYLES.medium;
    const catLabel = CATEGORY_LABELS[kw.category] || kw.category;
    const date = new Date(kw.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return `
      <tr style="border-bottom:1px solid var(--gray-100);">
        <td style="padding:0.875rem 1rem;">
          <code style="background:var(--gray-100);padding:3px 8px;border-radius:4px;font-size:13px;font-weight:600;">${escapeHtml(kw.keyword)}</code>
        </td>
        <td style="padding:0.875rem 1rem;">
          <span style="font-size:12px;font-weight:600;color:var(--gray-700);">${catLabel}</span>
        </td>
        <td style="padding:0.875rem 1rem;">
          <span style="display:inline-block;padding:3px 10px;border-radius:9999px;font-size:11px;font-weight:700;background:${sev.bg};color:${sev.color};">${sev.label}</span>
        </td>
        <td style="padding:0.875rem 1rem;font-size:12px;color:var(--gray-500);">${date}</td>
        <td style="padding:0.875rem 1rem;">
          <div style="display:flex;gap:0.4rem;justify-content:center;">
            <button onclick="editKeyword('${kw.id}')" style="padding:0.35rem 0.65rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
              <i class="fas fa-edit"></i>
            </button>
            <button onclick="deleteKeyword('${kw.id}', '${escapeHtml(kw.keyword)}')" style="padding:0.35rem 0.65rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

// ── ADD KEYWORD ──
function openAddModal() {
  document.getElementById('keywordModalTitle').textContent = 'Add Keyword';
  document.getElementById('kwInput').value = '';
  document.getElementById('kwCategory').value = 'harassment';
  document.getElementById('kwSeverity').value = 'medium';
  document.getElementById('kwEditId').value = '';
  document.getElementById('keywordModal').style.display = 'flex';
  document.getElementById('kwInput').focus();
}

// ── EDIT KEYWORD ──
function editKeyword(id) {
  const kw = allKeywords.find(k => k.id === id);
  if (!kw) return;

  document.getElementById('keywordModalTitle').textContent = 'Edit Keyword';
  document.getElementById('kwInput').value = kw.keyword;
  document.getElementById('kwCategory').value = kw.category;
  document.getElementById('kwSeverity').value = kw.severity;
  document.getElementById('kwEditId').value = kw.id;
  document.getElementById('keywordModal').style.display = 'flex';
  document.getElementById('kwInput').focus();
}

// ── SAVE KEYWORD ──
async function saveKeyword() {
  const keyword = document.getElementById('kwInput').value.trim().toLowerCase();
  const category = document.getElementById('kwCategory').value;
  const severity = document.getElementById('kwSeverity').value;
  const editId = document.getElementById('kwEditId').value;

  if (!keyword) { alert('Please enter a keyword.'); return; }

  const btn = document.getElementById('saveKeywordBtn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  try {
    if (editId) {
      // Update existing
      const { error } = await db.from('flagged_keywords')
        .update({ keyword, category, severity })
        .eq('id', editId);
      if (error) throw error;
    } else {
      // Insert new
      const { error } = await db.from('flagged_keywords')
        .insert({ keyword, category, severity });
      if (error) throw error;
    }

    closeKeywordModal();
    await loadKeywords();

  } catch (err) {
    alert('Error: ' + (err.message || 'Failed to save keyword. It may already exist.'));
  } finally {
    btn.textContent = 'Save Keyword'; btn.disabled = false;
  }
}

// ── DELETE KEYWORD ──
async function deleteKeyword(id, keyword) {
  if (!confirm(`Delete keyword "${keyword}"? This will stop it from being auto-flagged.`)) return;

  const { error } = await db.from('flagged_keywords').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }

  await loadKeywords();
}

// ── MODAL CONTROLS ──
function closeKeywordModal() {
  document.getElementById('keywordModal').style.display = 'none';
}

// ── EVENT LISTENERS ──
function setupListeners() {
  document.getElementById('addKeywordBtn').addEventListener('click', openAddModal);
  document.getElementById('saveKeywordBtn').addEventListener('click', saveKeyword);

  document.getElementById('filterCategory').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderTable();
  });

  document.getElementById('keywordModal').addEventListener('click', (e) => {
    if (e.target.id === 'keywordModal') closeKeywordModal();
  });

  // Enter key in keyword input
  document.getElementById('kwInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveKeyword();
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });
