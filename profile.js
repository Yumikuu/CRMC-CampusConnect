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

  const avatarHTML = profile.avatar_url
    ? `<img src="${profile.avatar_url}" alt="${escapeHtml(fullName)}" class="profile-avatar-large profile-avatar-img" />`
    : `<div class="profile-avatar-large">${initials}</div>`;

  document.getElementById('profileHeaderCard').innerHTML = `
    <div class="profile-cover">
      <div class="profile-avatar-wrap">
        ${avatarHTML}
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
      ${profile.bio ? `<div class="profile-bio">${escapeHtml(profile.bio)}</div>` : `${isOwn ? '<div class="profile-bio" style="color:var(--gray-300);font-style:italic;">No bio yet. Click Edit Profile to add one.</div>' : ''}`}
      ${isOwn ? `
        <div style="margin-top:.75rem;">
          <button class="profile-edit-btn" id="editProfileBtn">
            <i class="fas fa-pen"></i> Edit Profile
          </button>
        </div>` : ''}
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
      const isAnon   = post.is_anonymous;
      const commName = post.communities?.name || 'General';
      const timeAgo  = formatTimeAgo(new Date(post.created_at));
      const content  = (post.content || '').replace(/^📢\s*\[ANNOUNCEMENT\]\s*/i, '');
      const preview  = content.length > 200 ? content.substring(0, 200) + '…' : content;
      const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();

      const avatarHTML = isAnon
        ? `<div class="post-avatar" style="background:var(--gray-500)"><i class="fas fa-user-secret"></i></div>`
        : profile.avatar_url
          ? `<img src="${profile.avatar_url}" class="post-avatar" style="object-fit:cover;" alt="${escapeHtml(profile.first_name)}" />`
          : `<div class="post-avatar">${initials}</div>`;

      const authorName = isAnon ? 'Anonymous' : `${profile.first_name} ${profile.last_name}`;

      // Image grid
      let imageHTML = '';
      if (post.image_url && Array.isArray(post.image_url) && post.image_url.length > 0) {
        const imgs = post.image_url.slice(0, 4);
        imageHTML = `<div class="post-images-grid" style="margin-top:.75rem;">
          ${imgs.map((url, i) => `
            <div class="post-image-item">
              <img src="${url}" alt="Post image" loading="lazy" style="border-radius:8px;" />
              ${i === 3 && post.image_url.length > 4 ? `<div class="img-more-overlay">+${post.image_url.length - 4}</div>` : ''}
            </div>`).join('')}
        </div>`;
      } else if (post.image_url && typeof post.image_url === 'string') {
        imageHTML = `<div class="post-image" style="margin-top:.75rem;">
          <img src="${post.image_url}" alt="Post image" loading="lazy" style="border-radius:8px;max-height:300px;width:100%;object-fit:cover;" />
        </div>`;
      }

      return `
        <div class="post-card profile-post-card" data-post-id="${post.id}" style="cursor:pointer;margin-bottom:1rem;">
          <div class="post-header">
            <div class="post-author">
              ${avatarHTML}
              <div>
                <div class="post-author-name">${escapeHtml(authorName)}</div>
                <div class="post-author-meta">
                  <span class="post-comm-tag">${escapeHtml(commName)}</span>
                  <span style="color:var(--gray-400);font-size:.72rem;">· ${timeAgo}</span>
                </div>
              </div>
            </div>
          </div>
          ${post.title ? `<h3 class="post-title" style="font-size:1rem;margin:.5rem 0 .25rem;">${escapeHtml(post.title)}</h3>` : ''}
          ${preview ? `<p class="post-content">${escapeHtml(preview)}</p>` : ''}
          ${imageHTML}
          <div class="post-actions" style="margin-top:.75rem;border-top:1px solid var(--gray-100);padding-top:.5rem;">
            <button class="post-action-btn" style="pointer-events:none;">
              <i class="fas fa-heart"></i> <span>${post.like_count || 0}</span>
            </button>
            <button class="post-action-btn" style="pointer-events:none;">
              <i class="fas fa-comment"></i> <span>${post.comment_count || 0}</span>
            </button>
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

// ── EDIT PROFILE ──
let selectedAvatarFile = null;
let removeAvatar = false;

function openEditModal(profile) {
  const modal = document.getElementById('editProfileModal');
  selectedAvatarFile = null;
  removeAvatar = false;

  // Set bio
  document.getElementById('editBio').value = profile.bio || '';
  document.getElementById('bioCharCount').textContent = (profile.bio || '').length;

  // Set avatar preview
  renderEditAvatarPreview(profile);
  document.getElementById('removeAvatarBtn').style.display = profile.avatar_url ? '' : 'none';

  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  document.getElementById('editBio').focus();
}

function renderEditAvatarPreview(profile) {
  const preview = document.getElementById('editAvatarPreview');
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();

  if (profile.avatar_url) {
    preview.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" class="edit-avatar-img" />`;
  } else {
    preview.innerHTML = `<div class="edit-avatar-initials">${initials}</div>`;
  }
}

// Handle avatar file selection — show preview immediately
document.getElementById('avatarFileInput')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    showProfileToast('Please select an image file', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showProfileToast('Image must be under 2MB', 'error');
    return;
  }

  selectedAvatarFile = file;
  removeAvatar = false;
  document.getElementById('removeAvatarBtn').style.display = '';

  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('editAvatarPreview').innerHTML =
      `<img src="${ev.target.result}" alt="Preview" class="edit-avatar-img" />`;
  };
  reader.readAsDataURL(file);

  // Reset input so same file can be re-selected
  e.target.value = '';
});

// Remove avatar button
document.getElementById('removeAvatarBtn')?.addEventListener('click', () => {
  selectedAvatarFile = null;
  removeAvatar = true;
  document.getElementById('removeAvatarBtn').style.display = 'none';
  const initials = (profileUser.first_name[0] + profileUser.last_name[0]).toUpperCase();
  document.getElementById('editAvatarPreview').innerHTML =
    `<div class="edit-avatar-initials">${initials}</div>`;
});

function closeEditModal() {
  document.getElementById('editProfileModal').hidden = true;
  document.body.style.overflow = '';
}

// Bio character counter
document.getElementById('editBio')?.addEventListener('input', function() {
  const len = this.value.length;
  if (len > 150) this.value = this.value.substring(0, 150);
  document.getElementById('bioCharCount').textContent = Math.min(len, 150);
});

// Open modal when Edit Profile button is clicked (uses event delegation since button is rendered dynamically)
document.addEventListener('click', (e) => {
  if (e.target.closest('#editProfileBtn')) {
    openEditModal(profileUser);
  }
});

document.getElementById('closeEditProfile')?.addEventListener('click', closeEditModal);
document.getElementById('cancelEditProfile')?.addEventListener('click', closeEditModal);
document.getElementById('editProfileModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('editProfileModal')) closeEditModal();
});

document.getElementById('saveEditProfile')?.addEventListener('click', async () => {
  const bio = document.getElementById('editBio').value.trim();
  const btn = document.getElementById('saveEditProfile');

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    let avatarUrl = profileUser.avatar_url || null;

    // Handle avatar upload
    if (selectedAvatarFile) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading photo...';
      const ext      = selectedAvatarFile.name.split('.').pop();
      const fileName = `${loggedInUser.id}/avatar.${ext}`;

      const { error: uploadError } = await db.storage
        .from('avatars')
        .upload(fileName, selectedAvatarFile, { upsert: true, cacheControl: '3600' });

      if (uploadError) throw uploadError;

      const { data: urlData } = db.storage.from('avatars').getPublicUrl(fileName);
      avatarUrl = urlData.publicUrl + '?t=' + Date.now(); // cache bust
    } else if (removeAvatar) {
      avatarUrl = null;
    }

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const { error } = await db
      .from('profiles')
      .update({
        bio:        bio || null,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', loggedInUser.id);

    if (error) throw error;

    // Update local state
    profileUser.bio        = bio;
    profileUser.avatar_url = avatarUrl;
    loggedInUser.bio       = bio;
    loggedInUser.avatar_url = avatarUrl;

    // Re-render header
    renderProfileHeader(profileUser, true);

    closeEditModal();
    showProfileToast('Profile updated!', 'success');

  } catch (err) {
    console.error('Error updating profile:', err);
    showProfileToast('Failed to save: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Save Changes';
  }
});

function showProfileToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:2rem;right:2rem;
    background:${type === 'success' ? '#22c55e' : '#dc2626'};
    color:white;padding:1rem 1.5rem;border-radius:.5rem;
    box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10000;
    font-weight:500;font-family:'Poppins',sans-serif;font-size:.85rem;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
