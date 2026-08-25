// ═══════════════════════════════════════════════════════════════
// ANNOUNCEMENTS PAGE — Module 5: Dedicated Announcements View
// ═══════════════════════════════════════════════════════════════

let currentUser = null;
let currentFilter = 'all';
let allAnnouncements = [];

// ── AUTH GUARD ──
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'landing-page/index.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile) { window.location.href = 'landing-page/index.html'; return; }

  currentUser = profile;
  await Promise.all([loadAnnouncements(), loadEvents(), loadStats()]);
})();

// ── UTILITY: time ago ──
function formatTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ── LOAD ANNOUNCEMENTS ──
async function loadAnnouncements() {
  const annList = document.getElementById('annList');

  try {
    // Get user's department slug
    const deptSlugMap = {
      'college of teacher education (cte)': 'cte',
      'college of business education (cbe)': 'cbe',
      'college of criminal justice education (ccje)': 'ccje',
      'college of Computer Studies (CCS)': 'css',
      'psychology (psych)': 'psych',
    };
    const userDeptSlug = deptSlugMap[(currentUser.department || '').toLowerCase().trim()];

    // Fetch communities we care about: ssg-announcements + department communities
    const { data: communities } = await db
      .from('communities')
      .select('id, slug, name, type, department')
      .or('slug.eq.ssg-announcements,type.eq.department');

    if (!communities || communities.length === 0) {
      annList.innerHTML = '<div class="ann-empty"><i class="fas fa-bullhorn"></i><p>No announcements yet.</p></div>';
      return;
    }

    const commIds = communities.map(c => c.id);
    const commMap = {};
    communities.forEach(c => { commMap[c.id] = c; });

    // Fetch posts that are either:
    // 1. In ssg-announcements (any post)
    // 2. Pinned posts in department communities
    // 3. Posts starting with 📢 [ANNOUNCEMENT]
    const { data: posts, error } = await db
      .from('posts')
      .select(`
        id, title, content, created_at, is_pinned, like_count, comment_count,
        community_id, image_url,
        profiles:author_id (first_name, last_name, admin_role, avatar_url)
      `)
      .in('community_id', commIds)
      .eq('moderation_status', 'approved')
      .eq('is_flagged', false)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Filter to only actual announcements
    allAnnouncements = (posts || []).filter(p => {
      const comm = commMap[p.community_id];
      if (!comm) return false;
      // SSG announcements community: all posts are announcements
      if (comm.slug === 'ssg-announcements') return true;
      // Pinned dept posts = dept announcements
      if (comm.type === 'department' && p.is_pinned) return true;
      // Posts with announcement prefix
      if (p.content?.startsWith('📢 [ANNOUNCEMENT]')) return true;
      return false;
    }).map(p => {
      const comm = commMap[p.community_id];
      return { ...p, community: comm };
    });

    renderAnnouncements();

  } catch (err) {
    console.error('Error loading announcements:', err);
    annList.innerHTML = '<div class="ann-empty"><i class="fas fa-exclamation-circle"></i><p>Failed to load announcements.</p></div>';
  }
}

// ── RENDER ANNOUNCEMENTS ──
function renderAnnouncements() {
  const annList = document.getElementById('annList');
  const userDeptSlug = getUserDeptSlug();

  // Apply filter
  let filtered = allAnnouncements;
  if (currentFilter === 'official') {
    filtered = allAnnouncements.filter(p => p.community?.slug === 'ssg-announcements');
  } else if (currentFilter === 'department') {
    filtered = allAnnouncements.filter(p => p.community?.slug === userDeptSlug);
  } else if (currentFilter === 'events') {
    // Events are posts with event-related keywords or from campus events community
    filtered = allAnnouncements.filter(p => {
      const text = (p.title || '') + ' ' + (p.content || '');
      return /event|foundation|summit|seminar|workshop|ceremony|activity/i.test(text);
    });
  }

  if (filtered.length === 0) {
    const emptyMessages = {
      all: 'No announcements yet.',
      official: 'No official SSG announcements yet.',
      department: 'No announcements from your department yet.',
      events: 'No event announcements found.',
    };
    annList.innerHTML = `<div class="ann-empty"><i class="fas fa-bullhorn"></i><p>${emptyMessages[currentFilter]}</p></div>`;
    return;
  }

  annList.innerHTML = filtered.map(post => {
    const author = post.profiles;
    const authorName = author ? `${author.first_name} ${author.last_name}` : 'Admin';
    const initials = author ? (author.first_name[0] + author.last_name[0]).toUpperCase() : 'A';
    const timeAgo = formatTimeAgo(new Date(post.created_at));
    const comm = post.community;

    // Clean content
    let content = (post.content || '').replace(/^📢\s*\[ANNOUNCEMENT\]\s*/i, '');
    const title = post.title || content.substring(0, 60) + (content.length > 60 ? '…' : '');
    const preview = content.length > 200 ? content.substring(0, 200) + '…' : content;

    // Determine tag
    let tagLabel = 'Official';
    let tagClass = 'ann-tag-official';
    if (comm?.slug === 'ssg-announcements') {
      tagLabel = 'Official';
      tagClass = 'ann-tag-official';
    } else if (comm?.type === 'department') {
      tagLabel = (comm.department || comm.slug || '').toUpperCase();
      tagClass = 'ann-tag-dept';
    }
    if (post.is_pinned) {
      tagLabel = '📌 Pinned';
      tagClass = 'ann-tag-pinned';
    }

    // Avatar
    const avatarHTML = author?.avatar_url
      ? `<img src="${author.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${authorName}" />`
      : initials;

    const cardClass = post.is_pinned ? 'ann-card ann-card--pinned' : 'ann-card';

    return `
      <article class="${cardClass}" data-post-id="${post.id}">
        <div class="ann-card-header">
          <div class="ann-card-avatar">${avatarHTML}</div>
          <div class="ann-card-meta">
            <div class="ann-card-author">${escapeHtml(authorName)}</div>
            <div class="ann-card-info">
              <span class="ann-card-tag ${tagClass}">${tagLabel}</span>
              <span>${comm?.name || 'Announcement'}</span>
              <span>·</span>
              <span>${timeAgo}</span>
            </div>
          </div>
        </div>
        ${post.title ? `<div class="ann-card-title">${escapeHtml(post.title)}</div>` : ''}
        <div class="ann-card-content">${escapeHtml(preview)}</div>
        <div class="ann-card-footer">
          <span class="ann-card-stat"><i class="fas fa-heart"></i> ${post.like_count || 0}</span>
          <span class="ann-card-stat"><i class="fas fa-comment"></i> ${post.comment_count || 0}</span>
        </div>
      </article>`;
  }).join('');

  // Click on card → go to post in feed
  annList.querySelectorAll('.ann-card').forEach(card => {
    card.addEventListener('click', () => {
      const postId = card.dataset.postId;
      window.location.href = `campusfeed.html?post=${postId}`;
    });
  });
}

function getUserDeptSlug() {
  const deptSlugMap = {
    'college of teacher education (cte)': 'cte',
    'college of business education (cbe)': 'cbe',
    'college of criminal justice education (ccje)': 'ccje',
    'college of Computer Studies (CCS)': 'css',
    'psychology (psych)': 'psych',
  };
  return deptSlugMap[(currentUser?.department || '').toLowerCase().trim()] || '';
}

// ── FILTER TABS ──
document.querySelectorAll('.ann-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.ann-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderAnnouncements();
  });
});

// ── LOAD EVENTS ──
async function loadEvents() {
  const eventsList = document.getElementById('annEventsList');

  try {
    const { data: events, error } = await db
      .from('campus_events')
      .select('*')
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(5);

    if (error) throw error;

    if (!events || events.length === 0) {
      eventsList.innerHTML = '<div style="text-align:center;padding:1rem;font-size:.78rem;color:var(--gray-400);">No upcoming events.</div>';
      return;
    }

    eventsList.innerHTML = events.map(ev => {
      const d = new Date(ev.event_date);
      const day = d.getDate();
      const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      return `
        <div class="ann-event-item">
          <div class="ann-event-date-box">
            <span class="ann-event-day">${day}</span>
            <span class="ann-event-month">${mon}</span>
          </div>
          <div class="ann-event-info">
            <div class="ann-event-name">${escapeHtml(ev.title)}</div>
            <div class="ann-event-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ev.location || 'CRMC Campus')}</div>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Error loading events:', err);
    eventsList.innerHTML = '<div style="text-align:center;padding:1rem;font-size:.78rem;color:var(--gray-400);">Could not load events.</div>';
  }
}

// ── LOAD STATS ──
async function loadStats() {
  try {
    // Get announcement community IDs
    const { data: communities } = await db
      .from('communities')
      .select('id, slug, type')
      .or('slug.eq.ssg-announcements,type.eq.department');

    const commIds = (communities || []).map(c => c.id);

    // Total announcements (pinned posts + ssg-announcements posts)
    const { count: totalCount } = await db
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .in('community_id', commIds)
      .eq('is_flagged', false);

    document.getElementById('statTotalAnn').textContent = totalCount || 0;

    // This week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: weekCount } = await db
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .in('community_id', commIds)
      .eq('is_flagged', false)
      .gte('created_at', weekAgo);

    document.getElementById('statWeekAnn').textContent = weekCount || 0;

    // Upcoming events
    const { count: eventCount } = await db
      .from('campus_events')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString().split('T')[0]);

    document.getElementById('statEvents').textContent = eventCount || 0;

  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

