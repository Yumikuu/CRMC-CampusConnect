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
