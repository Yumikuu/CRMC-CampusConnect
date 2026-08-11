// ---------------------------------------------------------------
// DEPT POSTS � View, create, and moderate department posts
// ---------------------------------------------------------------

let adminUser = null;
let deptCommunityId = null;
let allPosts = [];
let currentFilter = 'all';
let pendingDeleteId = null;
let selectedImages = [];

const DEPT_FULL = {
  'CTE':'College of Teacher Education (CTE)', 'CSS':'College of Computer Studies (CSS)',
  'CBE':'College of Business Education (CBE)', 'PSYCH':'Psychology (PSYCH)',
  'CCJE':'College of Criminal Justice Education (CCJE)'
};

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }
  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || !['CTE','CSS','CCS','CBE','PSYCH','CCJE'].includes(profile.admin_role)) {
    window.location.href = profile?.admin_role === 'SSG' ? 'main-dashboard.html' : '../campusfeed.html'; return;
  }
  adminUser = profile;
  initAdminNotifications(profile.id);

  document.getElementById('adminAvatar').textContent = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminName').textContent = `${profile.first_name} ${profile.last_name}`;
  document.getElementById('adminRoleText').textContent = `${profile.admin_role} Admin`;
  document.getElementById('pageTitle').textContent = `${profile.admin_role} Posts`;
  document.getElementById('pageSubtitle').textContent = `Manage posts in the ${profile.admin_role} community`;
  document.querySelectorAll('.deptLabel').forEach(el => el.textContent = profile.admin_role);

  const { data: community } = await db.from('communities').select('id').eq('type','department').ilike('department', `%${profile.admin_role}%`).single();
  if (community) {
    deptCommunityId = community.id;
  } else {
    // Fallback: try matching by slug (slug = lowercase admin_role)
    const { data: commBySlug } = await db.from('communities').select('id').eq('slug', profile.admin_role.toLowerCase()).single();
    if (commBySlug) deptCommunityId = commBySlug.id;
  }

  await loadPosts();
  setupListeners();
})();

async function loadPosts() {
  if (!deptCommunityId) {
    document.getElementById('postsContainer').innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--gray-400);">Department community not found.</div></div>`;
    return;
  }

  let query = db.from('posts')
    .select('*, profiles:author_id(first_name, last_name)')
    .eq('community_id', deptCommunityId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (currentFilter === 'flagged') query = query.eq('is_flagged', true);
  if (currentFilter === 'pinned')  query = query.eq('is_pinned', true);

  const { data: posts } = await query;
  let filtered = posts || [];

  const search = document.getElementById('searchInput').value.toLowerCase();
  if (search) {
    filtered = filtered.filter(p =>
      p.content?.toLowerCase().includes(search) ||
      (p.profiles && `${p.profiles.first_name} ${p.profiles.last_name}`.toLowerCase().includes(search))
    );
  }

  allPosts = filtered;
  document.getElementById('countAll').textContent    = `(${(posts||[]).length})`;
  document.getElementById('countFlagged').textContent= `(${(posts||[]).filter(p=>p.is_flagged).length})`;
  document.getElementById('countPinned').textContent = `(${(posts||[]).filter(p=>p.is_pinned).length})`;
  renderPosts();
}

function renderPosts() {
  const container = document.getElementById('postsContainer');
  if (!allPosts.length) {
    container.innerHTML = `<div class="card"><div class="card-body" style="text-align:center;padding:3rem;color:var(--gray-400);"><i class="fas fa-inbox" style="font-size:2.5rem;"></i><p style="margin-top:1rem;">No posts found</p></div></div>`;
    return;
  }
  container.innerHTML = allPosts.map(post => {
    const author = post.is_anonymous ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Unknown');
    const initials = post.is_anonymous ? 'A' : (post.profiles ? (post.profiles.first_name[0]+post.profiles.last_name[0]).toUpperCase() : '?');
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    const images = Array.isArray(post.image_url) ? post.image_url : (post.image_url ? [post.image_url] : []);
    const isAnnouncement = post.content?.startsWith('📢 [ANNOUNCEMENT]');

    return `
      <div class="card" style="${post.is_flagged ? 'border-left:4px solid #ef4444;' : post.is_pinned ? 'border-left:4px solid #f59e0b;' : ''}">
        <div class="card-body">
          <div style="display:flex;align-items:flex-start;gap:0.75rem;">
            <div style="width:40px;height:40px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${initials}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:4px;">
                <span style="font-weight:600;font-size:14px;">${escapeHtml(author)}</span>
                ${isAnnouncement ? '<span style="padding:2px 8px;background:#fef3c7;color:#d97706;border-radius:9999px;font-size:11px;font-weight:700;"><i class="fas fa-bullhorn"></i> Announcement</span>' : ''}
                ${post.is_pinned ? '<span style="padding:2px 8px;background:#fef3c7;color:#d97706;border-radius:9999px;font-size:11px;font-weight:600;"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
                ${post.is_flagged ? '<span style="padding:2px 8px;background:#fee2e2;color:#dc2626;border-radius:9999px;font-size:11px;font-weight:600;"><i class="fas fa-flag"></i> Flagged</span>' : ''}
                <span style="font-size:12px;color:var(--gray-400);margin-left:auto;">${timeAgo}</span>
              </div>
              <p style="font-size:14px;color:var(--gray-700);line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml((post.content || '').replace(/^📢?\s*\[ANNOUNCEMENT\]\s*/i, ''))}</p>
              ${images.length ? `<div style="display:flex;gap:4px;margin-top:0.5rem;">${images.slice(0,3).map(u=>`<img src="${u}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;">`).join('')}${images.length>3?`<div style="width:60px;height:60px;background:var(--gray-200);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;color:var(--gray-600);">+${images.length-3}</div>`:''}</div>` : ''}
              <div style="display:flex;gap:0.5rem;margin-top:0.75rem;align-items:center;">
                <span style="font-size:12px;color:var(--gray-500);"><i class="fas fa-heart"></i> ${post.like_count||0}</span>
                <span style="font-size:12px;color:var(--gray-500);"><i class="fas fa-comment"></i> ${post.comment_count||0}</span>
                <div style="margin-left:auto;display:flex;gap:0.5rem;">
                  <button onclick="togglePin('${post.id}',${post.is_pinned})" style="padding:0.375rem 0.75rem;background:${post.is_pinned?'#fef3c7':'var(--gray-100)'};border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:${post.is_pinned?'#d97706':'inherit'};">
                    <i class="fas fa-thumbtack"></i> ${post.is_pinned?'Unpin':'Pin'}
                  </button>
                  <button onclick="toggleFlag('${post.id}',${post.is_flagged})" style="padding:0.375rem 0.75rem;background:${post.is_flagged?'#fee2e2':'var(--gray-100)'};border:1px solid var(--gray-300);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:${post.is_flagged?'#dc2626':'inherit'};">
                    <i class="fas fa-flag"></i> ${post.is_flagged?'Unflag':'Flag'}
                  </button>
                  <button onclick="confirmDelete('${post.id}')" style="padding:0.375rem 0.75rem;background:#fee2e2;color:#dc2626;border:none;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

async function togglePin(id, current) {
  await db.from('posts').update({ is_pinned: !current }).eq('id', id);
  showToast(current ? 'Post unpinned' : 'Post pinned!', 'success');
  await loadPosts();
}

async function toggleFlag(id, current) {
  if (!current) {
    const reason = prompt('Reason for flagging (optional):') || 'Flagged by admin';
    await db.from('posts').update({ is_flagged: true, flag_reason: reason }).eq('id', id);
  } else {
    await db.from('posts').update({ is_flagged: false, flag_reason: null }).eq('id', id);
  }
  showToast(current ? 'Flag removed' : 'Post flagged', current ? 'info' : 'error');
  await loadPosts();
}

function confirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').style.display = 'flex';
}

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.textContent = 'Deleting...'; btn.disabled = true;
  await db.from('posts').delete().eq('id', pendingDeleteId);
  btn.textContent = 'Delete'; btn.disabled = false;
  document.getElementById('deleteModal').style.display = 'none';
  showToast('Post deleted', 'success');
  await loadPosts();
});

// -- CREATE POST --
function setPostType(type) {
  const isAnn = type === 'announcement';
  document.getElementById('postType').value = type;
  document.getElementById('typePost').style.cssText = `flex:1;padding:0.625rem;background:${isAnn?'var(--gray-100)':'var(--maroon)'};color:${isAnn?'var(--gray-700)':'white'};border:${isAnn?'1px solid var(--gray-300)':'none'};border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;`;
  document.getElementById('typeAnnouncement').style.cssText = `flex:1;padding:0.625rem;background:${isAnn?'#f59e0b':'var(--gray-100)'};color:${isAnn?'white':'var(--gray-700)'};border:${isAnn?'none':'1px solid var(--gray-300)'};border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;`;
  document.getElementById('announcementBadge').style.display = isAnn ? 'block' : 'none';
}

async function submitPost() {
  const content = document.getElementById('postContent').value.trim();
  if (!content) { showToast('Please write something.', 'error'); return; }
  if (!deptCommunityId) { showToast('Community not found.', 'error'); return; }

  const btn = document.getElementById('submitPostBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...'; btn.disabled = true;

  try {
    const isAnn = document.getElementById('postType').value === 'announcement';
    const isPinned = document.getElementById('pinPost').checked;

    let imageUrls = [];
    for (const file of selectedImages) {
      const name = `dept-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
      const { error: upErr } = await db.storage.from('post-images').upload(name, file);
      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('post-images').getPublicUrl(name);
        imageUrls.push(publicUrl);
      }
    }

    const { error } = await db.from('posts').insert({
      community_id: deptCommunityId,
      author_id: adminUser.id,
      content: isAnn ? `📢 [ANNOUNCEMENT]\n\n${content}` : content,
      is_anonymous: false,
      is_pinned: isPinned,
      image_url: imageUrls.length ? imageUrls : null,
    });
    if (error) throw error;

    showToast(isAnn ? 'Announcement published!' : 'Post published!', 'success');
    document.getElementById('createPostModal').style.display = 'none';
    document.getElementById('postContent').value = '';
    document.getElementById('pinPost').checked = false;
    document.getElementById('imagePreviewRow').innerHTML = '';
    selectedImages = [];
    setPostType('post');
    await loadPosts();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish'; btn.disabled = false;
  }
}

document.getElementById('postImages').addEventListener('change', e => {
  Array.from(e.target.files).slice(0, 5 - selectedImages.length).forEach(file => {
    selectedImages.push(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const div = document.createElement('div');
      div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0;';
      div.innerHTML = `<img src="${ev.target.result}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--gray-200);">
        <button onclick="selectedImages.splice(${selectedImages.length-1},1);this.parentNode.remove();" style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#dc2626;color:white;border:none;cursor:pointer;font-size:10px;"><i class="fas fa-times"></i></button>`;
      document.getElementById('imagePreviewRow').appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

function setupListeners() {
  document.getElementById('createPostBtn').addEventListener('click', () => {
    document.getElementById('createPostModal').style.display = 'flex';
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadPosts();
    });
  });
  let t;
  document.getElementById('searchInput').addEventListener('input', () => { clearTimeout(t); t = setTimeout(loadPosts, 400); });
  document.getElementById('createPostModal').addEventListener('click', e => { if (e.target.id === 'createPostModal') e.target.style.display='none'; });
  document.getElementById('deleteModal').addEventListener('click', e => { if (e.target.id === 'deleteModal') e.target.style.display='none'; });
}

function formatTimeAgo(date) {
  const s = Math.floor((new Date()-date)/1000);
  if(s<60) return 'just now'; if(s<3600) return `${Math.floor(s/60)}m ago`;
  if(s<86400) return `${Math.floor(s/3600)}h ago`; if(s<604800) return `${Math.floor(s/86400)}d ago`;
  return date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
}
function escapeHtml(t) { if(!t) return ''; const d=document.createElement('div');d.textContent=t;return d.innerHTML; }

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });


