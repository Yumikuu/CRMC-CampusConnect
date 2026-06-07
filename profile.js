// ═══════════════════════════════════════════════════════════════
// PROFILE PAGE
// Works for own profile (?me) or another user (?id=UUID)
// ═══════════════════════════════════════════════════════════════

let loggedInUser = null;
let profileUser  = null;

(async () => {
  // Auth check
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'landing-page/index.html'; return; }

  // Load logged-in user
  const { data: me } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!me) { window.location.href = 'landing-page/index.html'; return; }
  loggedInUser = me;

  // Determine which profile to show
  const params   = new URLSearchParams(window.location.search);
  const targetId = params.get('id') || me.id;
  const isOwnProfile = targetId === me.id;

  // Load target profile
  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', targetId)
    .single();

  if (error || !profile) {
    document.getElementById('profileHeaderCard').innerHTML =
      '<div class="profile-header-loading">User not found.</div>';
    return;
  }

  profileUser = profile;
  document.title = `${profile.first_name} ${profile.last_name} — CRMC CampusConnect`;

  renderProfileHeader(profile, isOwnProfile);
  await loadProfilePosts(profile, isOwnProfile);
})();

function renderProfileHeader(profile, isOwn) {
  const initials  = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName  = `${profile.first_name} ${profile.last_name}`;
  const deptShort = profile.department?.match(/\(([^)]+)\)/)?.[1] || profile.department || '';
  const joined    = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  document.getElementById('profileHeaderCard').innerHTML = `
    <div class="profile-cover">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar-large">${initials}</div>
      </div>
    </div>
    <div class="profile-info">
      <div class="profile-name">${escapeHtml(fullName)}</div>
      <div class="profile-dept-badge"><i class="fas fa-graduation-cap" style="margin-right:4px;"></i>${escapeHtml(deptShort)}</div>
      <div class="profile-meta-row">
        <div class="profile-meta-item">
          <i class="fas fa-id-card"></i>
          <span>${escapeHtml(profile.student_id)}</span>
        </div>
        <div class="profile-meta-item">
          <i class="fas fa-calendar-alt"></i>
          <span>Joined ${joined}</span>
        </div>
        ${profile.email && isOwn ? `
        <div class="profile-meta-item">
          <i class="fas fa-envelope"></i>
          <span>${escapeHtml(profile.email)}</span>
        </div>` : ''}
      </div>
      ${profile.bio ? `<div class="profile-bio">${escapeHtml(profile.bio)}</div>` : ''}
      ${isOwn ? `<div class="profile-own-badge"><i class="fas fa-user-circle"></i> Your Profile</div>` : ''}
    </div>
    <div class="profile-stats-row" id="profileStatsRow">
      <div class="profile-stat">
        <div class="profile-stat-value" id="statPosts">-</div>
        <div class="profile-stat-label">Posts</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value" id="statLikes">-</div>
        <div class="profile-stat-label">Likes Received</div>
      </div>
      <div class="profile-stat">
        <div class="profile-stat-value" id="statComments">-</div>
        <div class="profile-stat-label">Comments</div>
      </div>
    </div>`;
}

async function loadProfilePosts(profile, isOwn) {
  const feed = document.getElementById('profilePostsFeed');
  const title = document.getElementById('profilePostsTitle');
  const countEl = document.getElementById('profilePostsCount');

  title.textContent = isOwn ? 'Your Posts' : `${profile.first_name}'s Posts`;

  try {
    // Fetch posts — if own profile show all including anonymous, otherwise hide anonymous
    let query = db
      .from('posts')
      .select(`
        *,
        communities:community_id (name, slug)
      `)
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!isOwn) {
      query = query.eq('is_anonymous', false);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    // Load stats
    const [likesRes, commentsRes] = await Promise.all([
      db.from('post_likes').select('id', { count: 'exact', head: true })
        .in('post_id', posts?.map(p => p.id) || []),
      db.from('comments').select('id', { count: 'exact', head: true })
        .eq('author_id', profile.id)
    ]);

    document.getElementById('statPosts').textContent    = posts?.length || 0;
    document.getElementById('statLikes').textContent    = likesRes.count || 0;
    document.getElementById('statComments').textContent = commentsRes.count || 0;

    countEl.textContent = `${posts?.length || 0} post${posts?.length !== 1 ? 's' : ''}`;

    if (!posts || posts.length === 0) {
      feed.innerHTML = `
        <div class="profile-no-posts">
          <i class="fas fa-newspaper"></i>
          ${isOwn ? "You haven't posted anything yet." : `${profile.first_name} hasn't posted anything yet.`}
        </div>`;
      return;
    }

    feed.innerHTML = posts.map(post => {
      const isAnon    = post.is_anonymous;
      const commName  = post.communities?.name || 'General';
      const timeAgo   = formatTimeAgo(new Date(post.created_at));
      const preview   = post.content.length > 180
        ? post.content.substring(0, 180) + '…'
        : post.content;

      return `
        <div class="profile-post-card" data-post-id="${post.id}" style="cursor:pointer;">
          <div class="profile-post-meta">
            <span class="profile-post-comm"><i class="fas fa-layer-group" style="margin-right:3px;font-size:.65rem;"></i>${escapeHtml(commName)}</span>
            ${isAnon ? '<span class="profile-post-anon"><i class="fas fa-user-secret"></i> Anonymous</span>' : ''}
            <span class="profile-post-time"><i class="fas fa-clock" style="margin-right:3px;"></i>${timeAgo}</span>
          </div>
          ${post.title ? `<div class="profile-post-title">${escapeHtml(post.title)}</div>` : ''}
          <div class="profile-post-content">${escapeHtml(preview)}</div>
          ${post.image_url && Array.isArray(post.image_url) && post.image_url.length > 0 ? `
            <div style="margin-top:.5rem;">
              <img src="${post.image_url[0]}" style="max-height:120px;border-radius:8px;object-fit:cover;" alt="Post image" />
              ${post.image_url.length > 1 ? `<span style="font-size:.72rem;color:var(--gray-400);margin-left:.4rem;">+${post.image_url.length - 1} more</span>` : ''}
            </div>` : ''}
          <div class="profile-post-actions">
            <span class="profile-post-action"><i class="fas fa-heart"></i> ${post.like_count || 0}</span>
            <span class="profile-post-action"><i class="fas fa-comment"></i> ${post.comment_count || 0}</span>
          </div>
        </div>`;
    }).join('');

    // Click post → go to campusfeed and highlight it
    feed.querySelectorAll('.profile-post-card').forEach(card => {
      card.addEventListener('click', () => {
        const postId = card.dataset.postId;
        window.location.href = `campusfeed.html?highlight=${postId}`;
      });
    });

  } catch (err) {
    console.error('Error loading profile posts:', err);
    feed.innerHTML = '<div class="profile-posts-loading">Failed to load posts.</div>';
  }
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
