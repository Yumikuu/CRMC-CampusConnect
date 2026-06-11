// ═══════════════════════════════════════════════════════════════
// SSG OFFICER — COMMUNITY FEED
// Shows student posts in the 'ssg' community (SSG Student Government)
// Officers can reply, flag, pin, and delete posts
// ═══════════════════════════════════════════════════════════════

let adminUser    = null;
let ssgCommId    = null;
let currentFilter = 'all';
let allPosts      = [];
let page          = 0;
const PAGE_SIZE   = 15;

// ── AUTH GUARD ──
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.admin_role !== 'SSG_OFFICER') {
    window.location.href = 'login.html'; return;
  }

  adminUser = profile;
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminName').textContent   = `${profile.first_name} ${profile.last_name}`;

  // Get the open SSG community (where students post)
  const { data: comm } = await db.from('communities').select('id').eq('slug', 'ssg').single();
  if (comm) ssgCommId = comm.id;

  await loadStats();
  await loadFeed(true);
  setupListeners();
})();

// ── STATS ──
async function loadStats() {
  if (!ssgCommId) return;

  const [posts, flagged] = await Promise.all([
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommId),
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommId).eq('is_flagged', true),
  ]);

  document.getElementById('statPosts').textContent   = posts.count   || 0;
  document.getElementById('statFlagged').textContent = flagged.count || 0;

  // Comment count for all posts
  if (posts.count > 0) {
    const { data: postIds } = await db.from('posts').select('id').eq('community_id', ssgCommId);
    if (postIds?.length) {
      const { count: cc } = await db.from('comments').select('*', { count: 'exact', head: true })
        .in('post_id', postIds.map(p => p.id));
      document.getElementById('statComments').textContent = cc || 0;
    }
  } else {
    document.getElementById('statComments').textContent = 0;
  }
}

// ── LOAD FEED ──
async function loadFeed(reset = false) {
  if (!ssgCommId) {
    document.getElementById('feedContainer').innerHTML = emptyState('fa-star', 'SSG community not found.', 'Run add-ssg-community.sql in Supabase first.');
    return;
  }

  if (reset) { page = 0; allPosts = []; }

  let query = db.from('posts')
    .select('*, profiles:author_id(first_name, last_name, avatar_url)')
    .eq('community_id', ssgCommId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (currentFilter === 'flagged')    query = query.eq('is_flagged', true);
  if (currentFilter === 'unanswered') query = query.eq('comment_count', 0);

  const { data: posts, error } = await query;
  if (error) { showToast('Failed to load feed', 'error'); return; }

  if (reset) {
    allPosts = posts || [];
    renderFeed();
  } else {
    allPosts = [...allPosts, ...(posts || [])];
    renderFeed();
  }

  // Show/hide load more
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  if ((posts || []).length === PAGE_SIZE) {
    loadMoreBtn.style.display = 'inline-block';
    page++;
  } else {
    loadMoreBtn.style.display = 'none';
  }
}

// ── RENDER FEED ──
function renderFeed() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const filtered = search
    ? allPosts.filter(p => p.content.toLowerCase().includes(search) || (p.title || '').toLowerCase().includes(search))
    : allPosts;

  const container = document.getElementById('feedContainer');

  if (!filtered.length) {
    container.innerHTML = emptyState('fa-comments', 'No posts found.', currentFilter === 'unanswered' ? 'All posts have been answered!' : 'No student posts yet in the SSG community.');
    return;
  }

  container.innerHTML = filtered.map(post => buildPostCard(post)).join('');
}

// ── BUILD POST CARD ──
function buildPostCard(post) {
  const isAnon   = post.is_anonymous;
  const author   = post.profiles;
  const name     = isAnon ? 'Anonymous' : (author ? `${author.first_name} ${author.last_name}` : 'Unknown');
  const initials = isAnon ? '?' : (author ? (author.first_name[0] + author.last_name[0]).toUpperCase() : '?');
  const timeAgo  = formatTimeAgo(new Date(post.created_at));
  const hasImages = post.image_url && Array.isArray(post.image_url) && post.image_url.length > 0;

  return `
    <div class="post-card" id="post-${post.id}" data-post-id="${post.id}">
      <div class="post-avatar" style="${isAnon ? 'background:var(--gray-400);' : ''}">
        ${author?.avatar_url && !isAnon
          ? `<img src="${author.avatar_url}" alt="${escapeHtml(name)}" />`
          : initials}
      </div>
      <div class="post-body">
        <div class="post-meta">
          <span class="post-author">${escapeHtml(name)}</span>
          ${isAnon ? `<span class="anon-badge"><i class="fas fa-user-secret" style="margin-right:3px;"></i>Anonymous</span>` : ''}
          ${post.is_pinned ? `<span style="font-size:.72rem;background:rgba(107,15,26,.08);color:var(--maroon);padding:2px 7px;border-radius:999px;font-weight:600;"><i class="fas fa-thumbtack" style="font-size:.65rem;"></i> Pinned</span>` : ''}
          ${post.is_flagged ? `<span style="font-size:.72rem;background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:999px;font-weight:600;"><i class="fas fa-flag" style="font-size:.65rem;"></i> Flagged</span>` : ''}
          <span class="post-time">${timeAgo}</span>
        </div>
        ${post.title ? `<div style="font-size:1rem;font-weight:700;color:var(--gray-900);margin-bottom:.35rem;">${escapeHtml(post.title)}</div>` : ''}
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${hasImages ? `
          <div class="post-images">
            ${post.image_url.slice(0, 5).map(url =>
              `<img src="${url}" alt="Post image" onclick="window.open('${url}','_blank')" />`
            ).join('')}
            ${post.image_url.length > 5 ? `<div style="width:80px;height:80px;background:var(--gray-100);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:var(--gray-500);">+${post.image_url.length - 5}</div>` : ''}
          </div>` : ''}
        <div class="post-actions">
          <button class="action-btn btn-reply" onclick="toggleReply('${post.id}')">
            <i class="fas fa-reply"></i> Reply as SSG
          </button>
          <button class="action-btn btn-reply" onclick="toggleComments('${post.id}')" style="background:rgba(59,130,246,.07);color:#2563eb;">
            <i class="fas fa-comments"></i> <span id="comment-count-${post.id}">${post.comment_count || 0}</span> Comments
          </button>
          <button class="action-btn btn-pin" onclick="togglePin('${post.id}', ${post.is_pinned})">
            <i class="fas fa-thumbtack"></i> ${post.is_pinned ? 'Unpin' : 'Pin'}
          </button>
          ${post.is_flagged
            ? `<button class="action-btn btn-unflag" onclick="unflagPost('${post.id}')"><i class="fas fa-check"></i> Unflag</button>`
            : `<button class="action-btn btn-flag" onclick="flagPost('${post.id}')"><i class="fas fa-flag"></i> Flag</button>`}
          <button class="action-btn btn-delete" onclick="deletePost('${post.id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
          <span class="post-stats">
            <span><i class="fas fa-heart" style="color:#e11d48;margin-right:3px;"></i>${post.like_count || 0}</span>
          </span>
        </div>

        <!-- SSG Reply Box -->
        <div class="reply-box" id="reply-box-${post.id}">
          <div style="font-size:.8rem;font-weight:700;color:var(--maroon);margin-bottom:.5rem;">
            <i class="fas fa-star" style="margin-right:4px;"></i>Reply as SSG Officer
          </div>
          <div class="reply-input-row">
            <textarea class="reply-textarea" id="reply-input-${post.id}" placeholder="Write your official SSG reply..."></textarea>
            <button class="reply-send-btn" onclick="submitReply('${post.id}')">
              <i class="fas fa-paper-plane"></i> Send
            </button>
          </div>
        </div>

        <!-- Comments Section -->
        <div class="comments-section" id="comments-${post.id}"></div>
      </div>
    </div>`;
}

// ── TOGGLE REPLY BOX ──
function toggleReply(postId) {
  const box = document.getElementById(`reply-box-${postId}`);
  box.classList.toggle('open');
  if (box.classList.contains('open')) {
    document.getElementById(`reply-input-${postId}`).focus();
  }
}

// ── TOGGLE COMMENTS ──
async function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (section.classList.contains('open')) {
    section.classList.remove('open');
    return;
  }
  section.classList.add('open');
  await loadComments(postId);
}

// ── LOAD COMMENTS ──
async function loadComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  section.innerHTML = '<div style="padding:.5rem 0;color:var(--gray-400);font-size:.8rem;"><i class="fas fa-spinner fa-spin"></i> Loading comments...</div>';

  const { data: comments, error } = await db
    .from('comments')
    .select('*, profiles:author_id(first_name, last_name, admin_role)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error || !comments?.length) {
    section.innerHTML = '<div style="padding:.5rem 0;color:var(--gray-400);font-size:.8rem;">No comments yet.</div>';
    return;
  }

  section.innerHTML = comments.map(c => {
    const isAnon   = c.is_anonymous;
    const author   = c.profiles;
    const name     = isAnon ? 'Anonymous' : (author ? `${author.first_name} ${author.last_name}` : 'Unknown');
    const initials = isAnon ? '?' : (author ? (author.first_name[0] + author.last_name[0]).toUpperCase() : '?');
    const isOfficer = author?.admin_role === 'SSG_OFFICER' || author?.admin_role === 'SSG';
    const timeAgo  = formatTimeAgo(new Date(c.created_at));

    return `
      <div class="comment-item">
        <div class="comment-avatar" style="${isOfficer ? 'background:linear-gradient(135deg,#b7950b,#d4ac0d);' : ''}">${initials}</div>
        <div class="comment-body">
          <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
            <span class="comment-author">${escapeHtml(name)}</span>
            ${isOfficer ? `<span class="ssg-reply-badge"><i class="fas fa-star" style="font-size:.6rem;"></i> SSG Officer</span>` : ''}
            ${isAnon ? `<span class="anon-badge">Anonymous</span>` : ''}
          </div>
          <div class="comment-text">${escapeHtml(c.content)}</div>
          <div class="comment-time">${timeAgo}</div>
        </div>
        <button onclick="deleteComment('${c.id}', '${postId}')" style="background:none;border:none;color:var(--gray-300);cursor:pointer;padding:.25rem;font-size:.75rem;flex-shrink:0;" title="Delete comment">
          <i class="fas fa-trash"></i>
        </button>
      </div>`;
  }).join('');
}

// ── SUBMIT REPLY ──
async function submitReply(postId) {
  const input   = document.getElementById(`reply-input-${postId}`);
  const content = input.value.trim();
  if (!content) { showToast('Reply cannot be empty', 'error'); return; }

  try {
    const { error } = await db.from('comments').insert({
      post_id:      postId,
      author_id:    adminUser.id,
      is_anonymous: false,
      content:      content,
    });
    if (error) throw error;

    input.value = '';
    document.getElementById(`reply-box-${postId}`).classList.remove('open');

    // Refresh comments and update count
    const section = document.getElementById(`comments-${postId}`);
    if (section.classList.contains('open')) await loadComments(postId);
    else { section.classList.add('open'); await loadComments(postId); }

    const { count } = await db.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    const countEl = document.getElementById(`comment-count-${postId}`);
    if (countEl) countEl.textContent = count || 0;

    showToast('Reply posted!', 'success');
  } catch (err) {
    showToast('Failed to reply: ' + err.message, 'error');
  }
}

// ── DELETE COMMENT ──
async function deleteComment(commentId, postId) {
  if (!confirm('Delete this comment?')) return;
  const { error } = await db.from('comments').delete().eq('id', commentId);
  if (error) { showToast('Failed to delete comment', 'error'); return; }
  await loadComments(postId);
  const { count } = await db.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);
  const countEl = document.getElementById(`comment-count-${postId}`);
  if (countEl) countEl.textContent = count || 0;
  showToast('Comment deleted', 'success');
}

// ── PIN TOGGLE ──
async function togglePin(postId, isPinned) {
  const { error } = await db.from('posts').update({ is_pinned: !isPinned }).eq('id', postId);
  if (error) { showToast('Failed to update pin', 'error'); return; }
  showToast(isPinned ? 'Post unpinned' : 'Post pinned to top', 'success');
  await loadFeed(true);
}

// ── FLAG ──
async function flagPost(postId) {
  const { error } = await db.from('posts').update({ is_flagged: true }).eq('id', postId);
  if (error) { showToast('Failed to flag post', 'error'); return; }
  showToast('Post flagged', 'success');
  await loadFeed(true);
  await loadStats();
}

async function unflagPost(postId) {
  const { error } = await db.from('posts').update({ is_flagged: false, flag_reason: null }).eq('id', postId);
  if (error) { showToast('Failed to unflag post', 'error'); return; }
  showToast('Post unflagged', 'success');
  await loadFeed(true);
  await loadStats();
}

// ── DELETE ──
async function deletePost(postId) {
  if (!confirm('Delete this post permanently? This cannot be undone.')) return;
  const { error } = await db.from('posts').delete().eq('id', postId);
  if (error) { showToast('Failed to delete post', 'error'); return; }
  document.getElementById(`post-${postId}`)?.remove();
  showToast('Post deleted', 'success');
  await loadStats();
}

// ── SETUP LISTENERS ──
function setupListeners() {
  // Tab filters
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      await loadFeed(true);
    });
  });

  // Search
  let searchTimer;
  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderFeed(), 250);
  });

  // Load more
  document.getElementById('loadMoreBtn').addEventListener('click', () => loadFeed(false));

  // Enter key in reply textareas
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.ctrlKey && e.target.classList.contains('reply-textarea')) {
      const postId = e.target.id.replace('reply-input-', '');
      submitReply(postId);
    }
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    window.location.href = 'login.html';
  });
}

// ── HELPERS ──
function formatTimeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800)return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(t) {
  if (!t) return '';
  const d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function emptyState(icon, title, sub = '') {
  return `<div style="text-align:center;padding:3rem;background:var(--white);border-radius:var(--radius);border:1px solid var(--gray-200);">
    <i class="fas ${icon}" style="font-size:2.5rem;color:var(--gray-300);margin-bottom:1rem;display:block;"></i>
    <p style="font-size:15px;color:var(--gray-600);font-weight:500;">${title}</p>
    ${sub ? `<small style="color:var(--gray-400);font-size:13px;">${sub}</small>` : ''}
  </div>`;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:2rem;right:2rem;background:${type === 'success' ? '#16a34a' : '#dc2626'};color:white;padding:1rem 1.5rem;border-radius:.5rem;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10000;font-weight:500;font-family:Poppins,sans-serif;max-width:320px;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}
