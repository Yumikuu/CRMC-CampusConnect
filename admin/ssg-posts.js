// ═══════════════════════════════════════════════════════════════
// SSG POSTS MANAGEMENT — View and moderate all posts
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let allPosts = [];
let currentFilter = 'all';
let pendingDeleteId = null;
const PAGE_SIZE = 10;
let currentPage = 0;

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
  await loadPosts();
  setupListeners();
})();

async function loadCommunities() {
  const { data } = await db.from('communities').select('id, name').order('name');
  const sel = document.getElementById('communityFilter');
  (data || []).forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });
}

async function loadPosts(reset = true) {
  if (reset) { currentPage = 0; allPosts = []; }

  const from = currentPage * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = db.from('posts')
    .select(`*, profiles:author_id(first_name, last_name, student_id, department), communities:community_id(name)`)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (currentFilter === 'flagged') query = query.eq('is_flagged', true);
  if (currentFilter === 'pinned') query = query.eq('is_pinned', true);

  const communityId = document.getElementById('communityFilter').value;
  if (communityId) query = query.eq('community_id', communityId);

  const searchTerm = document.getElementById('searchInput').value.trim();

  const { data: posts, error } = await query;
  if (error) { console.error(error); return; }

  let filtered = posts || [];
  if (searchTerm) {
    const s = searchTerm.toLowerCase();
    filtered = filtered.filter(p =>
      p.content?.toLowerCase().includes(s) ||
      (p.profiles && `${p.profiles.first_name} ${p.profiles.last_name}`.toLowerCase().includes(s))
    );
  }

  if (reset) allPosts = filtered;
  else allPosts = [...allPosts, ...filtered];

  currentPage++;
  renderPosts();
  updateCounts();
  document.getElementById('loadMoreBtn').style.display = (posts?.length === PAGE_SIZE) ? 'inline-block' : 'none';
}

function updateCounts() {
  // Quick counts from already loaded data (approximate)
  document.getElementById('countAll').textContent = `(${allPosts.length})`;
  document.getElementById('countFlagged').textContent = `(${allPosts.filter(p => p.is_flagged).length})`;
  document.getElementById('countPinned').textContent = `(${allPosts.filter(p => p.is_pinned).length})`;
}

function renderPosts() {
  const container = document.getElementById('postsContainer');

  if (allPosts.length === 0) {
    container.innerHTML = `
      <div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--gray-400);">
        <i class="fas fa-inbox" style="font-size:2.5rem;"></i>
        <p style="margin-top:1rem;font-size:15px;">No posts found</p>
      </div></div>`;
    return;
  }

  container.innerHTML = allPosts.map(post => {
    const author = post.is_anonymous ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Deleted User');
    const initials = post.is_anonymous ? 'A' : (post.profiles ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : '?');
    const community = post.communities?.name || 'Unknown';
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    const images = Array.isArray(post.image_url) ? post.image_url : (post.image_url ? [post.image_url] : []);

    return `
      <div class="card" style="${post.is_flagged ? 'border-left:4px solid #ef4444;' : ''}">
        <div class="card-body">
          <div style="display:flex;align-items:flex-start;gap:0.75rem;">
            <div style="width:40px;height:40px;border-radius:50%;background:${post.is_anonymous ? '#6b7280' : 'var(--maroon)'};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${initials}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;">
                <span style="font-weight:600;font-size:14px;">${escapeHtml(author)}</span>
                <span style="font-size:12px;color:var(--gray-400);">in</span>
                <span style="font-size:12px;font-weight:600;color:var(--maroon);">${escapeHtml(community)}</span>
                ${post.is_flagged ? '<span style="padding:2px 8px;background:#fee2e2;color:#dc2626;border-radius:9999px;font-size:11px;font-weight:600;"><i class="fas fa-flag"></i> Flagged</span>' : ''}
                ${post.is_pinned ? '<span style="padding:2px 8px;background:#fef3c7;color:#d97706;border-radius:9999px;font-size:11px;font-weight:600;"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
                <span style="font-size:12px;color:var(--gray-400);margin-left:auto;">${timeAgo}</span>
              </div>
              <p style="margin-top:0.5rem;font-size:14px;color:var(--gray-700);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(post.content)}</p>
              ${images.length > 0 ? `<div style="margin-top:0.5rem;display:flex;gap:4px;">${images.slice(0,3).map(url => `<img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;" />`).join('')}${images.length > 3 ? `<div style="width:60px;height:60px;background:var(--gray-200);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--gray-600);">+${images.length - 3}</div>` : ''}</div>` : ''}
              <div style="display:flex;align-items:center;gap:1rem;margin-top:0.75rem;">
                <span style="font-size:12px;color:var(--gray-500);"><i class="fas fa-heart"></i> ${post.like_count || 0}</span>
                <span style="font-size:12px;color:var(--gray-500);"><i class="fas fa-comment"></i> ${post.comment_count || 0}</span>
                <div style="margin-left:auto;display:flex;gap:0.5rem;">
                  <button onclick="viewPost('${post.id}')" style="padding:0.375rem 0.75rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-eye"></i> View</button>
                  <button onclick="togglePin('${post.id}', ${post.is_pinned})" style="padding:0.375rem 0.75rem;background:${post.is_pinned ? '#fef3c7' : 'var(--gray-100)'};border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:${post.is_pinned ? '#d97706' : 'inherit'};"><i class="fas fa-thumbtack"></i> ${post.is_pinned ? 'Unpin' : 'Pin'}</button>
                  <button onclick="toggleFlag('${post.id}', ${post.is_flagged})" style="padding:0.375rem 0.75rem;background:${post.is_flagged ? '#fee2e2' : 'var(--gray-100)'};border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:${post.is_flagged ? '#dc2626' : 'inherit'};"><i class="fas fa-flag"></i> ${post.is_flagged ? 'Unflag' : 'Flag'}</button>
                  <button onclick="confirmDelete('${post.id}')" style="padding:0.375rem 0.75rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-trash"></i> Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function viewPost(postId) {
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  const author = post.is_anonymous ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Deleted User');
  const images = Array.isArray(post.image_url) ? post.image_url : (post.image_url ? [post.image_url] : []);
  const date = new Date(post.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });

  document.getElementById('postModalBody').innerHTML = `
    <div style="margin-bottom:1rem;">
      <div style="display:flex;gap:0.75rem;align-items:center;margin-bottom:1rem;">
        <div style="width:44px;height:44px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;">${post.is_anonymous ? 'A' : (post.profiles ? (post.profiles.first_name[0]+post.profiles.last_name[0]).toUpperCase() : '?')}</div>
        <div>
          <div style="font-weight:700;">${escapeHtml(author)}</div>
          <div style="font-size:12px;color:var(--gray-500);">${escapeHtml(post.communities?.name || '')} • ${date}</div>
        </div>
      </div>
      <p style="font-size:15px;line-height:1.6;color:var(--gray-800);">${escapeHtml(post.content)}</p>
      ${images.length > 0 ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-top:1rem;">${images.map(url => `<img src="${url}" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;" />`).join('')}</div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.75rem;padding:1rem;background:var(--gray-50);border-radius:var(--radius-sm);">
      <div style="text-align:center;"><div style="font-size:1.25rem;font-weight:800;">${post.like_count||0}</div><div style="font-size:12px;color:var(--gray-500);">Likes</div></div>
      <div style="text-align:center;"><div style="font-size:1.25rem;font-weight:800;">${post.comment_count||0}</div><div style="font-size:12px;color:var(--gray-500);">Comments</div></div>
      <div style="text-align:center;"><div style="font-size:1.25rem;font-weight:800;">${images.length}</div><div style="font-size:12px;color:var(--gray-500);">Images</div></div>
    </div>
    ${post.is_flagged && post.flag_reason ? `<div style="margin-top:1rem;padding:0.75rem;background:#fee2e2;border-radius:var(--radius-sm);"><strong style="color:#dc2626;font-size:13px;"><i class="fas fa-flag"></i> Flag Reason:</strong><p style="font-size:13px;color:#991b1b;margin-top:4px;">${escapeHtml(post.flag_reason)}</p></div>` : ''}
  `;
  document.getElementById('postModalFooter').innerHTML = `
    <button onclick="toggleFlag('${post.id}', ${post.is_flagged});closePostModal();" style="padding:0.625rem 1rem;background:${post.is_flagged ? '#fee2e2' : 'var(--gray-100)'};border:1px solid var(--gray-300);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:${post.is_flagged ? '#dc2626' : 'inherit'};"><i class="fas fa-flag"></i> ${post.is_flagged ? 'Unflag' : 'Flag'}</button>
    <button onclick="togglePin('${post.id}', ${post.is_pinned});closePostModal();" style="padding:0.625rem 1rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-thumbtack"></i> ${post.is_pinned ? 'Unpin' : 'Pin'}</button>
    <button onclick="confirmDelete('${post.id}');closePostModal();" style="padding:0.625rem 1rem;background:#dc2626;color:white;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-trash"></i> Delete</button>
  `;
  document.getElementById('postModal').style.display = 'flex';
}

async function togglePin(postId, currentlyPinned) {
  const { error } = await db.from('posts').update({ is_pinned: !currentlyPinned }).eq('id', postId);
  if (!error) { await logActivity(currentlyPinned ? 'unpin_post' : 'pin_post', postId, 'post'); await loadPosts(); }
}

async function toggleFlag(postId, currentlyFlagged) {
  if (!currentlyFlagged) {
    const reason = prompt('Reason for flagging this post (optional):');
    const { error } = await db.from('posts').update({ is_flagged: true, flag_reason: reason || 'Flagged by admin' }).eq('id', postId);
    if (!error) { await logActivity('flag_post', postId, 'post'); await loadPosts(); }
  } else {
    const { error } = await db.from('posts').update({ is_flagged: false, flag_reason: null }).eq('id', postId);
    if (!error) { await logActivity('unflag_post', postId, 'post'); await loadPosts(); }
  }
}

function confirmDelete(postId) {
  pendingDeleteId = postId;
  document.getElementById('deleteModal').style.display = 'flex';
}
function closeDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').style.display = 'none';
}
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.textContent = 'Deleting...';
  btn.disabled = true;
  const { error } = await db.from('posts').delete().eq('id', pendingDeleteId);
  if (!error) { await logActivity('delete_post', pendingDeleteId, 'post'); closeDeleteModal(); await loadPosts(); }
  else { btn.textContent = 'Delete'; btn.disabled = false; }
});

function closePostModal() { document.getElementById('postModal').style.display = 'none'; }

async function logActivity(actionType, targetId, targetType) {
  try {
    await db.from('admin_activity_logs').insert({ admin_id: adminUser.id, action_type: actionType, target_id: targetId, target_type: targetType });
  } catch(e) {}
}

function setupListeners() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadPosts();
    });
  });
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => loadPosts(), 400); });
  document.getElementById('communityFilter').addEventListener('change', () => loadPosts());
  document.getElementById('loadMoreBtn').addEventListener('click', () => loadPosts(false));
  document.getElementById('postModal').addEventListener('click', e => { if (e.target.id === 'postModal') closePostModal(); });
  document.getElementById('deleteModal').addEventListener('click', e => { if (e.target.id === 'deleteModal') closeDeleteModal(); });
}

function formatTimeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return date.toLocaleDateString('en-US', { month:'short', day:'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });
