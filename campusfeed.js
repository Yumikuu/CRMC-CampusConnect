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
