// ── DEPARTMENT CONFIG ──
const DEPT_CONFIG = {
  cte: {
    name:    'CTE Community',
    label:   'CTE Student',
    img:     'Images/CTE.png',
    imgAlt:  'CTE',
    title:   'CTE Community',
    sub:     'College of Teacher Education',
    iconClass: 'ci-cte',
  },
  cbe: {
    name:    'CBE Community',
    label:   'CBE Student',
    img:     'Images/CBE.png',
    imgAlt:  'CBE',
    title:   'CBE Community',
    sub:     'College of Business Education',
    iconClass: 'ci-cbe',
  },
  ccje: {
    name:    'CCJE Community',
    label:   'CCJE Student',
    img:     'Images/CCJE.png',
    imgAlt:  'CCJE',
    title:   'CCJE Community',
    sub:     'College of Criminal Justice Education',
    iconClass: 'ci-ccje',
  },
  css: {
    name:    'CSS Community',
    label:   'CSS Student',
    img:     'Images/CSS.png',
    imgAlt:  'CSS',
    title:   'CSS Community',
    sub:     'College of Computer Studies',
    iconClass: 'ci-css',
  },
  psych: {
    name:    'PSYCH Community',
    label:   'PSYCH Student',
    img:     'Images/PSYCH.png',
    imgAlt:  'PSYCH',
    title:   'PSYCH Community',
    sub:     'Psychology Department',
    iconClass: 'ci-psych',
  },
};

// ── AUTH GUARD + POPULATE UI ──
(async () => {
  // Give Supabase a moment to process the session from the URL hash
  const { data: { session } } = await db.auth.getSession();

  if (!session) {
    window.location.href = 'landing page/index.html';
    return;
  }

  // Fetch profile from DB
  const { data: profile, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    console.error('Could not load profile:', error);
    window.location.href = 'landing page/index.html';
    return;
  }

  // Determine department slug from URL param or profile
  const urlParams  = new URLSearchParams(window.location.search);
  const deptSlug   = urlParams.get('dept') || 'general';
  const deptConf   = DEPT_CONFIG[deptSlug];

  // Build initials and display name
  const initials   = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName   = `${profile.first_name} ${profile.last_name}`;
  const shortName  = `${profile.first_name} ${profile.last_name[0]}.`;
  const deptLabel  = deptConf ? deptConf.label : 'Student';

  // ── Topbar ──
  document.getElementById('topbarAvatar').textContent = initials;
  document.getElementById('topbarName').textContent   = shortName;

  // ── Profile dropdown ──
  document.getElementById('ddAvatar').textContent   = initials;
  document.getElementById('ddFullName').textContent = fullName;
  document.getElementById('ddDeptId').textContent   = `${deptLabel} · ${profile.student_id}`;

  // ── Sidebar user card ──
  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('sidebarName').textContent   = fullName;
  document.getElementById('sidebarDept').textContent   = deptLabel;

  // ── Department community item ──
  if (deptConf) {
    document.getElementById('deptCommName').textContent = deptConf.name;
    const iconWrap = document.getElementById('deptCommIcon');
    iconWrap.className = `comm-icon ${deptConf.iconClass}`;

    const img = document.getElementById('deptCommImg');
    img.src = deptConf.img;
    img.alt = deptConf.imgAlt;
    img.style.display = '';
    document.getElementById('deptCommFallback').style.display = 'none';

    // ── Feed header ──
    document.getElementById('feedTitle').textContent = deptConf.title;
    document.getElementById('feedSub').textContent   = deptConf.sub;
    const feedIcon = document.getElementById('feedHeaderIcon');
    feedIcon.className = `feed-icon ${deptConf.iconClass}`;
    feedIcon.innerHTML = `<img src="${deptConf.img}" alt="${deptConf.imgAlt}" style="width:100%;height:100%;object-fit:contain;" />`;
  }

  // ── Create post greeting ──
  document.getElementById('createPostAvatar').textContent    = initials;
  document.getElementById('createPostGreeting').textContent  = `What's on your mind, ${profile.first_name}?`;

  // ── Logout ──
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await db.auth.signOut();
    window.location.href = 'landing page/index.html';
  });
})();

// ── DROPDOWN TOGGLES ──
function setupDropdown(triggerId, dropdownId) {
  const trigger  = document.getElementById(triggerId);
  const dropdown = document.getElementById(dropdownId);
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dropdown.hidden;
    // close all dropdowns first
    document.querySelectorAll('.notif-dropdown, .profile-dropdown').forEach(d => d.hidden = true);
    dropdown.hidden = !isHidden;
  });
}

setupDropdown('notifToggle', 'notifDropdown');
setupDropdown('profileToggle', 'profileDropdown');

document.addEventListener('click', () => {
  document.querySelectorAll('.notif-dropdown, .profile-dropdown').forEach(d => d.hidden = true);
});

// ── SIDEBAR TOGGLE (mobile) ──
const sidebarToggle = document.getElementById('sidebarToggle');
const leftSidebar   = document.getElementById('leftSidebar');

sidebarToggle.addEventListener('click', () => {
  leftSidebar.classList.toggle('open');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 640 &&
      !leftSidebar.contains(e.target) &&
      !sidebarToggle.contains(e.target)) {
    leftSidebar.classList.remove('open');
  }
});

// ── COMMUNITY ITEM ACTIVE STATE ──
document.querySelectorAll('.community-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelectorAll('.community-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    // Close mobile sidebar after selection
    if (window.innerWidth <= 640) leftSidebar.classList.remove('open');
  });
});

// ── FEED TABS ──
document.querySelectorAll('.feed-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.feed-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
  });
});

// ── LIKE BUTTON TOGGLE ──
document.querySelectorAll('.post-action-btn[aria-label="Like"]').forEach(btn => {
  btn.addEventListener('click', () => {
    const isLiked = btn.classList.toggle('liked');
    const count   = btn.querySelector('span');
    count.textContent = isLiked
      ? parseInt(count.textContent) + 1
      : parseInt(count.textContent) - 1;
  });
});

// ── CREATE POST MODAL ──
const createPostModal = document.getElementById('createPostModal');
document.getElementById('openCreatePost').addEventListener('click', () => {
  createPostModal.hidden = false;
  document.body.style.overflow = 'hidden';
});
document.getElementById('closeCreatePost').addEventListener('click', () => {
  createPostModal.hidden = true;
  document.body.style.overflow = '';
});
createPostModal.addEventListener('click', (e) => {
  if (e.target === createPostModal) {
    createPostModal.hidden = true;
    document.body.style.overflow = '';
  }
});

// Also trigger from create-post-actions buttons
document.querySelectorAll('.create-action-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    createPostModal.hidden = false;
    document.body.style.overflow = 'hidden';
  });
});

// ── CHATBOT ──
const chatbotFab    = document.getElementById('chatbotFab');
const chatbotPanel  = document.getElementById('chatbotPanel');
const chatbotClose  = document.getElementById('chatbotClose');
const chatbotForm   = document.getElementById('chatbotForm');
const chatbotInput  = document.getElementById('chatbotInput');
const chatbotMsgs   = document.getElementById('chatbotMessages');
const cbSuggestions = document.getElementById('cbSuggestions');
const fabIconOpen   = chatbotFab.querySelector('.chatbot-fab-open');
const fabIconClose  = chatbotFab.querySelector('.chatbot-fab-close');

const KB = [
  { keys: ['exam','examination','final exam','midterm','test schedule'],
    reply: '📅 <strong>Final Exam Schedule</strong><br/>The schedule for all departments has been released. Check the Announcements section or visit the Registrar\'s portal for your timetable.' },
  { keys: ['class suspension','no class','suspended','suspension'],
    reply: '🚫 <strong>Class Suspensions</strong><br/>No class suspensions announced at the moment. Check Announcements for real-time updates.' },
  { keys: ['lost','found','lost and found','tumbler','missing'],
    reply: '🔍 <strong>Lost & Found</strong><br/>Browse the Lost & Found community for recent posts. Students have posted about lost IDs, tumblers, and bags.' },
  { keys: ['announcement','announcements','latest','update'],
    reply: '📢 <strong>Latest Announcements</strong><br/>• 2nd Semester Enrollment is open<br/>• Foundation Day — May 28<br/>• Final Exam Schedule released<br/>• Library maintenance May 22, 8AM–12PM' },
  { keys: ['enrollment','enroll','registration','semester'],
    reply: '📝 <strong>Enrollment</strong><br/>2nd Semester enrollment is open! Visit the Registrar\'s portal for your schedule and required documents.' },
  { keys: ['cte','teacher education'],
    reply: '🎓 <strong>CTE Announcements</strong><br/>Check the CTE Community channel for the latest department-specific updates and announcements from your professors.' },
  { keys: ['event','events','foundation day','activity'],
    reply: '🎉 <strong>Upcoming Events</strong><br/>• Foundation Day — May 28<br/>• Leadership Summit — May 30<br/>• Final Exams — June 2' },
  { keys: ['hello','hi','hey','good morning','good afternoon'],
    reply: '👋 Hello, Juan! How can I help you today?' },
  { keys: ['thank','thanks','salamat'],
    reply: '😊 You\'re welcome! Feel free to ask anything.' },
];

function getBotReply(text) {
  const lower = text.toLowerCase();
  for (const entry of KB) {
    if (entry.keys.some(k => lower.includes(k))) return entry.reply;
  }
  return "🤔 I'm not sure about that. Try asking about <strong>exams</strong>, <strong>suspensions</strong>, <strong>lost & found</strong>, or <strong>announcements</strong>.";
}

function appendMsg(html, role) {
  const wrap   = document.createElement('div');
  wrap.className = `cb-msg cb-${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'cb-bubble';
  bubble.innerHTML = html;
  wrap.appendChild(bubble);
  chatbotMsgs.appendChild(wrap);
  chatbotMsgs.scrollTop = chatbotMsgs.scrollHeight;
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'cb-msg cb-bot cb-typing';
  wrap.innerHTML = `<div class="cb-bubble"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
  chatbotMsgs.appendChild(wrap);
  chatbotMsgs.scrollTop = chatbotMsgs.scrollHeight;
  return wrap;
}

function sendMessage(text) {
  if (!text.trim()) return;
  if (cbSuggestions) cbSuggestions.style.display = 'none';
  appendMsg(text, 'user');
  chatbotInput.value = '';
  const typing = showTyping();
  setTimeout(() => {
    typing.remove();
    appendMsg(getBotReply(text), 'bot');
  }, 800 + Math.random() * 300);
}

function openChatbot() {
  chatbotPanel.hidden = false;
  chatbotFab.setAttribute('aria-expanded', 'true');
  fabIconOpen.style.display = 'none';
  fabIconClose.style.display = '';
  chatbotInput.focus();
}

function closeChatbot() {
  chatbotPanel.hidden = true;
  chatbotFab.setAttribute('aria-expanded', 'false');
  fabIconOpen.style.display = '';
  fabIconClose.style.display = 'none';
}

chatbotFab.addEventListener('click', () => chatbotPanel.hidden ? openChatbot() : closeChatbot());
chatbotClose.addEventListener('click', closeChatbot);
chatbotForm.addEventListener('submit', (e) => { e.preventDefault(); sendMessage(chatbotInput.value); });

document.addEventListener('click', (e) => {
  if (e.target.matches('.cb-sugg')) sendMessage(e.target.dataset.q);
  if (e.target.matches('.chatbot-sugg-btn')) { openChatbot(); sendMessage(e.target.textContent.replace(/^[^\w]+/, '').trim()); }
});

document.getElementById('openChatbotWidget').addEventListener('click', openChatbot);
document.getElementById('chatbotToggleBtn').addEventListener('click', () => chatbotPanel.hidden ? openChatbot() : closeChatbot());

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeChatbot();
    createPostModal.hidden = true;
    document.body.style.overflow = '';
  }
});


// ══════════════════════════════════════════════════════════════════
// BACKEND INTEGRATION - Added for database functionality
// ══════════════════════════════════════════════════════════════════

// Toast notification function
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#dc2626' : '#3b82f6'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 500;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Global user state
let loggedInUser = null;

// Load user data on page load
(async function initUser() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'landing page/index.html';
    return;
  }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (profile) {
    loggedInUser = profile;
    console.log('User loaded:', profile);
    
    // Update UI with real user data
    const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
    const fullName = `${profile.first_name} ${profile.last_name}`;
    
    // Update modal
    const modalAvatar = document.querySelector('.cf-modal .post-avatar');
    const modalName = document.querySelector('.cf-modal-user > div > div');
    if (modalAvatar) modalAvatar.textContent = initials;
    if (modalName) modalName.textContent = fullName;
    
    // Build community dropdown dynamically
    const communitySelect = document.querySelector('.post-community-select');
    if (communitySelect) {
      // Fetch communities user can post to
      const { data: communities } = await db
        .from('communities')
        .select('*')
        .or(`type.eq.public,department.eq.${profile.department}`)
        .order('type', { ascending: false }); // department first
      
      communitySelect.innerHTML = '';
      
      communities?.forEach(comm => {
        const option = document.createElement('option');
        option.value = comm.slug;
        option.textContent = comm.name;
        communitySelect.appendChild(option);
      });
    }
  }
})();

// Wire up the Post button
document.querySelector('.cf-modal .btn-primary')?.addEventListener('click', async function() {
  const titleInput = document.querySelector('.cf-post-title-input');
  const textarea = document.querySelector('.cf-post-textarea');
  const title = titleInput?.value.trim();
  const content = textarea?.value.trim();
  const isAnon = document.querySelector('.cf-post-options input[type="checkbox"]')?.checked;
  const communitySelect = document.querySelector('.post-community-select');
  const selectedSlug = communitySelect?.value;
  
  if (!content) {
    showToast('Please write something!', 'error');
    return;
  }
  
  if (!loggedInUser || !selectedSlug) {
    showToast('Not logged in', 'error');
    return;
  }
  
  this.disabled = true;
  this.textContent = 'Posting...';
  
  try {
    // Get selected community ID
    const { data: community } = await db.from('communities').select('id').eq('slug', selectedSlug).single();
    
    const { data, error } = await db.from('posts').insert({
      community_id: community.id,
      author_id: loggedInUser.id,
      is_anonymous: isAnon || false,
      title: title || null,
      content: content
    }).select().single();
    
    if (error) throw error;
    
    showToast('Post created successfully!', 'success');
    if (titleInput) titleInput.value = '';
    textarea.value = '';
    document.getElementById('createPostModal').hidden = true;
    document.body.style.overflow = '';
    
    // Reload feed to show new post
    setTimeout(() => loadPostsFromDB(), 500);
    
  } catch (err) {
    console.error(err);
    showToast('Failed to create post: ' + err.message, 'error');
  } finally {
    this.disabled = false;
    this.textContent = 'Post';
  }
});


// Load posts from database
async function loadPostsFromDB() {
  if (!loggedInUser) return;
  
  try {
    let query = db
      .from('posts')
      .select(`
        *,
        profiles:author_id (first_name, last_name),
        communities:community_id (name, slug)
      `)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (currentCommunityFilter) {
      // Filter by specific community
      const { data: comm } = await db
        .from('communities')
        .select('id')
        .eq('slug', currentCommunityFilter)
        .single();
      
      if (comm) {
        query = query.eq('community_id', comm.id);
      }
    } else {
      // Show all communities user can see
      const { data: communities } = await db
        .from('communities')
        .select('id')
        .or(`type.eq.public,department.eq.${loggedInUser.department}`);
      
      const communityIds = communities.map(c => c.id);
      query = query.in('community_id', communityIds);
    }
    
    const { data: posts, error } = await query;
    
    if (error) throw error;
    
    console.log('Loaded posts:', posts);
    
    // Clear hardcoded posts
    const mainFeed = document.querySelector('.main-feed');
    mainFeed.querySelectorAll('.post-card').forEach(p => p.remove());
    
    // Get actual comment counts from database for each post
    for (const post of posts) {
      const { count } = await db
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      post.comment_count = count || 0;
      
      // Check if current user has liked this post
      const { data: likeData } = await db
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', loggedInUser.id)
        .single();
      
      post.user_has_liked = !!likeData;
      
      // Get actual like count
      const { count: likeCount } = await db
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      post.like_count = likeCount || 0;
    }
    
    // Render real posts
    posts.forEach(post => {
      const postEl = createPostElement(post);
      mainFeed.appendChild(postEl);
    });
    
  } catch (err) {
    console.error('Error loading posts:', err);
  }
}

// Create a post element
function createPostElement(post) {
  const article = document.createElement('article');
  article.className = 'post-card';
  article.dataset.postId = post.id; // Store post ID for later use
  
  const isAnon = post.is_anonymous;
  const author = post.profiles;
  
  let authorName = 'Anonymous';
  let authorAvatar = '<div class="post-avatar post-avatar--anon"><i class="fas fa-user-secret"></i></div>';
  
  if (!isAnon && author) {
    authorName = `${author.first_name} ${author.last_name}`;
    const initials = (author.first_name[0] + author.last_name[0]).toUpperCase();
    authorAvatar = `<div class="post-avatar" style="background:linear-gradient(135deg,#6B0F1A,#8b1525);">${initials}</div>`;
  }
  
  const communityName = post.communities?.name || 'General';
  const tagClass = post.communities?.slug === 'lostandfound' ? 'tag-lost' : 
                   post.communities?.slug === 'academic' ? 'tag-academic' :
                   post.communities?.slug === 'marketplace' ? 'tag-market' : 'tag-general';
  
  const timeAgo = formatTimeAgo(new Date(post.created_at));
  
  // Check if user has liked this post
  const likedClass = post.user_has_liked ? 'liked' : '';
  
  // Check if current user is the author (can delete/edit)
  const isAuthor = loggedInUser && post.author_id === loggedInUser.id;
  
  article.innerHTML = `
    <div class="post-left">${authorAvatar}</div>
    <div class="post-body">
      <div class="post-meta">
        <span class="post-author">${authorName}</span>
        <span class="post-dept-tag ${tagClass}">${communityName}</span>
        <span class="post-time"><i class="fas fa-clock"></i> ${timeAgo}</span>
        ${isAuthor ? `
          <div class="post-menu-wrapper">
            <button class="post-menu-btn" data-post-id="${post.id}" aria-label="Post options">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="post-menu-dropdown" id="post-menu-${post.id}" hidden>
              <button class="post-menu-item post-edit-btn" data-post-id="${post.id}">
                <i class="fas fa-edit"></i> Edit Post
              </button>
              <button class="post-menu-item post-copy-link-btn" data-post-id="${post.id}">
                <i class="fas fa-link"></i> Copy Link
              </button>
              <button class="post-menu-item post-delete-btn" data-post-id="${post.id}">
                <i class="fas fa-trash"></i> Delete Post
              </button>
            </div>
          </div>
        ` : ''}
      </div>
      ${post.title ? `<h2 class="post-title">${escapeHtml(post.title)}</h2>` : ''}
      <p class="post-content">${escapeHtml(post.content)}</p>
      <div class="post-actions">
        <button class="post-action-btn post-like-btn ${likedClass}" aria-label="Like" data-post-id="${post.id}">
          <i class="fas fa-heart"></i> <span>${post.like_count || 0}</span>
        </button>
        <button class="post-action-btn post-comment-btn" aria-label="Comment" data-post-id="${post.id}">
          <i class="fas fa-comment"></i> <span>${post.comment_count || 0}</span>
        </button>
      </div>
      
      <!-- Comment Section (hidden by default) -->
      <div class="comment-section" id="comments-${post.id}" style="display:none;">
        <div class="comment-list" id="comment-list-${post.id}">
          <div class="comment-loading">Loading comments...</div>
        </div>
        <div class="comment-input-wrapper">
          <div class="comment-input-avatar">${loggedInUser ? (loggedInUser.first_name[0] + loggedInUser.last_name[0]).toUpperCase() : '--'}</div>
          <input type="text" class="comment-input" placeholder="Write a comment..." data-post-id="${post.id}" />
          <button class="comment-send-btn" data-post-id="${post.id}">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  
  return article;
}

function formatTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load posts after user is initialized
setTimeout(() => {
  if (loggedInUser) {
    // Hide sample posts immediately
    document.querySelectorAll('.post-card').forEach(p => p.style.display = 'none');
    
    // Set default header to "Campus Feed"
    document.getElementById('feedTitle').textContent = 'Campus Feed';
    document.getElementById('feedSub').textContent = 'All posts from your communities';
    document.getElementById('feedHeaderIcon').innerHTML = '<i class="fas fa-home"></i>';
    
    // Load all posts (no filter)
    currentCommunityFilter = null;
    loadPostsFromDB();
  }
}, 100); // Faster to avoid flash


// Community filtering
let currentCommunityFilter = null;

// Toggle comment section
document.addEventListener('click', async (e) => {
  // Handle post menu toggle
  if (e.target.closest('.post-menu-btn')) {
    const btn = e.target.closest('.post-menu-btn');
    const postId = btn.dataset.postId;
    const dropdown = document.getElementById(`post-menu-${postId}`);
    
    // Close all other dropdowns first
    document.querySelectorAll('.post-menu-dropdown').forEach(d => {
      if (d.id !== `post-menu-${postId}`) d.hidden = true;
    });
    
    dropdown.hidden = !dropdown.hidden;
    e.stopPropagation();
    return;
  }
  
  // Handle delete post
  if (e.target.closest('.post-delete-btn')) {
    const btn = e.target.closest('.post-delete-btn');
    const postId = btn.dataset.postId;
    await deletePost(postId);
    return;
  }
  
  // Handle edit post
  if (e.target.closest('.post-edit-btn')) {
    const btn = e.target.closest('.post-edit-btn');
    const postId = btn.dataset.postId;
    await editPost(postId);
    return;
  }
  
  // Handle copy link
  if (e.target.closest('.post-copy-link-btn')) {
    const btn = e.target.closest('.post-copy-link-btn');
    const postId = btn.dataset.postId;
    copyPostLink(postId);
    return;
  }
  
  // Handle edit post save
  if (e.target.closest('.edit-post-save-btn')) {
    const btn = e.target.closest('.edit-post-save-btn');
    const postId = btn.dataset.postId;
    await saveEditedPost(postId);
    return;
  }
  
  // Handle edit post cancel
  if (e.target.closest('.edit-post-cancel-btn')) {
    const btn = e.target.closest('.edit-post-cancel-btn');
    const postId = btn.dataset.postId;
    cancelEditPost(postId);
    return;
  }
  
  // Handle like button
  if (e.target.closest('.post-like-btn')) {
    const btn = e.target.closest('.post-like-btn');
    const postId = btn.dataset.postId;
    await toggleLike(postId, btn);
    return;
  }
  
  if (e.target.closest('.post-comment-btn')) {
    const btn = e.target.closest('.post-comment-btn');
    const postId = btn.dataset.postId;
    const commentSection = document.getElementById(`comments-${postId}`);
    
    if (commentSection.style.display === 'none') {
      commentSection.style.display = 'block';
      btn.classList.add('active');
      await loadComments(postId);
    } else {
      commentSection.style.display = 'none';
      btn.classList.remove('active');
    }
  }
  
  // Handle comment send button
  if (e.target.closest('.comment-send-btn')) {
    const btn = e.target.closest('.comment-send-btn');
    const postId = btn.dataset.postId;
    const input = document.querySelector(`.comment-input[data-post-id="${postId}"]`);
    await submitComment(postId, input);
  }
  
  // Close dropdowns when clicking outside
  if (!e.target.closest('.post-menu-wrapper')) {
    document.querySelectorAll('.post-menu-dropdown').forEach(d => d.hidden = true);
  }
});

// Handle Enter key for comment input
document.addEventListener('keypress', async (e) => {
  if (e.target.classList.contains('comment-input') && e.key === 'Enter') {
    const input = e.target;
    const postId = input.dataset.postId;
    await submitComment(postId, input);
  }
});

// Toggle like on a post
async function toggleLike(postId, buttonElement) {
  if (!loggedInUser) {
    showToast('You must be logged in to like posts', 'error');
    return;
  }
  
  const isLiked = buttonElement.classList.contains('liked');
  
  try {
    if (isLiked) {
      // Unlike - remove from database
      const { error } = await db
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', loggedInUser.id);
      
      if (error) throw error;
      
      // Update UI
      buttonElement.classList.remove('liked');
      
    } else {
      // Like - add to database
      const { error } = await db
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: loggedInUser.id
        });
      
      if (error) throw error;
      
      // Update UI
      buttonElement.classList.add('liked');
    }
    
    // Get updated like count from database
    const { count } = await db
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    // Update like count display
    const countSpan = buttonElement.querySelector('span');
    countSpan.textContent = count || 0;
    
  } catch (err) {
    console.error('Error toggling like:', err);
    showToast('Failed to update like: ' + err.message, 'error');
  }
}

// Delete a post
async function deletePost(postId) {
  if (!loggedInUser) {
    showToast('You must be logged in', 'error');
    return;
  }
  
  // Confirm deletion
  const confirmed = confirm('Are you sure you want to delete this post? This action cannot be undone.');
  if (!confirmed) return;
  
  try {
    // Delete from database (CASCADE will delete related comments and likes)
    const { error } = await db
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', loggedInUser.id); // Ensure user can only delete their own posts
    
    if (error) throw error;
    
    // Remove from UI
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (postCard) {
      postCard.style.opacity = '0';
      postCard.style.transform = 'scale(0.95)';
      postCard.style.transition = 'all 0.3s ease';
      setTimeout(() => postCard.remove(), 300);
    }
    
    showToast('Post deleted successfully', 'success');
    
  } catch (err) {
    console.error('Error deleting post:', err);
    showToast('Failed to delete post: ' + err.message, 'error');
  }
}

// Edit a post
async function editPost(postId) {
  if (!loggedInUser) {
    showToast('You must be logged in', 'error');
    return;
  }
  
  try {
    // Get current post content
    const { data: post, error: fetchError } = await db
      .from('posts')
      .select('content')
      .eq('id', postId)
      .eq('author_id', loggedInUser.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Find the post card and content element
    const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
    if (!postCard) return;
    
    const contentElement = postCard.querySelector('.post-content');
    const originalContent = post.content;
    
    // Store original content as data attribute
    contentElement.dataset.originalContent = originalContent;
    
    // Replace content with textarea for editing
    contentElement.innerHTML = `
      <div class="edit-post-wrapper">
        <textarea class="edit-post-textarea" rows="3">${escapeHtml(originalContent)}</textarea>
        <div class="edit-post-actions">
          <button class="edit-post-cancel-btn" data-post-id="${postId}">Cancel</button>
          <button class="edit-post-save-btn" data-post-id="${postId}">Save Changes</button>
        </div>
      </div>
    `;
    
    // Focus on textarea and select text
    const textarea = contentElement.querySelector('.edit-post-textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    
    // Close the dropdown menu
    const dropdown = document.getElementById(`post-menu-${postId}`);
    if (dropdown) dropdown.hidden = true;
    
  } catch (err) {
    console.error('Error starting edit:', err);
    showToast('Failed to edit post: ' + err.message, 'error');
  }
}

// Save edited post
async function saveEditedPost(postId) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;
  
  const contentElement = postCard.querySelector('.post-content');
  const textarea = contentElement.querySelector('.edit-post-textarea');
  const newContent = textarea.value.trim();
  
  if (!newContent) {
    showToast('Post content cannot be empty', 'error');
    return;
  }
  
  try {
    // Update in database
    const { error } = await db
      .from('posts')
      .update({ 
        content: newContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .eq('author_id', loggedInUser.id);
    
    if (error) throw error;
    
    // Update UI - restore normal view with new content
    contentElement.innerHTML = escapeHtml(newContent);
    delete contentElement.dataset.originalContent;
    
    showToast('Post updated successfully', 'success');
    
  } catch (err) {
    console.error('Error saving edit:', err);
    showToast('Failed to save changes: ' + err.message, 'error');
  }
}

// Cancel editing post
function cancelEditPost(postId) {
  const postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (!postCard) return;
  
  const contentElement = postCard.querySelector('.post-content');
  const originalContent = contentElement.dataset.originalContent || '';
  
  // Restore original content
  contentElement.innerHTML = escapeHtml(originalContent);
  delete contentElement.dataset.originalContent;
}

// Copy post link
function copyPostLink(postId) {
  const postUrl = `${window.location.origin}${window.location.pathname}?post=${postId}`;
  
  copyToClipboard(postUrl);
  
  // Close dropdown
  const dropdown = document.getElementById(`post-menu-${postId}`);
  if (dropdown) dropdown.hidden = true;
}

// Helper function to copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Link copied to clipboard!', 'success');
  }).catch(err => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast('Link copied to clipboard!', 'success');
    } catch (err) {
      showToast('Failed to copy link', 'error');
    }
    document.body.removeChild(textArea);
  });
}

// Load comments for a post
async function loadComments(postId) {
  const commentList = document.getElementById(`comment-list-${postId}`);
  
  try {
    const { data: comments, error } = await db
      .from('comments')
      .select(`
        *,
        profiles:author_id (first_name, last_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    if (comments.length === 0) {
      commentList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
      return;
    }
    
    commentList.innerHTML = comments.map(comment => {
      const isAnon = comment.is_anonymous;
      const author = comment.profiles;
      
      let authorName = 'Anonymous';
      let authorInitials = '<i class="fas fa-user-secret" style="font-size:.7rem;"></i>';
      
      if (!isAnon && author) {
        authorName = `${author.first_name} ${author.last_name}`;
        authorInitials = (author.first_name[0] + author.last_name[0]).toUpperCase();
      }
      
      const timeAgo = formatTimeAgo(new Date(comment.created_at));
      
      return `
        <div class="comment-item">
          <div class="comment-avatar ${isAnon ? 'comment-avatar-anon' : ''}">${authorInitials}</div>
          <div class="comment-content-wrapper">
            <div class="comment-header">
              <span class="comment-author">${authorName}</span>
              <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.content)}</div>
          </div>
        </div>
      `;
    }).join('');
    
  } catch (err) {
    console.error('Error loading comments:', err);
    commentList.innerHTML = '<div class="comment-error">Failed to load comments</div>';
  }
}

// Submit a comment
async function submitComment(postId, inputElement) {
  const content = inputElement.value.trim();
  
  if (!content) {
    showToast('Please write a comment!', 'error');
    return;
  }
  
  if (!loggedInUser) {
    showToast('You must be logged in to comment', 'error');
    return;
  }
  
  try {
    const { data, error } = await db.from('comments').insert({
      post_id: postId,
      author_id: loggedInUser.id,
      is_anonymous: false, // You can add checkbox for this later
      content: content
    }).select().single();
    
    if (error) throw error;
    
    // Clear input
    inputElement.value = '';
    
    // Reload comments
    await loadComments(postId);
    
    // Get actual comment count from database
    const { count } = await db
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    // Update comment count in UI with actual database count
    const commentBtn = document.querySelector(`.post-comment-btn[data-post-id="${postId}"]`);
    const countSpan = commentBtn.querySelector('span');
    countSpan.textContent = count || 0;
    
    showToast('Comment posted!', 'success');
    
  } catch (err) {
    console.error('Error posting comment:', err);
    showToast('Failed to post comment: ' + err.message, 'error');
  }
}

// Community filtering

document.querySelectorAll('.community-item').forEach(item => {
  item.addEventListener('click', async (e) => {
    e.preventDefault();
    
    // Update active state
    document.querySelectorAll('.community-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    const feedSlug = item.dataset.feed;
    if (!feedSlug) return;
    
    // Update feed header
    const feedTitle = document.getElementById('feedTitle');
    const feedSub = document.getElementById('feedSub');
    const feedIcon = document.getElementById('feedHeaderIcon');
    
    if (feedSlug === 'all') {
      // Show all communities
      feedTitle.textContent = 'Campus Feed';
      feedSub.textContent = 'All posts from your communities';
      feedIcon.innerHTML = '<i class="fas fa-home"></i>';
      feedIcon.className = 'feed-icon';
      currentCommunityFilter = null;
    } else if (feedSlug === 'dept') {
      // Department community - need to get user's department
      const deptConf = DEPT_CONFIG['css']; // You can make this dynamic later
      if (deptConf) {
        feedTitle.textContent = deptConf.title;
        feedSub.textContent = deptConf.sub;
        feedIcon.innerHTML = `<img src="${deptConf.img}" style="width:100%;height:100%;object-fit:contain;" />`;
      }
      currentCommunityFilter = 'css';
    } else {
      // Public community
      const communityNames = {
        'general': { name: 'General Discussion', sub: 'Open discussions for all', icon: 'fa-comments' },
        'lostandfound': { name: 'Lost & Found', sub: 'Report lost items', icon: 'fa-search' },
        'academic': { name: 'Academic Help', sub: 'Study help', icon: 'fa-book-open' },
        'marketplace': { name: 'Marketplace', sub: 'Borrow & lend', icon: 'fa-handshake' },
        'campus': { name: 'Campus Discussions', sub: 'Campus life', icon: 'fa-university' },
        'support': { name: 'Student Support', sub: 'Help & guidance', icon: 'fa-hands-helping' }
      };
      
      const comm = communityNames[feedSlug] || communityNames['general'];
      feedTitle.textContent = comm.name;
      feedSub.textContent = comm.sub;
      feedIcon.innerHTML = `<i class="fas ${comm.icon}"></i>`;
      feedIcon.className = 'feed-icon'; // Reset classes first
      
      // Add the matching color class from sidebar
      if (feedSlug === 'lostandfound') feedIcon.classList.add('ci-lost');
      else if (feedSlug === 'academic') feedIcon.classList.add('ci-academic');
      else if (feedSlug === 'marketplace') feedIcon.classList.add('ci-market');
      else if (feedSlug === 'campus') feedIcon.classList.add('ci-campus');
      else if (feedSlug === 'support') feedIcon.classList.add('ci-support');
      else feedIcon.classList.add('ci-general');
      
      currentCommunityFilter = feedSlug;
    }
    
    // Reload posts with filter
    await loadPostsFromDB();
  });
});
