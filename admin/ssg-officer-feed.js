// ═══════════════════════════════════════════════════════════════
// SSG OFFICER — COMMUNITY FEED
// Live feed of the 'ssg' community with full admin powers
// Matches dept-feed.js pattern exactly
// ═══════════════════════════════════════════════════════════════

let adminUser       = null;
let ssgCommId       = null;
let allPosts        = [];
let currentFilter   = 'all';
let pendingDeleteId = null;
let selectedImages  = [];
let openCommentPostId = null;

// ── AUTH + INIT ──
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.admin_role !== 'SSG_OFFICER') {
    window.location.href = 'login.html'; return;
  }

  adminUser = profile;
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName  = `${profile.first_name} ${profile.last_name}`;

  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminName').textContent   = fullName;
  document.getElementById('createAvatar').textContent = initials;
  document.getElementById('sideAvatar').textContent  = initials;
  document.getElementById('sideName').textContent    = fullName;

  // Get the open SSG community
  const { data: comm } = await db.from('communities').select('id').eq('slug', 'ssg').single();
  if (comm) ssgCommId = comm.id;

  await Promise.all([loadFeed(), loadCommStats(), loadRecentPosters()]);
  setupListeners();
})();

// ── COMMUNITY STATS ──
async function loadCommStats() {
  if (!ssgCommId) return;

  const { count: postCount } = await db
    .from('posts').select('*', { count: 'exact', head: true })
    .eq('community_id', ssgCommId);

  document.getElementById('statPosts').textContent = postCount || 0;

  // comment count
  if (postCount > 0) {
    const { data: postIds } = await db.from('posts').select('id').eq('community_id', ssgCommId);
    if (postIds?.length) {
      const { count: cc } = await db.from('comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds.map(p => p.id));
      document.getElementById('statComments').textContent = cc || 0;
    }
  } else {
    document.getElementById('statComments').textContent = 0;
  }
}

// ── LOAD FEED ──
async function loadFeed() {
  if (!ssgCommId) {
    document.getElementById('feedContainer').innerHTML = `
      <div class="empty-feed">
        <i class="fas fa-exclamation-circle"></i>
        <p>SSG community not found. Run add-ssg-community.sql in Supabase.</p>
      </div>`;
    return;
  }

  let query = db.from('posts')
    .select('*, profiles:author_id(id, first_name, last_name, admin_role, avatar_url)')
    .eq('community_id', ssgCommId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (currentFilter === 'pinned')        query = query.eq('is_pinned', true);
  if (currentFilter === 'flagged')       query = query.eq('is_flagged', true);
  if (currentFilter === 'unanswered')    query = query.eq('comment_count', 0);
  if (currentFilter === 'announcements') query = query.ilike('content', '📢%');

  const { data: posts, error } = await query;
  if (error) { console.error(error); return; }

  allPosts = posts || [];
  document.getElementById('postCountLabel').textContent =
    `${allPosts.length} post${allPosts.length !== 1 ? 's' : ''}`;

  if (!allPosts.length) {
    document.getElementById('feedContainer').innerHTML = `
      <div class="empty-feed">
        <i class="fas fa-comments"></i>
        <p>${currentFilter === 'all' ? 'No posts yet. Be the first to post!' : 'No posts match this filter.'}</p>
      </div>`;
    return;
  }

  // Check which posts the admin has liked
  const likedSet = new Set();
  const { data: likes } = await db.from('post_likes')
    .select('post_id').eq('user_id', adminUser.id)
    .in('post_id', allPosts.map(p => p.id));
  (likes || []).forEach(l => likedSet.add(l.post_id));

  document.getElementById('feedContainer').innerHTML =
    allPosts.map(post => renderPost(post, likedSet)).join('');
}

// ── RENDER POST ──
function renderPost(post, likedSet) {
  const isAnon   = post.is_anonymous;
  const isAnn    = post.content?.startsWith('📢 [ANNOUNCEMENT]');
  const author   = isAnon ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Unknown');
  const initials = isAnon ? 'A' : (post.profiles ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : '?');
  const isOfficer = post.profiles?.admin_role === 'SSG_OFFICER' || post.profiles?.admin_role === 'SSG';
  const timeAgo  = formatTimeAgo(new Date(post.created_at));
  const liked    = likedSet ? likedSet.has(post.id) : false;
  const images   = Array.isArray(post.image_url) ? post.image_url : (post.image_url ? [post.image_url] : []);

  const cardClass = [
    'post-card',
    post.is_pinned  && 'is-pinned',
    post.is_flagged && 'is-flagged',
    isAnn           && 'is-announcement',
  ].filter(Boolean).join(' ');

  let imageHtml = '';
  if (images.length) {
    const shown = images.slice(0, 5);
    const extra = images.length > 5 ? images.length - 4 : 0;
    imageHtml = `<div class="post-images">
      ${shown.map((url, i) => `
        <div class="img-item" onclick="window.open('${url}','_blank')">
          <img src="${url}" alt="Post image" loading="lazy" />
          ${extra && i === 3 ? `<div class="img-more-overlay">+${extra}</div>` : ''}
        </div>`).join('')}
    </div>`;
  }

  // Build avatar HTML
  let avatarHtml;
  if (post.profiles?.avatar_url && !isAnon) {
    avatarHtml = `<div class="feed-avatar" style="overflow:hidden;${isOfficer ? 'background:linear-gradient(135deg,#b7950b,#d4ac0d);' : ''}">
      <img src="${post.profiles.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${escapeHtml(author)}" />
    </div>`;
  } else {
    avatarHtml = `<div class="feed-avatar" style="background:${isAnon ? 'linear-gradient(135deg,#6b7280,#374151)' : isOfficer ? 'linear-gradient(135deg,#b7950b,#d4ac0d)' : 'linear-gradient(135deg,var(--maroon),var(--maroon-light))'}">
      ${isAnon ? '<i class="fas fa-user-secret" style="font-size:1rem;"></i>' : escapeHtml(initials)}
    </div>`;
  }

  return `
    <div class="${cardClass}" id="post-${post.id}">
      <div class="post-top">
        ${avatarHtml}
        <div class="post-author-info">
          <div class="post-author-name">
            ${escapeHtml(author)}
            ${isOfficer ? `<span class="badge badge-admin"><i class="fas fa-star"></i> SSG Officer</span>` : ''}
            ${isAnon    ? `<span class="badge badge-anon"><i class="fas fa-user-secret"></i> Anonymous</span>` : ''}
          </div>
          <div class="post-meta-row">
            ${post.is_pinned  ? `<span class="badge badge-pin"><i class="fas fa-thumbtack"></i> Pinned</span>` : ''}
            ${post.is_flagged ? `<span class="badge badge-flag"><i class="fas fa-flag"></i> Flagged</span>` : ''}
            ${isAnn           ? `<span class="badge badge-ann"><i class="fas fa-bullhorn"></i> Announcement</span>` : ''}
            <span class="post-time">${timeAgo}</span>
          </div>
        </div>
      </div>

      <div class="post-content">${escapeHtml((post.content || '').replace(/^📢\s*\[ANNOUNCEMENT\]\s*/i, ''))}</div>
      ${imageHtml}

      <div class="post-actions">
        <button class="action-btn ${liked ? 'liked' : ''}" onclick="toggleLike('${post.id}', ${liked})">
          <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
          <span>${post.like_count || 0}</span>
        </button>
        <button class="action-btn ${openCommentPostId === post.id ? 'active' : ''}" onclick="toggleComments('${post.id}')">
          <i class="far fa-comment"></i>
          <span>${post.comment_count || 0}</span>
        </button>

        <div class="admin-actions">
          <button class="admin-btn" onclick="togglePin('${post.id}', ${post.is_pinned})">
            <i class="fas fa-thumbtack"></i> ${post.is_pinned ? 'Unpin' : 'Pin'}
          </button>
          <button class="admin-btn ${post.is_flagged ? 'danger' : ''}" onclick="toggleFlag('${post.id}', ${post.is_flagged})">
            <i class="fas fa-flag"></i> ${post.is_flagged ? 'Unflag' : 'Flag'}
          </button>
          <button class="admin-btn danger" onclick="confirmDelete('${post.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <!-- Comment section (hidden by default) -->
      <div id="comments-${post.id}" class="comment-section" style="display:none;">
        <div id="comment-list-${post.id}" class="comment-list">
          <div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:13px;">
            <i class="fas fa-spinner fa-spin"></i> Loading comments...
          </div>
        </div>
        <div class="comment-input-row">
          <div class="feed-avatar comment-avatar" style="width:28px;height:28px;font-size:11px;">
            ${(adminUser?.first_name?.[0] || '') + (adminUser?.last_name?.[0] || '')}
          </div>
          <input class="comment-input" id="comment-input-${post.id}"
            placeholder="Reply as SSG Officer..." maxlength="500"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendComment('${post.id}');}" />
          <button class="comment-send" onclick="sendComment('${post.id}')">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>`;
}

// ── TOGGLE COMMENTS ──
async function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  const isOpen  = section.style.display !== 'none';
  if (isOpen) {
    section.style.display = 'none';
    openCommentPostId = null;
  } else {
    section.style.display = 'block';
    openCommentPostId = postId;
    await loadComments(postId);
  }
}

async function loadComments(postId) {
  const listEl = document.getElementById(`comment-list-${postId}`);
  const { data: comments, error } = await db
    .from('comments')
    .select('*, profiles:author_id(first_name, last_name, admin_role)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !comments?.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:13px;">No comments yet. Be the first!</div>`;
    return;
  }

  listEl.innerHTML = comments.map(c => {
    const isAnon    = c.is_anonymous;
    const author    = isAnon ? 'Anonymous' : (c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Unknown');
    const initials  = isAnon ? 'A' : (c.profiles ? (c.profiles.first_name[0] + c.profiles.last_name[0]).toUpperCase() : '?');
    const isOfficer = c.profiles?.admin_role === 'SSG_OFFICER' || c.profiles?.admin_role === 'SSG';
    const time      = formatTimeAgo(new Date(c.created_at));
    return `
      <div class="comment-item">
        <div class="comment-avatar" style="${isOfficer ? 'background:linear-gradient(135deg,#b7950b,#d4ac0d);' : isAnon ? 'background:var(--gray-400);' : ''}">${escapeHtml(initials)}</div>
        <div class="comment-bubble">
          <span class="comment-author">${escapeHtml(author)}</span>
          ${isOfficer ? `<span style="font-size:10px;background:#fef3c7;color:#b7950b;padding:1px 6px;border-radius:999px;font-weight:700;margin-left:4px;"><i class="fas fa-star" style="font-size:.55rem;"></i> SSG</span>` : ''}
          <span class="comment-time">${time}</span>
          <div class="comment-text">${escapeHtml(c.content)}</div>
        </div>
      </div>`;
  }).join('');
}

async function sendComment(postId) {
  const input   = document.getElementById(`comment-input-${postId}`);
  const content = input.value.trim();
  if (!content) return;
  input.value = '';
  input.disabled = true;

  const { error } = await db.from('comments').insert({
    post_id: postId, author_id: adminUser.id,
    content, is_anonymous: false,
  });
  input.disabled = false;
  if (error) { showToast('Failed to send comment', 'error'); return; }

  await loadComments(postId);
  const countEl = document.querySelector(`#post-${postId} .action-btn:nth-child(2) span`);
  if (countEl) countEl.textContent = parseInt(countEl.textContent || 0) + 1;
}

// ── LIKE ──
async function toggleLike(postId, liked) {
  if (liked) {
    await db.from('post_likes').delete().eq('post_id', postId).eq('user_id', adminUser.id);
  } else {
    await db.from('post_likes').insert({ post_id: postId, user_id: adminUser.id });
  }
  const btn = document.querySelector(`#post-${postId} .action-btn:first-child`);
  if (btn) {
    const countEl = btn.querySelector('span');
    const icon    = btn.querySelector('i');
    const newLiked = !liked;
    btn.className = `action-btn ${newLiked ? 'liked' : ''}`;
    btn.setAttribute('onclick', `toggleLike('${postId}', ${newLiked})`);
    icon.className = newLiked ? 'fas fa-heart' : 'far fa-heart';
    countEl.textContent = parseInt(countEl.textContent || 0) + (newLiked ? 1 : -1);
  }
}

// ── PIN / FLAG / DELETE ──
async function togglePin(postId, current) {
  const { error } = await db.from('posts').update({ is_pinned: !current }).eq('id', postId);
  if (error) { showToast('Failed', 'error'); return; }
  showToast(current ? 'Post unpinned' : 'Post pinned!', 'success');
  await loadFeed();
}

async function toggleFlag(postId, current) {
  if (!current) {
    const reason = prompt('Flag reason (optional):') || 'Flagged by SSG Officer';
    await db.from('posts').update({ is_flagged: true, flag_reason: reason }).eq('id', postId);
    showToast('Post flagged', 'info');
  } else {
    await db.from('posts').update({ is_flagged: false, flag_reason: null }).eq('id', postId);
    showToast('Flag removed', 'success');
  }
  await loadFeed();
}

function confirmDelete(postId) {
  pendingDeleteId = postId;
  document.getElementById('deletePostModal').style.display = 'flex';
}

document.getElementById('confirmDeletePostBtn').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('confirmDeletePostBtn');
  btn.textContent = 'Deleting...'; btn.disabled = true;
  await db.from('posts').delete().eq('id', pendingDeleteId);
  btn.textContent = 'Delete'; btn.disabled = false;
  document.getElementById('deletePostModal').style.display = 'none';
  pendingDeleteId = null;
  showToast('Post deleted', 'success');
  await Promise.all([loadFeed(), loadCommStats()]);
});

// ── CREATE / PUBLISH ──
function openModal(type = 'post') {
  setType(type);
  document.getElementById('modalContent').value  = '';
  document.getElementById('pinNewPost').checked  = false;
  document.getElementById('imgPreview').innerHTML = '';
  selectedImages = [];
  document.getElementById('createModal').style.display = 'flex';
  setTimeout(() => document.getElementById('modalContent').focus(), 100);
}

function setType(type) {
  const isAnn = type === 'announcement';
  document.getElementById('modalPostType').value       = type;
  document.getElementById('modalTitle').textContent    = isAnn ? 'New Announcement' : 'New Post';
  document.getElementById('typeBtnPost').style.cssText = `flex:1;padding:0.625rem;background:${isAnn ? 'var(--gray-100)' : '#b7950b'};color:${isAnn ? 'var(--gray-700)' : 'white'};border:${isAnn ? '1px solid var(--gray-300)' : 'none'};border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;`;
  document.getElementById('typeBtnAnn').style.cssText  = `flex:1;padding:0.625rem;background:${isAnn ? '#b7950b' : 'var(--gray-100)'};color:${isAnn ? 'white' : 'var(--gray-700)'};border:${isAnn ? 'none' : '1px solid var(--gray-300)'};border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;`;
  document.getElementById('annBadge').style.display    = isAnn ? 'block' : 'none';
}

async function publishPost() {
  const content = document.getElementById('modalContent').value.trim();
  if (!content) { showToast('Please write something first.', 'error'); return; }
  if (!ssgCommId) { showToast('SSG community not found.', 'error'); return; }

  const btn = document.getElementById('publishBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
  btn.disabled  = true;

  try {
    const isAnn    = document.getElementById('modalPostType').value === 'announcement';
    const isPinned = document.getElementById('pinNewPost').checked;

    let imageUrls = [];
    for (const file of selectedImages) {
      const name = `ssg-feed-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
      const { error: upErr } = await db.storage.from('post-images').upload(name, file, { cacheControl: '3600' });
      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('post-images').getPublicUrl(name);
        imageUrls.push(publicUrl);
      }
    }

    const { error } = await db.from('posts').insert({
      community_id:      ssgCommId,
      author_id:         adminUser.id,
      content:           isAnn ? `📢 [ANNOUNCEMENT]\n\n${content}` : content,
      is_anonymous:      false,
      is_pinned:         isPinned,
      image_url:         imageUrls.length ? imageUrls : null,
      moderation_status: 'approved',
    });
    if (error) throw error;

    showToast(isAnn ? '📢 Announcement published!' : 'Post published!', 'success');
    document.getElementById('createModal').style.display = 'none';
    document.getElementById('modalContent').value = '';
    selectedImages = [];
    document.getElementById('imgPreview').innerHTML = '';
    await Promise.all([loadFeed(), loadCommStats()]);

  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish';
    btn.disabled  = false;
  }
}

// ── IMAGE HANDLING ──
document.getElementById('imgInput').addEventListener('change', e => {
  Array.from(e.target.files).slice(0, 5 - selectedImages.length).forEach(file => {
    selectedImages.push(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const div = document.createElement('div');
      div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0;';
      const idx = selectedImages.length - 1;
      div.innerHTML = `
        <img src="${ev.target.result}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--gray-200);" />
        <button onclick="selectedImages.splice(${idx},1);this.parentNode.remove();"
          style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#dc2626;color:white;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-times"></i>
        </button>`;
      document.getElementById('imgPreview').appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

// ── RECENT POSTERS SIDEBAR ──
async function loadRecentPosters() {
  if (!ssgCommId) return;
  const { data: posts } = await db
    .from('posts')
    .select('profiles:author_id(first_name, last_name, student_id), created_at')
    .eq('community_id', ssgCommId)
    .eq('is_anonymous', false)
    .order('created_at', { ascending: false })
    .limit(5);

  const el = document.getElementById('recentPostersList');
  if (!posts?.length) { el.innerHTML = `<div style="color:var(--gray-400);font-size:13px;">No posts yet</div>`; return; }

  // Deduplicate by name
  const seen = new Set();
  const unique = posts.filter(p => {
    if (!p.profiles) return false;
    const key = `${p.profiles.first_name} ${p.profiles.last_name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  el.innerHTML = unique.map(p => {
    const name     = `${p.profiles.first_name} ${p.profiles.last_name}`;
    const initials = (p.profiles.first_name[0] + p.profiles.last_name[0]).toUpperCase();
    const time     = formatTimeAgo(new Date(p.created_at));
    return `
      <div style="display:flex;align-items:center;gap:0.625rem;">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--maroon),var(--maroon-light));color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${escapeHtml(initials)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</div>
          <div style="font-size:11px;color:var(--gray-400);">Posted ${time}</div>
        </div>
      </div>`;
  }).join('');
}

// ── EVENT LISTENERS ──
function setupListeners() {
  document.getElementById('openCreatePost').addEventListener('click', () => openModal('post'));
  document.getElementById('quickPostBtn').addEventListener('click',   () => openModal('post'));
  document.getElementById('quickAnnBtn').addEventListener('click',    () => openModal('announcement'));
  document.getElementById('quickPhotoBtn').addEventListener('click', () => {
    openModal('post');
    setTimeout(() => document.getElementById('imgInput').click(), 150);
  });

  document.querySelectorAll('.feed-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.feed-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadFeed();
    });
  });

  document.getElementById('createModal').addEventListener('click', e => {
    if (e.target.id === 'createModal') e.target.style.display = 'none';
  });
  document.getElementById('deletePostModal').addEventListener('click', e => {
    if (e.target.id === 'deletePostModal') e.target.style.display = 'none';
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    window.location.href = 'login.html';
  });
}

// ── HELPERS ──
function formatTimeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  const bg = type === 'success' ? '#16a34a' : type === 'info' ? '#2563eb' : '#dc2626';
  t.style.cssText = `position:fixed;bottom:2rem;right:2rem;background:${bg};color:white;padding:1rem 1.5rem;border-radius:.5rem;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10000;font-weight:500;font-family:Poppins,sans-serif;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}
