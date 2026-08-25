// ---------------------------------------------------------------
// DEPT COMMUNITY FEED � Live feed with admin powers
// ---------------------------------------------------------------

let adminUser = null;
let deptCommunityId = null;
let allPosts = [];
let currentFilter = 'all';
let pendingDeleteId = null;
let selectedImages = [];
let openCommentPostId = null;

const DEPT_FULL = {
  'CTE':  'College of Teacher Education (CTE)',
  'CSS':  'College of Computer Studies (CCS)',
  'CCS':  'College of Computer Studies (CCS)',
  'CBE':  'College of Business Education (CBE)',
  'PSYCH':'Psychology (PSYCH)',
  'CCJE': 'College of Criminal Justice Education (CCJE)',
};

const DEPT_COLORS = {
  'CTE': '#3b82f6', 'CSS': '#10b981', 'CCS': '#10b981', 'CBE': '#f59e0b',
  'PSYCH': '#8b5cf6', 'CCJE': '#ef4444',
};

// -- AUTH + INIT --
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || !['CTE','CSS','CCS','CBE','PSYCH','CCJE'].includes(profile.admin_role)) {
    window.location.href = profile?.admin_role === 'SSG' ? 'main-dashboard.html' : '../campusfeed.html';
    return;
  }

  adminUser = profile;
  initAdminNotifications(profile.id);
  const dept  = profile.admin_role;
  const color = DEPT_COLORS[dept] || 'var(--maroon)';
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName  = `${profile.first_name} ${profile.last_name}`;

  // Update UI identifiers
  document.getElementById('adminAvatar').textContent  = initials;
  document.getElementById('adminName').textContent    = fullName;
  document.getElementById('adminRoleText').textContent= `${dept} Administrator`;
  document.getElementById('createAvatar').textContent = initials;
  document.getElementById('sideAvatar').textContent   = initials;
  document.getElementById('sideName').textContent     = fullName;
  document.getElementById('sideRole').textContent     = `${dept} Department Admin`;
  document.getElementById('pageTitle').textContent    = `${dept} Community Feed`;
  document.getElementById('pageSubtitle').textContent = DEPT_FULL[dept];
  document.querySelectorAll('.deptLabel').forEach(el => el.textContent = dept);

  // Color the avatar
  document.getElementById('adminAvatar').style.background = `linear-gradient(135deg,${color},${color}cc)`;
  document.getElementById('createAvatar').style.background = `linear-gradient(135deg,${color},${color}cc)`;

  // Get community
  const { data: community } = await db
    .from('communities')
    .select('id, name, description')
    .eq('type', 'department')
    .ilike('department', DEPT_FULL[dept])
    .single();

  if (community) {
    deptCommunityId = community.id;
    document.getElementById('commName').textContent = community.name;
    document.getElementById('commSub').textContent  = community.description || DEPT_FULL[dept];
  }

  await Promise.all([loadFeed(), loadCommStats(), loadRecentMembers()]);
  setupListeners();
})();

// -- LOAD COMMUNITY STATS --
async function loadCommStats() {
  if (!deptCommunityId) return;

  const [{ count: postCount }, { count: memberCount }] = await Promise.all([
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', deptCommunityId),
    db.from('profiles').select('*', { count: 'exact', head: true }).ilike('department', DEPT_FULL[adminUser.admin_role]),
  ]);

  document.getElementById('statPosts').textContent   = postCount   || 0;
  document.getElementById('statMembers').textContent = memberCount || 0;
}

// -- LOAD FEED --
async function loadFeed() {
  if (!deptCommunityId) {
    document.getElementById('feedContainer').innerHTML = `
      <div class="empty-feed">
        <i class="fas fa-exclamation-circle"></i>
        <p>Department community not found.</p>
      </div>`;
    return;
  }

  let query = db.from('posts')
    .select('*, profiles:author_id(id, first_name, last_name, admin_role)')
    .eq('community_id', deptCommunityId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (currentFilter === 'pinned')        query = query.eq('is_pinned', true);
  if (currentFilter === 'flagged')       query = query.eq('is_flagged', true);
  if (currentFilter === 'announcements') query = query.ilike('content', '??%');

  const { data: posts, error } = await query;
  if (error) { console.error(error); return; }

  allPosts = posts || [];
  document.getElementById('postCountLabel').textContent = `${allPosts.length} post${allPosts.length !== 1 ? 's' : ''}`;

  if (!allPosts.length) {
    document.getElementById('feedContainer').innerHTML = `
      <div class="empty-feed">
        <i class="fas fa-inbox"></i>
        <p>${currentFilter === 'all' ? 'No posts yet. Be the first to post!' : 'No posts match this filter.'}</p>
      </div>`;
    return;
  }

  // Check likes for current admin
  const likedSet = new Set();
  if (allPosts.length) {
    const { data: likes } = await db.from('post_likes')
      .select('post_id')
      .eq('user_id', adminUser.id)
      .in('post_id', allPosts.map(p => p.id));
    (likes || []).forEach(l => likedSet.add(l.post_id));

    // Get real like counts per post
    const { data: likeCounts } = await db.from('post_likes')
      .select('post_id')
      .in('post_id', allPosts.map(p => p.id));
    const likeCountMap = {};
    (likeCounts || []).forEach(l => { likeCountMap[l.post_id] = (likeCountMap[l.post_id] || 0) + 1; });

    // Get real comment counts per post
    const { data: commentCounts } = await db.from('comments')
      .select('post_id')
      .in('post_id', allPosts.map(p => p.id));
    const commentCountMap = {};
    (commentCounts || []).forEach(c => { commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1; });

    // Attach real counts to posts
    allPosts.forEach(p => {
      p.like_count = likeCountMap[p.id] || 0;
      p.comment_count = commentCountMap[p.id] || 0;
    });
  }

  document.getElementById('feedContainer').innerHTML = allPosts.map(post => renderPost(post, likedSet)).join('');
}

// -- RENDER A SINGLE POST --
function renderPost(post, likedSet) {
  const isAnon   = post.is_anonymous;
  const isAnn    = post.content?.startsWith('📢 [ANNOUNCEMENT]');
  const author   = isAnon ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Unknown');
  const initials = isAnon ? 'A' : (post.profiles ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : '?');
  const isAdmin  = post.profiles?.admin_role && post.profiles.admin_role !== 'student';
  const timeAgo  = formatTimeAgo(new Date(post.created_at));
  const liked    = likedSet ? likedSet.has(post.id) : false;
  const images   = Array.isArray(post.image_url) ? post.image_url : (post.image_url ? [post.image_url] : []);

  const cardClass = [
    'post-card',
    post.is_pinned && 'is-pinned',
    post.is_flagged && 'is-flagged',
    isAnn && 'is-announcement',
  ].filter(Boolean).join(' ');

  // Image grid � small thumbnails, full image visible
  let imageHtml = '';
  if (images.length) {
    const shown = images.slice(0, 5);
    const extra = images.length > 5 ? images.length - 4 : 0;
    imageHtml = `<div class="post-images">
      ${shown.map((url, i) => `
        <div class="img-item">
          <img src="${url}" alt="Post image" loading="lazy" />
          ${extra && i === 3 ? `<div class="img-more-overlay">+${extra}</div>` : ''}
        </div>`).join('')}
    </div>`;
  }

  return `
    <div class="${cardClass}" id="post-${post.id}">
      <div class="post-top">
        <div class="feed-avatar" style="background:linear-gradient(135deg,${isAnon ? '#6b7280' : 'var(--maroon)'},${isAnon ? '#374151' : 'var(--maroon-light)'})">${escapeHtml(initials)}</div>
        <div class="post-author-info">
          <div class="post-author-name">
            ${escapeHtml(author)}
            ${isAdmin ? `<span class="badge badge-admin"><i class="fas fa-shield-alt"></i> Admin</span>` : ''}
          </div>
          <div class="post-meta-row">
            ${post.is_pinned  ? `<span class="badge badge-pin"><i class="fas fa-thumbtack"></i> Pinned</span>` : ''}
            ${post.is_flagged ? `<span class="badge badge-flag"><i class="fas fa-flag"></i> Flagged</span>` : ''}
            ${isAnn           ? `<span class="badge badge-ann"><i class="fas fa-bullhorn"></i> Announcement</span>` : ''}
            <span class="post-time">${timeAgo}</span>
          </div>
        </div>
      </div>

      <div class="post-content">${escapeHtml((post.content || '').replace(/^📢?\s*\[ANNOUNCEMENT\]\s*/i, ''))}</div>
      ${imageHtml}

      <div class="post-actions">
        <!-- Student interactions -->
        <button class="action-btn ${liked ? 'liked' : ''}" onclick="toggleLike('${post.id}', ${liked})">
          <i class="${liked ? 'fas' : 'far'} fa-heart"></i>
          <span>${post.like_count || 0}</span>
        </button>
        <button class="action-btn ${openCommentPostId === post.id ? 'active' : ''}" onclick="toggleComments('${post.id}')">
          <i class="far fa-comment"></i>
          <span>${post.comment_count || 0}</span>
        </button>

        <!-- Admin mod buttons on the right -->
        <div class="admin-actions">
          <button class="admin-btn" onclick="togglePin('${post.id}', ${post.is_pinned})" title="${post.is_pinned ? 'Unpin' : 'Pin'}">
            <i class="fas fa-thumbtack"></i> ${post.is_pinned ? 'Unpin' : 'Pin'}
          </button>
          <button class="admin-btn ${post.is_flagged ? 'danger' : ''}" onclick="toggleFlag('${post.id}', ${post.is_flagged})" title="${post.is_flagged ? 'Unflag' : 'Flag'}">
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
          <div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:13px;"><i class="fas fa-spinner fa-spin"></i> Loading comments...</div>
        </div>
        <div class="comment-input-row">
          <div class="feed-avatar comment-avatar" style="width:28px;height:28px;font-size:11px;">${(adminUser?.first_name?.[0] || '') + (adminUser?.last_name?.[0] || '')}</div>
          <input class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." maxlength="500"
            onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendComment('${post.id}');}" />
          <button class="comment-send" onclick="sendComment('${post.id}')"><i class="fas fa-paper-plane"></i></button>
        </div>
      </div>
    </div>`;
}

// -- TOGGLE COMMENTS --
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
    .select('*, profiles:author_id(first_name, last_name)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !comments?.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:13px;">No comments yet. Be the first!</div>`;
    return;
  }

  listEl.innerHTML = comments.map(c => {
    const author   = c.is_anonymous ? 'Anonymous' : (c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Unknown');
    const initials = c.is_anonymous ? 'A' : (c.profiles ? (c.profiles.first_name[0] + c.profiles.last_name[0]).toUpperCase() : '?');
    const time = formatTimeAgo(new Date(c.created_at));
    return `
      <div class="comment-item">
        <div class="comment-avatar">${escapeHtml(initials)}</div>
        <div class="comment-bubble">
          <span class="comment-author">${escapeHtml(author)}</span>
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
    post_id:   postId,
    author_id: adminUser.id,
    content,
    is_anonymous: false,
  });

  input.disabled = false;

  if (error) { showToast('Failed to send comment', 'error'); return; }
  await loadComments(postId);

  // Update comment count on card
  const countEl = document.querySelector(`#post-${postId} .action-btn:nth-child(2) span`);
  if (countEl) countEl.textContent = parseInt(countEl.textContent || 0) + 1;
}

// -- LIKE --
async function toggleLike(postId, liked) {
  if (liked) {
    await db.from('post_likes').delete().eq('post_id', postId).eq('user_id', adminUser.id);
  } else {
    await db.from('post_likes').insert({ post_id: postId, user_id: adminUser.id });
  }
  // Refresh only this post's like state
  const btn = document.querySelector(`#post-${postId} .action-btn:first-child`);
  if (btn) {
    const countEl = btn.querySelector('span');
    const icon    = btn.querySelector('i');
    const newLiked = !liked;
    const newCount = parseInt(countEl.textContent || 0) + (newLiked ? 1 : -1);
    btn.className = `action-btn ${newLiked ? 'liked' : ''}`;
    btn.setAttribute('onclick', `toggleLike('${postId}', ${newLiked})`);
    icon.className = newLiked ? 'fas fa-heart' : 'far fa-heart';
    countEl.textContent = newCount;
  }
}

// -- PIN / FLAG / DELETE --
async function togglePin(postId, current) {
  const { error } = await db.from('posts').update({ is_pinned: !current }).eq('id', postId);
  if (error) { showToast('Failed', 'error'); return; }
  showToast(current ? 'Post unpinned' : 'Post pinned!', 'success');
  await loadFeed();
}

async function toggleFlag(postId, current) {
  if (!current) {
    const reason = prompt('Flag reason (optional):') || 'Flagged by admin';
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

// -- CREATE / PUBLISH POST --
function openModal(type = 'post') {
  setType(type);
  document.getElementById('modalContent').value = '';
  document.getElementById('pinNewPost').checked  = false;
  document.getElementById('imgPreview').innerHTML = '';
  selectedImages = [];
  document.getElementById('createModal').style.display = 'flex';
  setTimeout(() => document.getElementById('modalContent').focus(), 100);
}

function setType(type) {
  const isAnn = type === 'announcement';
  document.getElementById('modalPostType').value = type;
  document.getElementById('modalTitle').textContent = isAnn ? 'New Announcement' : 'New Post';

  document.getElementById('typeBtnPost').style.cssText = `flex:1;padding:0.625rem;background:${isAnn ? 'var(--gray-100)' : 'var(--maroon)'};color:${isAnn ? 'var(--gray-700)' : 'white'};border:${isAnn ? '1px solid var(--gray-300)' : 'none'};border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;`;
  document.getElementById('typeBtnAnn').style.cssText  = `flex:1;padding:0.625rem;background:${isAnn ? '#f59e0b' : 'var(--gray-100)'};color:${isAnn ? 'white' : 'var(--gray-700)'};border:${isAnn ? 'none' : '1px solid var(--gray-300)'};border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;`;
  document.getElementById('annBadge').style.display = isAnn ? 'block' : 'none';
}

async function publishPost() {
  const content = document.getElementById('modalContent').value.trim();
  if (!content) { showToast('Please write something first.', 'error'); return; }
  if (!deptCommunityId) { showToast('Community not found.', 'error'); return; }

  const btn = document.getElementById('publishBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
  btn.disabled  = true;

  try {
    const isAnn    = document.getElementById('modalPostType').value === 'announcement';
    const isPinned = document.getElementById('pinNewPost').checked;

    let imageUrls = [];
    for (const file of selectedImages) {
      const name = `dept-feed-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
      const { error: upErr } = await db.storage.from('post-images').upload(name, file, { cacheControl: '3600' });
      if (!upErr) {
        const { data: { publicUrl } } = db.storage.from('post-images').getPublicUrl(name);
        imageUrls.push(publicUrl);
      }
    }

    const { error } = await db.from('posts').insert({
      community_id: deptCommunityId,
      author_id:    adminUser.id,
      content:      isAnn ? `📢 [ANNOUNCEMENT]\n\n${content}` : content,
      is_anonymous: false,
      is_pinned:    isPinned,
      image_url:    imageUrls.length ? imageUrls : null,
    });
    if (error) throw error;

    showToast(isAnn ? '?? Announcement published!' : 'Post published!', 'success');
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

// -- IMAGE HANDLING --
document.getElementById('imgInput').addEventListener('change', e => {
  const toAdd = Array.from(e.target.files).slice(0, 5 - selectedImages.length);
  toAdd.forEach(file => {
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

// -- RECENT MEMBERS --
async function loadRecentMembers() {
  const { data: members } = await db.from('profiles')
    .select('first_name, last_name, student_id, created_at')
    .ilike('department', DEPT_FULL[adminUser.admin_role])
    .order('created_at', { ascending: false })
    .limit(5);

  const el = document.getElementById('recentMembersList');
  if (!members?.length) { el.innerHTML = `<div style="color:var(--gray-400);font-size:13px;">No students yet</div>`; return; }

  el.innerHTML = members.map(m => {
    const initials = ((m.first_name?.[0] || '') + (m.last_name?.[0] || '')).toUpperCase();
    const name     = `${m.first_name} ${m.last_name}`;
    const time     = formatTimeAgo(new Date(m.created_at));
    return `
      <div style="display:flex;align-items:center;gap:0.625rem;">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;">${escapeHtml(initials)}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</div>
          <div style="font-size:11px;color:var(--gray-400);">Joined ${time}</div>
        </div>
      </div>`;
  }).join('');
}

// -- EVENT LISTENERS --
function setupListeners() {
  // Open modal buttons
  document.getElementById('openCreatePost').addEventListener('click', () => openModal('post'));
  document.getElementById('quickPostBtn').addEventListener('click',  () => openModal('post'));
  document.getElementById('quickAnnBtn').addEventListener('click',   () => openModal('announcement'));
  document.getElementById('quickPhotoBtn').addEventListener('click', () => {
    openModal('post');
    setTimeout(() => document.getElementById('imgInput').click(), 150);
  });

  // Filter tabs
  document.querySelectorAll('.feed-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.feed-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadFeed();
    });
  });

  // Close modals on background click
  document.getElementById('createModal').addEventListener('click', e => {
    if (e.target.id === 'createModal') e.target.style.display = 'none';
  });
  document.getElementById('deletePostModal').addEventListener('click', e => {
    if (e.target.id === 'deletePostModal') e.target.style.display = 'none';
  });
}

// -- HELPERS --
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

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'login.html';
});



