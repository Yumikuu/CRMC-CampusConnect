// ═══════════════════════════════════════════════════════════════
// ADMIN UTILITIES — Shared helpers for all SSG admin pages
// ═══════════════════════════════════════════════════════════════

// ── TOAST NOTIFICATION ──
// Usage: showToast('User approved!', 'success')
//        showToast('Something went wrong', 'error')
//        showToast('Saving changes...', 'info')
let toastTimer = null;

function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.getElementById('adminToast');
  if (existing) existing.remove();
  clearTimeout(toastTimer);

  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };

  const toast = document.createElement('div');
  toast.id = 'adminToast';
  toast.className = `toast-${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || 'fa-bell'}"></i> ${message}`;
  document.body.appendChild(toast);

  toastTimer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── FORMAT TIME AGO ──
function formatTimeAgo(date) {
  const s = Math.floor((new Date() - date) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── ESCAPE HTML ──
function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// ── LOG ADMIN ACTIVITY ──
// Requires adminUser to be set in the calling page
async function logAdminActivity(adminId, actionType, targetId, targetType, details = {}) {
  try {
    await db.from('admin_activity_logs').insert({
      admin_id: adminId,
      action_type: actionType,
      target_id: targetId,
      target_type: targetType,
      details: { ...details, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    console.warn('Activity log failed (non-critical):', err.message);
  }
}

// ── DEPT SHORT NAME ──
function deptShort(fullDept) {
  return fullDept?.match(/\(([^)]+)\)/)?.[1] || fullDept || '—';
}


// ═══════════════════════════════════════════════════════════════
// ADMIN NOTIFICATION BELL — Shared across all admin pages
// ═══════════════════════════════════════════════════════════════

const ADMIN_NOTIF_ICONS = {
  like:         { icon: 'fa-heart',    color: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  comment:      { icon: 'fa-comment',  color: '#2563eb', bg: 'rgba(59,130,246,.12)' },
  reply:        { icon: 'fa-reply',    color: '#2563eb', bg: 'rgba(59,130,246,.12)' },
  announcement: { icon: 'fa-bullhorn', color: '#dc2626', bg: 'rgba(239,68,68,.1)'  },
  mention:      { icon: 'fa-at',       color: '#6B0F1A', bg: 'rgba(107,15,26,.1)'  },
};

// Inject notification bell into admin topbar
function initAdminNotifications(adminUserId) {
  const topbarRight = document.querySelector('.topbar-right');
  if (!topbarRight || document.getElementById('adminNotifBell')) return;

  // Insert bell before the profile section
  const bellHTML = `
    <div id="adminNotifBell" style="position:relative;margin-right:0.5rem;">
      <button id="adminNotifToggle" style="background:none;border:none;cursor:pointer;padding:0.5rem;border-radius:50%;position:relative;font-size:1.1rem;color:var(--gray-600);transition:all .15s;" aria-label="Notifications">
        <i class="fas fa-bell"></i>
        <span id="adminNotifBadge" style="display:none;position:absolute;top:2px;right:2px;width:17px;height:17px;background:var(--maroon);color:white;font-size:.6rem;font-weight:700;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;">0</span>
      </button>
      <div id="adminNotifDropdown" hidden style="position:fixed;top:60px;right:1rem;width:min(340px, calc(100vw - 2rem));max-height:70vh;background:white;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15);border:1px solid var(--gray-100);overflow:hidden;z-index:9999;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.875rem 1.25rem;border-bottom:1px solid var(--gray-100);">
          <span style="font-weight:700;font-size:0.9rem;">Notifications</span>
          <a href="#" id="adminMarkAllRead" style="font-size:0.75rem;color:var(--maroon);text-decoration:none;font-weight:600;">Mark all read</a>
        </div>
        <div id="adminNotifList" style="max-height:calc(70vh - 60px);overflow-y:auto;padding:0.5rem 0;">
          <div style="text-align:center;padding:2rem;color:var(--gray-400);font-size:0.8rem;">Loading...</div>
        </div>
      </div>
    </div>
  `;

  const profileDiv = topbarRight.querySelector('.admin-profile');
  if (profileDiv) {
    profileDiv.insertAdjacentHTML('beforebegin', bellHTML);
  } else {
    topbarRight.insertAdjacentHTML('afterbegin', bellHTML);
  }

  // Toggle dropdown
  document.getElementById('adminNotifToggle').addEventListener('click', async (e) => {
    e.stopPropagation();
    const dd = document.getElementById('adminNotifDropdown');
    dd.hidden = !dd.hidden;
    if (!dd.hidden) {
      loadAdminNotifications(adminUserId);
      // Mark all as read when opened
      await db.from('notifications').update({ is_read: true }).eq('user_id', adminUserId).eq('is_read', false);
      updateAdminNotifBadge(0);
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#adminNotifBell')) {
      document.getElementById('adminNotifDropdown').hidden = true;
    }
  });

  // Mark all read
  document.getElementById('adminMarkAllRead').addEventListener('click', async (e) => {
    e.preventDefault();
    await db.from('notifications').update({ is_read: true }).eq('user_id', adminUserId).eq('is_read', false);
    document.querySelectorAll('.admin-notif-item.unread').forEach(el => el.classList.remove('unread'));
    updateAdminNotifBadge(0);
  });

  // Load initial count
  loadAdminNotifCount(adminUserId);
}

async function loadAdminNotifCount(userId) {
  try {
    const { count } = await db.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    updateAdminNotifBadge(count || 0);
  } catch(e) {}
}

function updateAdminNotifBadge(count) {
  const badge = document.getElementById('adminNotifBadge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function loadAdminNotifications(userId) {
  const list = document.getElementById('adminNotifList');
  try {
    const { data: notifs } = await db.from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!notifs || notifs.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-400);font-size:0.8rem;"><i class="fas fa-bell-slash" style="font-size:1.2rem;display:block;margin-bottom:0.5rem;"></i>No notifications</div>';
      updateAdminNotifBadge(0);
      return;
    }

    list.innerHTML = notifs.map(n => {
      const typeInfo = ADMIN_NOTIF_ICONS[n.type] || ADMIN_NOTIF_ICONS.mention;
      const timeAgo = formatTimeAgo(new Date(n.created_at));
      const unread = n.is_read ? '' : 'unread';
      const urgency = n.urgency || 'normal';
      const urgencyBorder = { critical: '#dc2626', urgent: '#f59e0b', important: '#3b82f6', normal: 'transparent', low: 'transparent' };

      // Extract post ID from link field
      const postId = n.link ? n.link.split('post=')[1] : null;

      let msg = (n.message || '').replace(/📢\s*\[ANNOUNCEMENT\]\s*/gi, '');

      return `
        <div class="admin-notif-item ${unread}" style="display:flex;gap:0.6rem;padding:0.7rem 1.25rem;border-left:3px solid ${urgencyBorder[urgency] || 'transparent'};cursor:pointer;transition:background .15s;${unread ? 'background:rgba(107,15,26,.03);' : ''}" data-id="${n.id}" ${postId ? `data-post-id="${postId}"` : ''}>
          <div style="width:32px;height:32px;border-radius:50%;background:${typeInfo.bg};display:flex;align-items:center;justify-content:center;font-size:0.7rem;flex-shrink:0;color:${typeInfo.color};">
            <i class="fas ${typeInfo.icon}"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.78rem;color:var(--gray-800);line-height:1.4;">${msg}</div>
            <div style="font-size:0.68rem;color:var(--gray-400);margin-top:2px;">${timeAgo}</div>
          </div>
        </div>`;
    }).join('');

    const unreadCount = notifs.filter(n => !n.is_read).length;
    updateAdminNotifBadge(unreadCount);

    // Click handler for individual notifications
    list.querySelectorAll('.admin-notif-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        const postId = item.dataset.postId;

        // Mark as read
        if (item.classList.contains('unread')) {
          item.classList.remove('unread');
          item.style.background = '';
          await db.from('notifications').update({ is_read: true }).eq('id', id);
          const remaining = list.querySelectorAll('.admin-notif-item.unread').length;
          updateAdminNotifBadge(remaining);
        }

        // Open post preview modal if post ID exists
        if (postId) {
          document.getElementById('adminNotifDropdown').hidden = true;
          openAdminPostPreview(postId);
        }
      });
    });

  } catch(e) {
    list.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:0.8rem;">Failed to load</div>';
  }
}

// ═══════════════════════════════════════════════════════════════
// ADMIN POST PREVIEW MODAL — opened from notification click
// ═══════════════════════════════════════════════════════════════

function ensureAdminPostPreviewModal() {
  if (document.getElementById('adminPostPreviewModal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'adminPostPreviewModal';
  modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;align-items:center;justify-content:center;padding:1rem;';
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;width:min(560px,calc(100vw - 2rem));max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.25rem;border-bottom:1px solid var(--gray-100);">
        <h3 style="font-size:1rem;font-weight:700;color:var(--gray-900);margin:0;">Post Details</h3>
        <button id="closeAdminPostPreview" style="background:none;border:none;cursor:pointer;font-size:1.2rem;color:var(--gray-400);padding:0.25rem;" aria-label="Close">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div id="adminPostPreviewContent" style="padding:1.25rem;">
        <div style="text-align:center;padding:2rem;color:var(--gray-400);"><i class="fas fa-spinner fa-spin"></i> Loading post...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Close handlers
  modal.addEventListener('click', (e) => { if (e.target === modal) closeAdminPostPreview(); });
  document.getElementById('closeAdminPostPreview').addEventListener('click', closeAdminPostPreview);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAdminPostPreview(); });
}

function closeAdminPostPreview() {
  const modal = document.getElementById('adminPostPreviewModal');
  if (modal) { modal.style.display = 'none'; document.body.style.overflow = ''; }
}

async function openAdminPostPreview(postId) {
  ensureAdminPostPreviewModal();
  
  const modal = document.getElementById('adminPostPreviewModal');
  const content = document.getElementById('adminPostPreviewContent');
  
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  content.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-400);"><i class="fas fa-spinner fa-spin"></i> Loading post...</div>';

  try {
    const { data: post, error } = await db
      .from('posts')
      .select('*, profiles:author_id(first_name, last_name, admin_role), communities:community_id(name, slug)')
      .eq('id', postId)
      .single();

    if (error || !post) {
      content.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-400);"><i class="fas fa-exclamation-circle"></i> Post not found or deleted.</div>';
      return;
    }

    // Get real like and comment counts
    const { count: likeCount } = await db.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    const { count: commentCount } = await db.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);

    // Load comments
    const { data: comments } = await db
      .from('comments')
      .select('*, profiles:author_id(first_name, last_name, admin_role)')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })
      .limit(10);

    // Load replies for all comments
    const commentIds = (comments || []).map(c => c.id);
    let replies = [];
    if (commentIds.length > 0) {
      const { data: replyData } = await db
        .from('comments')
        .select('*, profiles:author_id(first_name, last_name, admin_role)')
        .in('parent_id', commentIds)
        .order('created_at', { ascending: true });
      replies = replyData || [];
    }

    const author = post.is_anonymous ? 'Anonymous' : (post.profiles ? `${post.profiles.first_name} ${post.profiles.last_name}` : 'Unknown');
    const initials = post.is_anonymous ? 'A' : (post.profiles ? (post.profiles.first_name[0] + post.profiles.last_name[0]).toUpperCase() : '?');
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    const community = post.communities?.name || 'General';
    const postContent = (post.content || '').replace(/^📢?\s*\[ANNOUNCEMENT\]\s*/i, '');
    const isAdmin = post.profiles?.admin_role && post.profiles.admin_role !== 'student';

    // Images
    const images = Array.isArray(post.image_url) ? post.image_url : (post.image_url ? [post.image_url] : []);
    const imageHtml = images.length ? `
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap;">
        ${images.map(url => `<img src="${url}" style="max-width:200px;max-height:150px;object-fit:cover;border-radius:8px;border:1px solid var(--gray-200);">`).join('')}
      </div>` : '';

    // Comments HTML
    const commentsHtml = (comments && comments.length > 0) ? comments.map(c => {
      const cName = c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Unknown';
      const cInitials = c.profiles ? (c.profiles.first_name[0] + c.profiles.last_name[0]).toUpperCase() : '?';
      const cTime = formatTimeAgo(new Date(c.created_at));
      const isAdminComment = c.profiles?.admin_role && c.profiles.admin_role !== 'student';

      // Get replies for this comment
      const commentReplies = replies.filter(r => r.parent_id === c.id);
      const repliesHtml = commentReplies.map(r => {
        const rName = r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : 'Unknown';
        const rInitials = r.profiles ? (r.profiles.first_name[0] + r.profiles.last_name[0]).toUpperCase() : '?';
        const rTime = formatTimeAgo(new Date(r.created_at));
        const rIsAdmin = r.profiles?.admin_role && r.profiles.admin_role !== 'student';
        return `
          <div style="display:flex;gap:0.5rem;padding:0.4rem 0;margin-left:2rem;border-left:2px solid var(--gray-100);padding-left:0.75rem;">
            <div style="width:24px;height:24px;border-radius:50%;background:${rIsAdmin ? 'var(--maroon)' : 'var(--gray-200)'};color:${rIsAdmin ? 'white' : 'inherit'};display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;flex-shrink:0;">${rInitials}</div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:0.3rem;">
                <span style="font-size:0.72rem;font-weight:600;color:var(--gray-800);">${escapeHtml(rName)}</span>
                ${rIsAdmin ? '<span style="font-size:0.55rem;padding:1px 4px;background:var(--maroon);color:white;border-radius:3px;font-weight:700;">ADMIN</span>' : ''}
                <span style="font-size:0.62rem;color:var(--gray-400);">${rTime}</span>
              </div>
              <div style="font-size:0.75rem;color:var(--gray-700);margin-top:1px;line-height:1.4;">${escapeHtml(r.content)}</div>
            </div>
          </div>`;
      }).join('');

      return `
        <div style="display:flex;gap:0.6rem;padding:0.6rem 0;border-bottom:1px solid var(--gray-50);">
          <div style="width:28px;height:28px;border-radius:50%;background:${isAdminComment ? 'var(--maroon)' : 'var(--gray-200)'};color:${isAdminComment ? 'white' : 'inherit'};display:flex;align-items:center;justify-content:center;font-size:0.6rem;font-weight:700;flex-shrink:0;">${cInitials}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:0.4rem;">
              <span style="font-size:0.78rem;font-weight:600;color:var(--gray-800);">${escapeHtml(cName)}</span>
              ${isAdminComment ? '<span style="font-size:0.55rem;padding:1px 4px;background:var(--maroon);color:white;border-radius:3px;font-weight:700;">ADMIN</span>' : ''}
              <span style="font-size:0.68rem;color:var(--gray-400);">${cTime}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--gray-700);margin-top:2px;line-height:1.4;">${escapeHtml(c.content)}</div>
            <button class="admin-reply-btn" data-comment-id="${c.id}" data-post-id="${postId}" style="background:none;border:none;cursor:pointer;font-size:0.7rem;color:var(--gray-400);margin-top:3px;font-family:Poppins,sans-serif;font-weight:600;">
              <i class="fas fa-reply"></i> Reply
            </button>
            ${repliesHtml}
            <div class="admin-reply-box" data-parent-id="${c.id}" style="display:none;margin-top:0.4rem;">
              <div style="display:flex;gap:0.5rem;align-items:center;">
                <input type="text" class="admin-reply-input" placeholder="Reply..." data-post-id="${postId}" data-parent-id="${c.id}"
                  style="flex:1;padding:0.4rem 0.75rem;border:1px solid var(--gray-200);border-radius:20px;font-size:0.78rem;font-family:Poppins,sans-serif;outline:none;" />
                <button class="admin-reply-send" data-post-id="${postId}" data-parent-id="${c.id}"
                  style="background:var(--maroon);color:white;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.7rem;">
                  <i class="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('') : '<div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:0.78rem;">No comments yet</div>';

    content.innerHTML = `
      <div style="display:flex;gap:0.75rem;align-items:flex-start;">
        <div style="width:42px;height:42px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:0.4rem;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:0.9rem;color:var(--gray-900);">${escapeHtml(author)}</span>
            ${isAdmin ? '<span style="padding:2px 6px;background:var(--maroon);color:white;border-radius:4px;font-size:0.6rem;font-weight:700;">ADMIN</span>' : ''}
            ${post.is_pinned ? '<span style="padding:2px 6px;background:#fef3c7;color:#d97706;border-radius:4px;font-size:0.6rem;font-weight:700;"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
          </div>
          <div style="font-size:0.75rem;color:var(--gray-400);margin-top:2px;">${community} · ${timeAgo}</div>
        </div>
      </div>

      <div style="margin-top:1rem;font-size:0.9rem;color:var(--gray-800);line-height:1.6;white-space:pre-wrap;">${escapeHtml(postContent)}</div>
      ${imageHtml}

      <div style="display:flex;gap:1.5rem;margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--gray-100);font-size:0.8rem;color:var(--gray-500);">
        <span><i class="fas fa-heart" style="color:#ef4444;"></i> ${likeCount || 0} likes</span>
        <span><i class="fas fa-comment" style="color:#3b82f6;"></i> ${commentCount || 0} comments</span>
      </div>

      <div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--gray-100);">
        <div style="font-size:0.82rem;font-weight:700;color:var(--gray-700);margin-bottom:0.5rem;">Comments</div>
        ${commentsHtml}
      </div>

      <div style="margin-top:0.75rem;padding-top:0.75rem;border-top:1px solid var(--gray-100);display:flex;gap:0.5rem;align-items:center;">
        <input type="text" id="adminNewCommentInput" placeholder="Write a comment as admin..." data-post-id="${postId}"
          style="flex:1;padding:0.6rem 1rem;border:1px solid var(--gray-200);border-radius:20px;font-size:0.82rem;font-family:Poppins,sans-serif;outline:none;" />
        <button id="adminNewCommentSend" data-post-id="${postId}"
          style="background:var(--maroon);color:white;border:none;border-radius:50%;width:34px;height:34px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.8rem;flex-shrink:0;">
          <i class="fas fa-paper-plane"></i>
        </button>
      </div>
    `;

    // Wire up comment send button
    document.getElementById('adminNewCommentSend').addEventListener('click', () => submitAdminComment(postId));
    document.getElementById('adminNewCommentInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAdminComment(postId);
    });

    // Wire up reply buttons
    content.querySelectorAll('.admin-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.dataset.commentId;
        const replyBox = content.querySelector(`.admin-reply-box[data-parent-id="${commentId}"]`);
        if (replyBox) {
          replyBox.style.display = replyBox.style.display === 'none' ? 'block' : 'none';
          if (replyBox.style.display === 'block') replyBox.querySelector('input').focus();
        }
      });
    });

    // Wire up reply send buttons
    content.querySelectorAll('.admin-reply-send').forEach(btn => {
      btn.addEventListener('click', () => {
        const parentId = btn.dataset.parentId;
        const pId = btn.dataset.postId;
        submitAdminReply(pId, parentId);
      });
    });

    // Wire up reply inputs (Enter key)
    content.querySelectorAll('.admin-reply-input').forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitAdminReply(input.dataset.postId, input.dataset.parentId);
      });
    });

  } catch (err) {
    console.error('Error loading post preview:', err);
    content.innerHTML = '<div style="text-align:center;padding:2rem;color:#dc2626;"><i class="fas fa-exclamation-triangle"></i> Failed to load post.</div>';
  }
}


// ── Submit admin comment on a post ──
async function submitAdminComment(postId) {
  const input = document.getElementById('adminNewCommentInput');
  const content = input.value.trim();
  if (!content) return;

  const btn = document.getElementById('adminNewCommentSend');
  btn.disabled = true;
  input.disabled = true;

  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;

    const { error } = await db.from('comments').insert({
      post_id: postId,
      author_id: session.user.id,
      content: content,
      parent_id: null,
    });

    if (error) throw error;

    // Increment comment count
    await db.rpc('increment_comment_count', { post_id_input: postId }).catch(() => {
      // Fallback: manual increment
      db.from('posts').select('comment_count').eq('id', postId).single().then(({ data }) => {
        if (data) db.from('posts').update({ comment_count: (data.comment_count || 0) + 1 }).eq('id', postId);
      });
    });

    // Refresh the post preview
    await openAdminPostPreview(postId);
    showToast('Comment posted!', 'success');

  } catch (err) {
    console.error('Comment error:', err);
    showToast('Failed to post comment', 'error');
  } finally {
    btn.disabled = false;
    input.disabled = false;
  }
}

// ── Submit admin reply to a comment ──
async function submitAdminReply(postId, parentId) {
  const input = document.querySelector(`.admin-reply-input[data-parent-id="${parentId}"]`);
  if (!input) return;
  const content = input.value.trim();
  if (!content) return;

  input.disabled = true;

  try {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return;

    const { error } = await db.from('comments').insert({
      post_id: postId,
      author_id: session.user.id,
      content: content,
      parent_id: parentId,
    });

    if (error) throw error;

    // Refresh the post preview
    await openAdminPostPreview(postId);
    showToast('Reply posted!', 'success');

  } catch (err) {
    console.error('Reply error:', err);
    showToast('Failed to post reply', 'error');
  } finally {
    input.disabled = false;
  }
}
