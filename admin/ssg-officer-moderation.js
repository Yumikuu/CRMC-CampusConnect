// ═══════════════════════════════════════════════════════════════
// SSG OFFICER — MODERATION
// Scoped to ssg-announcements + ssg communities
// ═══════════════════════════════════════════════════════════════

let adminUser   = null;
let ssgCommIds  = [];
let currentTab  = 'flagged';
let viewingPost = null;

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

  // Get SSG community IDs (both ssg and ssg-announcements)
  const { data: comms } = await db.from('communities').select('id').in('slug', ['ssg', 'ssg-announcements']);
  ssgCommIds = (comms || []).map(c => c.id);

  await loadStats();
  await loadFlagged();
  setupListeners();
})();

// ── STATS ──
async function loadStats() {
  if (!ssgCommIds.length) return;

  const [flagged, pending, approved] = await Promise.all([
    db.from('posts').select('*', { count: 'exact', head: true }).in('community_id', ssgCommIds).eq('is_flagged', true),
    db.from('posts').select('*', { count: 'exact', head: true }).in('community_id', ssgCommIds).eq('moderation_status', 'pending'),
    db.from('posts').select('*', { count: 'exact', head: true }).in('community_id', ssgCommIds).eq('moderation_status', 'approved'),
  ]);

  document.getElementById('totalFlagged').textContent = flagged.count || 0;
  document.getElementById('pendingReview').textContent = pending.count || 0;
  document.getElementById('approvedToday').textContent = approved.count || 0;
  document.getElementById('countFlagged').textContent  = `(${flagged.count || 0})`;
}

// ── FLAGGED POSTS ──
async function loadFlagged() {
  const container = document.getElementById('flaggedContainer');
  if (!ssgCommIds.length) {
    container.innerHTML = emptyState('fa-flag', 'No SSG communities found.');
    return;
  }

  const { data: posts, error } = await db
    .from('posts')
    .select('*, profiles:author_id(first_name, last_name), communities:community_id(name, slug)')
    .in('community_id', ssgCommIds)
    .eq('is_flagged', true)
    .order('created_at', { ascending: false });

  if (error || !posts?.length) {
    container.innerHTML = emptyState('fa-check-circle', 'No flagged posts.', 'Everything looks clean!');
    return;
  }

  document.getElementById('countFlagged').textContent = `(${posts.length})`;
  container.innerHTML = posts.map(p => renderPostCard(p, true)).join('');
}

// ── ALL SSG POSTS ──
async function loadAllPosts() {
  const container = document.getElementById('allContainer');
  if (!ssgCommIds.length) {
    container.innerHTML = emptyState('fa-newspaper', 'No SSG communities found.');
    return;
  }

  const { data: posts, error } = await db
    .from('posts')
    .select('*, profiles:author_id(first_name, last_name), communities:community_id(name, slug)')
    .in('community_id', ssgCommIds)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !posts?.length) {
    container.innerHTML = emptyState('fa-newspaper', 'No posts found.');
    return;
  }

  document.getElementById('countAll').textContent = `(${posts.length})`;
  container.innerHTML = posts.map(p => renderPostCard(p, false)).join('');
}

// ── RENDER POST CARD ──
function renderPostCard(post, isFlagged) {
  const author   = post.profiles;
  const name     = author ? `${author.first_name} ${author.last_name}` : (post.is_anonymous ? 'Anonymous' : 'Unknown');
  const initials = author ? (author.first_name[0] + author.last_name[0]).toUpperCase() : '?';
  const timeAgo  = formatTimeAgo(new Date(post.created_at));
  const preview  = post.content.length > 180 ? post.content.substring(0, 180) + '…' : post.content;
  const commName = post.communities?.name || 'SSG';

  return `
    <div class="card" id="post-card-${post.id}">
      <div class="card-body">
        <div style="display:flex;gap:1rem;align-items:flex-start;">
          <div class="activity-avatar" style="flex-shrink:0;${post.is_anonymous ? 'background:var(--gray-400);' : ''}">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-bottom:.25rem;">
              <span style="font-weight:700;font-size:.9rem;">${escapeHtml(name)}</span>
              <span style="font-size:.75rem;background:rgba(107,15,26,.08);color:var(--maroon);padding:2px 8px;border-radius:999px;">${escapeHtml(commName)}</span>
              ${post.is_flagged ? `<span style="font-size:.75rem;background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:999px;font-weight:600;"><i class="fas fa-flag" style="font-size:.65rem;"></i> Flagged${post.flag_reason ? ': ' + escapeHtml(post.flag_reason) : ''}</span>` : ''}
              ${post.is_pinned ? `<span style="font-size:.75rem;background:rgba(107,15,26,.08);color:var(--maroon);padding:2px 8px;border-radius:999px;"><i class="fas fa-thumbtack" style="font-size:.65rem;"></i> Pinned</span>` : ''}
              <span style="font-size:.75rem;color:var(--gray-400);margin-left:auto;">${timeAgo}</span>
            </div>
            ${post.title ? `<div style="font-size:.95rem;font-weight:700;margin-bottom:.3rem;">${escapeHtml(post.title)}</div>` : ''}
            <p style="font-size:.875rem;color:var(--gray-700);line-height:1.6;margin-bottom:.75rem;">${escapeHtml(preview)}</p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
              <button onclick="viewPost('${post.id}')" style="padding:.4rem .85rem;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-eye"></i> View</button>
              ${post.is_flagged ? `
                <button onclick="unflagPost('${post.id}')" style="padding:.4rem .85rem;background:#dcfce7;border:1px solid #bbf7d0;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:#16a34a;"><i class="fas fa-check"></i> Unflag</button>
              ` : `
                <button onclick="flagPost('${post.id}')" style="padding:.4rem .85rem;background:#fee2e2;border:1px solid #fecaca;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:#dc2626;"><i class="fas fa-flag"></i> Flag</button>
              `}
              <button onclick="deletePost('${post.id}')" style="padding:.4rem .85rem;background:#fee2e2;border:1px solid #fecaca;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:#dc2626;"><i class="fas fa-trash"></i> Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

// ── ACTIONS ──
async function unflagPost(postId) {
  const { error } = await db.from('posts').update({ is_flagged: false, flag_reason: null }).eq('id', postId);
  if (error) { showToast('Failed to unflag', 'error'); return; }
  showToast('Post unflagged', 'success');
  await loadStats();
  if (currentTab === 'flagged') await loadFlagged();
  else await loadAllPosts();
}

async function flagPost(postId) {
  const reason = prompt('Reason for flagging (optional):') || null;
  const { error } = await db.from('posts').update({ is_flagged: true, flag_reason: reason }).eq('id', postId);
  if (error) { showToast('Failed to flag', 'error'); return; }
  showToast('Post flagged', 'success');
  await loadStats();
  if (currentTab === 'flagged') await loadFlagged();
  else await loadAllPosts();
}

async function deletePost(postId) {
  if (!confirm('Delete this post permanently?')) return;
  const { error } = await db.from('posts').delete().eq('id', postId);
  if (error) { showToast('Failed to delete', 'error'); return; }
  showToast('Post deleted', 'success');
  document.getElementById(`post-card-${postId}`)?.remove();
  await loadStats();
}

async function viewPost(postId) {
  const { data: post } = await db
    .from('posts')
    .select('*, profiles:author_id(first_name, last_name), communities:community_id(name)')
    .eq('id', postId)
    .single();

  if (!post) return;
  viewingPost = post;

  const author  = post.profiles;
  const name    = author ? `${author.first_name} ${author.last_name}` : (post.is_anonymous ? 'Anonymous' : 'Unknown');
  const timeAgo = formatTimeAgo(new Date(post.created_at));

  document.getElementById('postModalBody').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1rem;">
      <div style="display:flex;gap:.75rem;align-items:center;">
        <div class="activity-avatar">${name[0]}</div>
        <div>
          <div style="font-weight:700;">${escapeHtml(name)}</div>
          <div style="font-size:.75rem;color:var(--gray-400);">${post.communities?.name || 'SSG'} · ${timeAgo}</div>
        </div>
      </div>
      ${post.title ? `<h3 style="font-size:1.1rem;font-weight:700;">${escapeHtml(post.title)}</h3>` : ''}
      <p style="font-size:.9rem;line-height:1.7;color:var(--gray-700);white-space:pre-wrap;">${escapeHtml(post.content)}</p>
      ${post.image_url && post.image_url.length ? `
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${post.image_url.map(url => `<img src="${url}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--gray-200);" />`).join('')}
        </div>` : ''}
      <div style="display:flex;gap:1rem;color:var(--gray-500);font-size:.85rem;">
        <span><i class="fas fa-heart" style="color:#e11d48;margin-right:4px;"></i>${post.like_count || 0} likes</span>
        <span><i class="fas fa-comment" style="color:#3b82f6;margin-right:4px;"></i>${post.comment_count || 0} comments</span>
        ${post.is_flagged ? `<span style="color:#dc2626;font-weight:600;"><i class="fas fa-flag" style="margin-right:4px;"></i>Flagged${post.flag_reason ? ': ' + escapeHtml(post.flag_reason) : ''}</span>` : ''}
      </div>
    </div>`;

  document.getElementById('postModalFooter').innerHTML = `
    ${post.is_flagged
      ? `<button onclick="unflagPost('${post.id}');document.getElementById('postModal').style.display='none'" style="padding:.625rem 1.25rem;background:#dcfce7;border:1px solid #bbf7d0;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:#16a34a;"><i class="fas fa-check"></i> Unflag</button>`
      : `<button onclick="flagPost('${post.id}');document.getElementById('postModal').style.display='none'" style="padding:.625rem 1.25rem;background:#fee2e2;border:1px solid #fecaca;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:#dc2626;"><i class="fas fa-flag"></i> Flag</button>`}
    <button onclick="deletePost('${post.id}');document.getElementById('postModal').style.display='none'" style="padding:.625rem 1.25rem;background:#dc2626;color:white;border:none;border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-trash"></i> Delete</button>
    <button onclick="document.getElementById('postModal').style.display='none'" style="padding:.625rem 1.25rem;background:var(--gray-100);border:1px solid var(--gray-300);border-radius:var(--radius-sm);font-size:14px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;">Close</button>`;

  document.getElementById('postModal').style.display = 'flex';
}

// ── SETUP ──
function setupListeners() {
  document.getElementById('closePostModal').addEventListener('click', () => document.getElementById('postModal').style.display = 'none');
  document.getElementById('postModal').addEventListener('click', e => { if (e.target.id === 'postModal') document.getElementById('postModal').style.display = 'none'; });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;

      document.getElementById('tabFlagged').style.display = currentTab === 'flagged' ? 'block' : 'none';
      document.getElementById('tabAll').style.display     = currentTab === 'all'     ? 'block' : 'none';

      if (currentTab === 'flagged') await loadFlagged();
      else await loadAllPosts();
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
