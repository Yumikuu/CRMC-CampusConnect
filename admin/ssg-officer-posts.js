// ═══════════════════════════════════════════════════════════════
// SSG OFFICER — ANNOUNCEMENTS FEED
// ═══════════════════════════════════════════════════════════════

let adminUser     = null;
let ssgCommId     = null;
let currentFilter = 'all';
let editingPostId = null;
let deletingPostId = null;
let selectedImages = [];
let allPosts      = [];

// ── AUTH GUARD ──
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.admin_role !== 'SSG_OFFICER') {
    window.location.href = 'login.html'; return;
  }

  adminUser = profile;
  initAdminNotifications(profile.id);
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminName').textContent   = `${profile.first_name} ${profile.last_name}`;

  const { data: comm } = await db.from('communities').select('id').eq('slug', 'ssg-announcements').single();
  if (comm) ssgCommId = comm.id;

  await loadPosts();
  setupListeners();
})();

// ── LOAD POSTS ──
async function loadPosts() {
  if (!ssgCommId) {
    document.getElementById('postsContainer').innerHTML = emptyState('fa-bullhorn', 'SSG community not found.', 'Run add-ssg-community.sql in Supabase first.');
    return;
  }

  let query = db.from('posts')
    .select('*, profiles:author_id(first_name, last_name)')
    .eq('community_id', ssgCommId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (currentFilter === 'pinned')  query = query.eq('is_pinned', true);
  if (currentFilter === 'flagged') query = query.eq('is_flagged', true);

  const { data: posts, error } = await query;
  if (error) { showToast('Failed to load posts', 'error'); return; }

  allPosts = posts || [];
  renderPosts(allPosts);
  updateCounts();
}

function renderPosts(posts) {
  const search  = document.getElementById('searchInput').value.toLowerCase();
  const filtered = search
    ? posts.filter(p => (p.title || '').toLowerCase().includes(search) || p.content.toLowerCase().includes(search))
    : posts;

  const container = document.getElementById('postsContainer');
  if (!filtered.length) {
    container.innerHTML = emptyState('fa-bullhorn', 'No announcements found.', 'Create your first one using the button above.');
    return;
  }

  container.innerHTML = filtered.map(post => {
    const timeAgo   = formatTimeAgo(new Date(post.created_at));
    const author    = post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'SSG Officer';
    const initials  = post.profiles ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : 'SSG';
    const preview   = post.content.length > 160 ? post.content.substring(0, 160) + '…' : post.content;
    const hasImages = post.image_url && Array.isArray(post.image_url) && post.image_url.length > 0;

    return `
      <div class="card" data-post-id="${post.id}">
        <div class="card-body">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            <div class="activity-avatar" style="background:linear-gradient(135deg,#b7950b,#d4ac0d);flex-shrink:0;">${initials}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.25rem;">
                <span style="font-weight:700;font-size:.9rem;color:var(--gray-900);">${escapeHtml(author)}</span>
                <span style="font-size:.75rem;background:#fef3c7;color:#b7950b;padding:2px 8px;border-radius:999px;font-weight:600;">
                  <i class="fas fa-star" style="font-size:.65rem;"></i> SSG Officer
                </span>
                ${post.is_pinned ? `<span style="font-size:.75rem;background:rgba(107,15,26,.08);color:var(--maroon);padding:2px 8px;border-radius:999px;font-weight:600;"><i class="fas fa-thumbtack" style="font-size:.65rem;"></i> Pinned</span>` : ''}
                ${post.is_flagged ? `<span style="font-size:.75rem;background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:999px;font-weight:600;"><i class="fas fa-flag" style="font-size:.65rem;"></i> Flagged</span>` : ''}
                <span style="font-size:.75rem;color:var(--gray-400);margin-left:auto;">${timeAgo}</span>
              </div>
              ${post.title ? `<div style="font-size:1rem;font-weight:700;color:var(--gray-900);margin-bottom:.35rem;">${escapeHtml(post.title)}</div>` : ''}
              <p style="font-size:.875rem;color:var(--gray-700);line-height:1.6;margin-bottom:.75rem;">${escapeHtml(preview)}</p>
              ${hasImages ? `
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:.75rem;">
                  ${post.image_url.slice(0,4).map(url => `<img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--gray-200);cursor:pointer;" onclick="window.open('${url}','_blank')" />`).join('')}
                  ${post.image_url.length > 4 ? `<div style="width:72px;height:72px;background:var(--gray-100);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:var(--gray-500);">+${post.image_url.length - 4}</div>` : ''}
                </div>` : ''}
              <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
                <button onclick="openEditPost('${post.id}')" style="padding:.4rem .85rem;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;display:flex;align-items:center;gap:.4rem;">
                  <i class="fas fa-edit"></i> Edit
                </button>
                <button onclick="togglePin('${post.id}', ${post.is_pinned})" style="padding:.4rem .85rem;background:${post.is_pinned ? 'rgba(107,15,26,.08)' : 'var(--gray-100)'};border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:${post.is_pinned ? 'var(--maroon)' : 'var(--gray-700)'};display:flex;align-items:center;gap:.4rem;">
                  <i class="fas fa-thumbtack"></i> ${post.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button onclick="openDeletePost('${post.id}')" style="padding:.4rem .85rem;background:#fee2e2;border:1px solid #fecaca;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:#dc2626;display:flex;align-items:center;gap:.4rem;">
                  <i class="fas fa-trash"></i> Delete
                </button>
                <span style="margin-left:auto;display:flex;align-items:center;gap:1rem;color:var(--gray-500);font-size:13px;">
                  <span><i class="fas fa-heart" style="color:#e11d48;margin-right:3px;"></i>${post.like_count || 0}</span>
                  <span><i class="fas fa-comment" style="color:#3b82f6;margin-right:3px;"></i>${post.comment_count || 0}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function updateCounts() {
  if (!ssgCommId) return;
  const [all, pinned, flagged] = await Promise.all([
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommId),
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommId).eq('is_pinned', true),
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommId).eq('is_flagged', true),
  ]);
  document.getElementById('countAll').textContent    = `(${all.count || 0})`;
  document.getElementById('countPinned').textContent  = `(${pinned.count || 0})`;
  document.getElementById('countFlagged').textContent = `(${flagged.count || 0})`;
}

// ── CREATE / EDIT POST ──
function openCreatePost() {
  editingPostId = null;
  document.getElementById('postModalTitle').textContent = 'Create Announcement';
  document.getElementById('submitPostBtn').innerHTML    = '<i class="fas fa-paper-plane"></i> Publish';
  document.getElementById('postTitle').value   = '';
  document.getElementById('postContent').value = '';
  document.getElementById('pinPost').checked   = false;
  document.getElementById('imagePreviewRow').innerHTML = '';
  selectedImages = [];
  document.getElementById('postModal').style.display = 'flex';
}

async function openEditPost(postId) {
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;
  editingPostId = postId;
  document.getElementById('postModalTitle').textContent = 'Edit Announcement';
  document.getElementById('submitPostBtn').innerHTML    = '<i class="fas fa-save"></i> Save Changes';
  document.getElementById('postTitle').value   = post.title || '';
  document.getElementById('postContent').value = post.content;
  document.getElementById('pinPost').checked   = post.is_pinned;
  document.getElementById('imagePreviewRow').innerHTML = '';
  selectedImages = [];
  document.getElementById('postModal').style.display = 'flex';
}

async function submitPost() {
  const content = document.getElementById('postContent').value.trim();
  const title   = document.getElementById('postTitle').value.trim();
  if (!content) { showToast('Content is required.', 'error'); return; }
  if (!ssgCommId) { showToast('SSG community not found.', 'error'); return; }

  const btn = document.getElementById('submitPostBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    let imageUrls = [];
    for (const file of selectedImages) {
      const fileName = `ssg-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
      const { error: upErr } = await db.storage.from('post-images').upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('post-images').getPublicUrl(fileName);
        imageUrls.push(publicUrl);
      }
    }

    if (editingPostId) {
      const updates = { title: title || null, content, is_pinned: document.getElementById('pinPost').checked, updated_at: new Date().toISOString() };
      if (imageUrls.length > 0) updates.image_url = imageUrls;
      const { error } = await db.from('posts').update(updates).eq('id', editingPostId);
      if (error) throw error;
      showToast('Announcement updated!', 'success');
    } else {
      const { error } = await db.from('posts').insert({
        community_id: ssgCommId,
        author_id: adminUser.id,
        title: title || null,
        content,
        is_anonymous: false,
        is_pinned: document.getElementById('pinPost').checked,
        image_url: imageUrls.length > 0 ? imageUrls : null,
        moderation_status: 'approved',
      });
      if (error) throw error;
      showToast('Announcement published!', 'success');
    }

    document.getElementById('postModal').style.display = 'none';
    await loadPosts();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = editingPostId ? '<i class="fas fa-save"></i> Save Changes' : '<i class="fas fa-paper-plane"></i> Publish';
  }
}

// ── PIN TOGGLE ──
async function togglePin(postId, isPinned) {
  const { error } = await db.from('posts').update({ is_pinned: !isPinned }).eq('id', postId);
  if (error) { showToast('Failed to update pin', 'error'); return; }
  showToast(isPinned ? 'Post unpinned' : 'Post pinned', 'success');
  await loadPosts();
}

// ── DELETE ──
function openDeletePost(postId) {
  deletingPostId = postId;
  document.getElementById('deleteModal').style.display = 'flex';
}

async function confirmDelete() {
  if (!deletingPostId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  try {
    const { error } = await db.from('posts').delete().eq('id', deletingPostId).eq('author_id', adminUser.id);
    if (error) throw error;
    showToast('Announcement deleted', 'success');
    document.getElementById('deleteModal').style.display = 'none';
    deletingPostId = null;
    await loadPosts();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
}

// ── IMAGE HANDLING ──
function handleImageSelect(e) {
  Array.from(e.target.files).slice(0, 5 - selectedImages.length).forEach(file => {
    selectedImages.push(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const row = document.getElementById('imagePreviewRow');
      const div = document.createElement('div');
      div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0;';
      const idx = selectedImages.length - 1;
      div.innerHTML = `
        <img src="${ev.target.result}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--gray-200);" />
        <button type="button" onclick="removeImg(${idx},this.parentNode)" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#dc2626;color:white;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-times"></i>
        </button>`;
      row.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function removeImg(idx, el) {
  selectedImages.splice(idx, 1);
  el.remove();
}

// ── SETUP ──
function setupListeners() {
  document.getElementById('createPostBtn').addEventListener('click', openCreatePost);
  document.getElementById('submitPostBtn').addEventListener('click', submitPost);
  document.getElementById('cancelPostBtn').addEventListener('click', () => document.getElementById('postModal').style.display = 'none');
  document.getElementById('closePostModal').addEventListener('click', () => document.getElementById('postModal').style.display = 'none');
  document.getElementById('postModal').addEventListener('click', e => { if (e.target.id === 'postModal') document.getElementById('postModal').style.display = 'none'; });
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => document.getElementById('deleteModal').style.display = 'none');
  document.getElementById('deleteModal').addEventListener('click', e => { if (e.target.id === 'deleteModal') document.getElementById('deleteModal').style.display = 'none'; });
  document.getElementById('postImages').addEventListener('change', handleImageSelect);

  document.getElementById('searchInput').addEventListener('input', () => renderPosts(allPosts));

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      await loadPosts();
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    window.location.href = 'login.html';
  });
}

// ── HELPERS ──
function formatTimeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  if (s < 604800) return `${Math.floor(s/86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(t) {
  if (!t) return '';
  const d = document.createElement('div'); d.textContent = t; return d.innerHTML;
}

function emptyState(icon, title, sub = '') {
  return `<div class="card"><div class="empty-state"><i class="fas ${icon}"></i><p>${title}</p>${sub ? `<small>${sub}</small>` : ''}</div></div>`;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:2rem;right:2rem;background:${type === 'success' ? '#16a34a' : '#dc2626'};color:white;padding:1rem 1.5rem;border-radius:.5rem;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10000;font-weight:500;font-family:Poppins,sans-serif;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}
