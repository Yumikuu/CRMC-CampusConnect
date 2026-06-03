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
