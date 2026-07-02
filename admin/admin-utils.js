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
  like:         { icon: 'fa-heart',    cls: 'ni-like'    },
  comment:      { icon: 'fa-comment',  cls: 'ni-comment' },
  reply:        { icon: 'fa-reply',    cls: 'ni-comment' },
  announcement: { icon: 'fa-bullhorn', cls: 'ni-urgent'  },
  mention:      { icon: 'fa-at',       cls: 'ni-dept'    },
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
      <div id="adminNotifDropdown" hidden style="position:absolute;top:calc(100% + 8px);right:0;width:340px;max-height:400px;background:white;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.15);border:1px solid var(--gray-100);overflow:hidden;z-index:9999;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.875rem 1.25rem;border-bottom:1px solid var(--gray-100);">
          <span style="font-weight:700;font-size:0.9rem;">Notifications</span>
          <a href="#" id="adminMarkAllRead" style="font-size:0.75rem;color:var(--maroon);text-decoration:none;font-weight:600;">Mark all read</a>
        </div>
        <div id="adminNotifList" style="max-height:320px;overflow-y:auto;padding:0.5rem 0;">
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
  document.getElementById('adminNotifToggle').addEventListener('click', (e) => {
    e.stopPropagation();
    const dd = document.getElementById('adminNotifDropdown');
    dd.hidden = !dd.hidden;
    if (!dd.hidden) loadAdminNotifications(adminUserId);
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

      let msg = (n.message || '').replace(/📢\s*\[ANNOUNCEMENT\]\s*/gi, '');

      return `
        <div class="admin-notif-item ${unread}" style="display:flex;gap:0.6rem;padding:0.7rem 1.25rem;border-left:3px solid ${urgencyBorder[urgency] || 'transparent'};cursor:pointer;transition:background .15s;${unread ? 'background:rgba(107,15,26,.03);' : ''}" data-id="${n.id}">
          <div style="width:32px;height:32px;border-radius:50%;background:var(--gray-100);display:flex;align-items:center;justify-content:center;font-size:0.7rem;flex-shrink:0;color:var(--gray-600);">
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

  } catch(e) {
    list.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--gray-400);font-size:0.8rem;">Failed to load</div>';
  }
}
