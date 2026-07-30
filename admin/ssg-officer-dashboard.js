// ═══════════════════════════════════════════════════════════════
// SSG OFFICER DASHBOARD
// Scoped to ssg-announcements community only
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let ssgCommunityId = null;
let selectedImages = [];

// ── AUTH GUARD ──
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile, error } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (error || !profile) { window.location.href = 'login.html'; return; }

  // Only SSG_OFFICER can access this dashboard
  if (profile.admin_role !== 'SSG_OFFICER') {
    if (profile.admin_role === 'SSG') {
      window.location.href = 'main-dashboard.html';
    } else if (['CTE','CSS','CBE','PSYCH','CCJE'].includes(profile.admin_role)) {
      window.location.href = 'dept-dashboard.html';
    } else {
      window.location.href = '../campusfeed.html';
    }
    return;
  }

  adminUser = profile;
  initAdminNotifications(profile.id);

  // Get SSG announcements community ID
  const { data: community } = await db
    .from('communities')
    .select('id, name')
    .eq('slug', 'ssg-announcements')
    .single();

  if (community) ssgCommunityId = community.id;

  // Update UI
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminName').textContent   = `${profile.first_name} ${profile.last_name}`;

  await loadStats();
  await loadRecentPosts();
  await loadRecentComments();
  setupListeners();
})();

// ── STATS ──
async function loadStats() {
  if (!ssgCommunityId) return;

  const [pc, pin, fc] = await Promise.all([
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommunityId),
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommunityId).eq('is_pinned', true),
    db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', ssgCommunityId).eq('is_flagged', true),
  ]);

  document.getElementById('totalAnnouncements').textContent = pc.count || 0;
  document.getElementById('pinnedPosts').textContent        = pin.count || 0;
  document.getElementById('flaggedPosts').textContent       = fc.count || 0;

  // Comment count
  if (pc.count > 0) {
    const { data: posts } = await db.from('posts').select('id').eq('community_id', ssgCommunityId);
    if (posts?.length) {
      const { count: cc } = await db.from('comments').select('*', { count: 'exact', head: true }).in('post_id', posts.map(p => p.id));
      document.getElementById('totalComments').textContent = cc || 0;
    }
  } else {
    document.getElementById('totalComments').textContent = 0;
  }
}

// ── RECENT POSTS ──
async function loadRecentPosts() {
  const container = document.getElementById('recentPosts');
  if (!ssgCommunityId) {
    container.innerHTML = '<div class="loading">SSG community not found. Please run add-ssg-officer-role.sql in Supabase.</div>';
    return;
  }

  const { data: posts, error } = await db
    .from('posts')
    .select('*')
    .eq('community_id', ssgCommunityId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !posts?.length) {
    container.innerHTML = '<div class="loading">No announcements yet. Create your first one!</div>';
    return;
  }

  container.innerHTML = posts.map(post => {
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    const text    = post.title || post.content.substring(0, 60) + '...';
    return `
      <div class="activity-item">
        <div class="activity-avatar" style="background:linear-gradient(135deg,#b7950b,#d4ac0d);">SSG</div>
        <div class="activity-content">
          <div class="activity-title">
            ${escapeHtml(text)}
            ${post.is_pinned ? '<span style="font-size:11px;background:#fef3c7;color:#d97706;padding:2px 6px;border-radius:9999px;margin-left:4px;"><i class="fas fa-thumbtack"></i> Pinned</span>' : ''}
          </div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      </div>`;
  }).join('');
}

// ── RECENT COMMENTS ──
async function loadRecentComments() {
  const container = document.getElementById('recentComments');
  if (!ssgCommunityId) { container.innerHTML = '<div class="loading">-</div>'; return; }

  const { data: posts } = await db.from('posts').select('id').eq('community_id', ssgCommunityId);
  if (!posts?.length) { container.innerHTML = '<div class="loading">No comments yet.</div>'; return; }

  const { data: comments } = await db
    .from('comments')
    .select('*, profiles:author_id(first_name, last_name)')
    .in('post_id', posts.map(p => p.id))
    .order('created_at', { ascending: false })
    .limit(5);

  if (!comments?.length) { container.innerHTML = '<div class="loading">No comments yet.</div>'; return; }

  container.innerHTML = comments.map(c => {
    const name    = c.is_anonymous ? 'Anonymous' : (c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Unknown');
    const initials = c.is_anonymous ? 'A' : (c.profiles ? (c.profiles.first_name[0] + c.profiles.last_name[0]).toUpperCase() : '?');
    const timeAgo = formatTimeAgo(new Date(c.created_at));
    return `
      <div class="activity-item">
        <div class="activity-avatar">${initials}</div>
        <div class="activity-content">
          <div class="activity-title">${escapeHtml(name)}</div>
          <div class="activity-text">${escapeHtml(c.content)}</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
      </div>`;
  }).join('');
}

// ── CREATE POST ──
async function submitPost() {
  const content = document.getElementById('postContent').value.trim();
  const title   = document.getElementById('postTitle')?.value.trim();
  if (!content) { showToast('Please write something first.', 'error'); return; }
  if (!ssgCommunityId) { showToast('SSG community not found.', 'error'); return; }

  const btn = document.getElementById('submitPostBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Publishing...';
  btn.disabled = true;

  try {
    let imageUrls = [];
    if (selectedImages.length > 0) {
      for (const file of selectedImages) {
        const fileName = `ssg-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop()}`;
        const { data: uploadData, error: uploadErr } = await db.storage
          .from('post-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });
        if (!uploadErr) {
          const { data: { publicUrl } } = db.storage.from('post-images').getPublicUrl(fileName);
          imageUrls.push(publicUrl);
        }
      }
    }

    const { error } = await db.from('posts').insert({
      community_id:      ssgCommunityId,
      author_id:         adminUser.id,
      title:             title || null,
      content:           content,
      is_anonymous:      false,
      is_pinned:         document.getElementById('pinPost').checked,
      image_url:         imageUrls.length > 0 ? imageUrls : null,
      moderation_status: 'approved', // SSG posts are pre-approved
    });

    if (error) throw error;

    showToast('Announcement published!', 'success');
    document.getElementById('createPostModal').style.display = 'none';
    document.getElementById('postContent').value = '';
    if (document.getElementById('postTitle')) document.getElementById('postTitle').value = '';
    document.getElementById('pinPost').checked = false;
    document.getElementById('imagePreviewRow').innerHTML = '';
    selectedImages = [];

    await loadStats();
    await loadRecentPosts();

  } catch (err) {
    console.error('Post error:', err);
    showToast('Failed to publish: ' + err.message, 'error');
  } finally {
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish';
    btn.disabled = false;
  }
}

// ── IMAGE HANDLING ──
function handleImageSelect(e) {
  const files = Array.from(e.target.files);
  const remaining = 5 - selectedImages.length;
  files.slice(0, remaining).forEach(file => {
    selectedImages.push(file);
    const reader = new FileReader();
    reader.onload = ev => {
      const preview = document.getElementById('imagePreviewRow');
      const div = document.createElement('div');
      div.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0;';
      div.innerHTML = `
        <img src="${ev.target.result}" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:2px solid var(--gray-200);" />
        <button onclick="removeImage(${selectedImages.length - 1}, this.parentNode)"
          style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#dc2626;color:white;border:none;cursor:pointer;font-size:10px;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-times"></i>
        </button>`;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
}

function removeImage(index, el) {
  selectedImages.splice(index, 1);
  el.remove();
}

// ── EVENT LISTENERS ──
function setupListeners() {
  document.getElementById('createPostBtn').addEventListener('click', () => {
    document.getElementById('createPostModal').style.display = 'flex';
  });
  document.getElementById('postImages').addEventListener('change', handleImageSelect);
  document.getElementById('createPostModal').addEventListener('click', e => {
    if (e.target.id === 'createPostModal') document.getElementById('createPostModal').style.display = 'none';
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

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:2rem;right:2rem;background:${type === 'success' ? '#22c55e' : '#dc2626'};color:white;padding:1rem 1.5rem;border-radius:.5rem;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10000;font-weight:500;font-family:Poppins,sans-serif;`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity .3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'login.html';
});


// ── EVENTS ──
async function loadEvents() {
  const container = document.getElementById('eventsList');
  if (!container) return;

  const { data: events, error } = await db
    .from('campus_events')
    .select('*')
    .eq('is_active', true)
    .order('event_date', { ascending: true })
    .limit(10);

  if (error || !events?.length) {
    container.innerHTML = '<div class="loading">No upcoming events. Add one!</div>';
    return;
  }

  container.innerHTML = events.map(ev => {
    const d    = new Date(ev.event_date);
    const day  = d.getDate();
    const mon  = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const isPast = d < new Date();
    return `
      <div class="activity-item" style="align-items:center;">
        <div style="min-width:48px;text-align:center;background:${isPast ? 'var(--gray-100)' : 'rgba(107,15,26,.08)'};border-radius:8px;padding:6px;margin-right:.5rem;">
          <div style="font-size:1.1rem;font-weight:800;color:${isPast ? 'var(--gray-400)' : 'var(--maroon)'};">${day}</div>
          <div style="font-size:.65rem;font-weight:700;color:${isPast ? 'var(--gray-400)' : 'var(--maroon)'};">${mon}</div>
        </div>
        <div class="activity-content" style="flex:1;">
          <div class="activity-title" style="${isPast ? 'color:var(--gray-400);' : ''}">${escapeHtml(ev.title)}</div>
          ${ev.location ? `<div class="activity-text"><i class="fas fa-map-marker-alt" style="color:var(--gray-400);margin-right:4px;"></i>${escapeHtml(ev.location)}</div>` : ''}
        </div>
        <button onclick="deleteEvent('${ev.id}')" style="background:none;border:none;color:var(--gray-300);cursor:pointer;font-size:.85rem;padding:.25rem .5rem;" title="Remove event">
          <i class="fas fa-trash"></i>
        </button>
      </div>`;
  }).join('');
}

async function submitEvent() {
  const title       = document.getElementById('eventTitle').value.trim();
  const date        = document.getElementById('eventDate').value;
  const location    = document.getElementById('eventLocation').value.trim();
  const description = document.getElementById('eventDescription').value.trim();

  if (!title || !date) { showToast('Title and date are required', 'error'); return; }

  const btn = document.getElementById('submitEventBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

  try {
    const { error } = await db.from('campus_events').insert({
      title,
      event_date:  date,
      location:    location || null,
      description: description || null,
      created_by:  adminUser.id,
      is_active:   true
    });

    if (error) throw error;

    showToast('Event added!', 'success');
    document.getElementById('addEventModal').style.display = 'none';
    document.getElementById('eventTitle').value       = '';
    document.getElementById('eventDate').value        = '';
    document.getElementById('eventLocation').value    = '';
    document.getElementById('eventDescription').value = '';
    await loadEvents();

  } catch (err) {
    showToast('Failed to add event: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plus"></i> Add Event';
  }
}

async function deleteEvent(eventId) {
  if (!confirm('Remove this event?')) return;
  const { error } = await db.from('campus_events').update({ is_active: false }).eq('id', eventId);
  if (error) { showToast('Failed to remove event', 'error'); return; }
  showToast('Event removed', 'success');
  await loadEvents();
}

// Load events on page load
document.getElementById('addEventBtn')?.addEventListener('click', () => {
  document.getElementById('addEventModal').style.display = 'flex';
});

// Call loadEvents after auth
setTimeout(() => { if (adminUser) loadEvents(); }, 500);
