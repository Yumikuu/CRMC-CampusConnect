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
    window.location.href = 'landing-page/index.html';
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
    window.location.href = 'landing-page/index.html';
    return;
  }

  // Determine department slug from profile's department field
  const deptSlugMap = {
    'college of teacher education (cte)':              'cte',
    'college of business education (cbe)':             'cbe',
    'college of criminal justice education (ccje)':    'ccje',
    'college of computer studies (css)':               'css',
    'psychology (psych)':                              'psych',
  };
  const deptSlug   = deptSlugMap[(profile.department || '').toLowerCase().trim()] || null;
  const deptConf   = deptSlug ? DEPT_CONFIG[deptSlug] : null;

  // Build initials and display name
  const initials   = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  const fullName   = `${profile.first_name} ${profile.last_name}`;
  const shortName  = `${profile.first_name} ${profile.last_name[0]}.`;
  const deptLabel  = deptConf ? deptConf.label : 'Student';

  // ── Topbar ──
  const topbarAvatar = document.getElementById('topbarAvatar');
  topbarAvatar.innerHTML = profile.avatar_url
    ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${fullName}" />`
    : initials;
  document.getElementById('topbarName').textContent = shortName;

  // ── Profile dropdown ──
  const ddAvatar = document.getElementById('ddAvatar');
  ddAvatar.innerHTML = profile.avatar_url
    ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${fullName}" />`
    : initials;
  document.getElementById('ddFullName').textContent = fullName;
  document.getElementById('ddDeptId').textContent   = `${deptLabel} · ${profile.student_id}`;

  // ── Sidebar user card ──
  const sidebarAvatar = document.getElementById('sidebarAvatar');
  sidebarAvatar.innerHTML = profile.avatar_url
    ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${fullName}" />`
    : initials;
  document.getElementById('sidebarName').textContent = fullName;
  document.getElementById('sidebarDept').textContent = deptLabel;

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
  const cpAvatar = document.getElementById('createPostAvatar');
  cpAvatar.innerHTML = profile.avatar_url
    ? `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${fullName}" />`
    : initials;
  document.getElementById('createPostGreeting').textContent = `What's on your mind, ${profile.first_name}?`;

  // ── Logout ──
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await db.auth.signOut();
    window.location.href = 'landing-page/index.html';
  });

  // ── My Profile link ──
  const myProfileLink = document.querySelector('.profile-dd-links a[href*="profile.html"]');
  if (myProfileLink) {
    myProfileLink.href = `profile.html?id=${profile.id}`;
  }
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
let currentFeedTab = 'all'; // all | trending | latest | pinned

document.querySelectorAll('.feed-tab').forEach(tab => {
  tab.addEventListener('click', async () => {
    document.querySelectorAll('.feed-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    currentFeedTab = tab.dataset.tab || 'all';
    await loadPostsFromDB();
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
  { keys: ['hello','hi','hey','good morning','good afternoon','kumusta'],
    reply: null }, // Will be dynamic — uses logged-in user's name
  { keys: ['thank','thanks','salamat'],
    reply: '😊 You\'re welcome! Feel free to ask anything.' },
  { keys: ['help','what can you do','commands'],
    reply: '🤖 I can help you with:<br/>• Search posts: "any lost tumbler?"<br/>• Announcements: "latest announcements"<br/>• Events: "upcoming events"<br/>• Lost & Found: "lost ID"<br/>• Academic: "exam schedule"<br/>• Department posts: "CSS posts" or "CTE updates"<br/>Just type your question!' },
];

// ── GEMINI AI INTEGRATION ──
async function callGeminiAI(userMessage) {
  const apiKey = window.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') return null;

  const userName  = loggedInUser ? `${loggedInUser.first_name} ${loggedInUser.last_name}` : 'a student';
  const userDept  = loggedInUser?.department || 'unknown department';

  const systemPrompt = `You are the CRMC CampusConnect Assistant, a friendly and helpful AI chatbot for Camarines Robles Memorial College (CRMC) in the Philippines. You help students with campus-related questions.

About CRMC CampusConnect:
- It is a student social media platform for CRMC students
- Departments: CTE (College of Teacher Education), CBE (College of Business Education), CCJE (College of Criminal Justice Education), CSS (College of Computer Studies), PSYCH (Psychology)
- Features: Campus Feed, Communities, Announcements, Lost & Found, Academic Help, Marketplace, Events
- The SSG (Supreme Student Government) posts official announcements

The student you are talking to is: ${userName} from ${userDept}.

Guidelines:
- Be friendly, supportive, and concise — students appreciate quick answers
- Use a mix of English and light Filipino (Taglish) if the student uses it
- Keep responses SHORT (2-5 sentences max) unless a detailed explanation is needed
- For campus-specific real-time data (posts, announcements, events), tell the student to check the feed or announcements page
- Do NOT make up specific dates, names, or events — be honest if you don't know
- You can help with: study tips, campus life advice, general knowledge, explaining features, mental health support, Filipino student culture
- Always be encouraging and positive`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 300,
          topK: 40,
          topP: 0.95,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Gemini API error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    // Convert basic markdown to HTML for the chat bubble
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');

  } catch (err) {
    console.error('Gemini call failed:', err);
    return null;
  }
}

// ── SMART CHATBOT: DB search + Gemini AI fallback ──
async function getBotReply(text) {
  const lower = text.toLowerCase().trim();

  // Check static KB first (greetings, thanks, help)
  for (const entry of KB) {
    if (entry.keys.some(k => lower.includes(k))) {
      if (entry.reply === null) {
        const name = loggedInUser ? loggedInUser.first_name : 'there';
        return `👋 Hello, ${name}! I'm the CampusConnect Assistant. Ask me anything about campus — I'm powered by Gemini AI! 🤖`;
      }
      return entry.reply;
    }
  }

  // ── Step 1: Check if this is a DB search request ──
  // ONLY route to DB when user is clearly asking for posts/announcements/lost items
  const dbTriggers = [
    /\b(announcement|announce|anunsyo|patalastas)\b/,
    /\b(lost|found|missing|nawala|nawawala)\b/,
    /\b(latest post|recent post|show.*post|find.*post|any.*post|search.*post)\b/,
    /\b(show me|search|find|any.*about|may.*post)\b.*\b(post|community|feed)\b/,
    /\b(marketplace|borrow|lend|sell|buy|pahiram)\b/,
    /\b(exam schedule|class schedule|exam date|schedule ng exam)\b/,
    /\b(event|upcoming event|intramural|seminar|summit)\b/,
    /\b(latest|recent|newest|bagong)\b.*\b(post|update|news|announcement)\b/,
    /\b(post|update|news)\b.*\b(latest|recent|bagong)\b/,
    /\bshow (me |the )?(latest|recent|new|all)\b/,
    /\bany (post|news|update|announcement)\b/,
  ];

  const isDBRequest = dbTriggers.some(p => p.test(lower));

  // If NOT a DB request → go straight to Gemini
  if (!isDBRequest) {
    const aiReply = await callGeminiAI(text);
    if (aiReply) return aiReply;
    // Gemini failed (no key or network error) — show a helpful message
    return `🤖 I'm having trouble connecting right now. For posts and announcements, try the feed or announcements page!`;
  }

  // ── Step 2: DB search — detect community/category ──
  let communityFilter = null;
  let wantsAnnouncements = false;
  let wantsLatest = lower.match(/\b(latest|recent|newest|new|last|bagong)\b/) !== null;

  // "my/our department" → user's department
  if (lower.match(/\b(my|our|aming|atin)\s*(dept|department|community|komunidad)\b/)) {
    if (loggedInUser) {
      const dm = loggedInUser.department?.match(/\(([^)]+)\)/);
      if (dm) communityFilter = dm[1].toLowerCase();
    }
  }

  // Explicit department mention
  if (!communityFilter) {
    const deptMatch = lower.match(/\b(css|cte|cbe|ccje|psych)\b/i);
    if (deptMatch) communityFilter = deptMatch[1].toLowerCase();
  }

  // Category detection
  if (lower.match(/\bannouncement|announce|official|anunsyo|patalastas\b/)) {
    wantsAnnouncements = true;
    if (!communityFilter) communityFilter = 'ssg-announcements';
  } else if (lower.match(/\blost|found|missing|nawala|nawawala|tumbler|id card|bag|wallet|phone|payong|umbrella\b/)) {
    if (!communityFilter) communityFilter = 'lostandfound';
  } else if (lower.match(/\bexam schedule|class schedule|exam date|when.*exam|schedule.*exam\b/)) {
    if (!communityFilter) communityFilter = 'academic';
  } else if (lower.match(/\bevent|foundation|summit|seminar|activity|intramural|program|celebration\b/)) {
    return await searchEvents(lower);
  } else if (lower.match(/\bborrow|lend|sell|buy|marketplace|sharing|libre|pahiram\b/)) {
    if (!communityFilter) communityFilter = 'marketplace';
  }

  // ── Build the search query ──
  try {
    let query = db
      .from('posts')
      .select('id, title, content, created_at, communities:community_id(name, slug)')
      .eq('is_flagged', false)
      .order('created_at', { ascending: false });

    // Filter by community if detected
    if (communityFilter) {
      const { data: comm } = await db.from('communities').select('id, name')
        .or(`slug.eq.${communityFilter},name.ilike.%${communityFilter}%`)
        .limit(1)
        .single();
      if (comm) {
        query = query.eq('community_id', comm.id);
      }
    }

    // If user wants latest/recent OR their message is very short/generic, just show recent posts
    const isGenericQuery = wantsLatest || lower.split(/\s+/).length <= 3;

    // Extract meaningful search keywords (remove stop words and short filler)
    const stopWords = ['is','there','a','any','the','an','about','do','we','have','posted','post','posts','anyone','someone','na','ba','may','ang','sa','ko','mo','ka','ng','mga','are','what','where','when','how','can','find','search','look','show','me','please','pls','from','in','for','and','or','latest','recent','new','newest','last','css','cte','cbe','ccje','psych','announcement','announcements','community','posts','update','updates','department','dept','my','our','on','it','to','of','that','this','was','has','been','ano','anong','yung','nag','si','ni','lost','found','missing','borrow','lend','sell','buy','exam','event','events','here','not','will','can','did','does','pero','kasi','talaga','lang','po','opo','naman','rin','din','pa'];
    const keywords = lower.split(/\s+/).filter(w => w.length > 2 && !stopWords.includes(w));

    // Only apply keyword search if we have meaningful terms AND it's not a generic "show me latest" query
    if (keywords.length > 0 && !isGenericQuery) {
      for (const kw of keywords.slice(0, 3)) {
        query = query.or(`title.ilike.%${kw}%,content.ilike.%${kw}%`);
      }
    }

    query = query.limit(5);
    const { data: posts, error } = await query;

    if (error) throw error;

    if (!posts || posts.length === 0) {
      // Fallback: if keyword search returned nothing, try without keywords
      if (keywords.length > 0) {
        let fallbackQuery = db
          .from('posts')
          .select('id, title, content, created_at, communities:community_id(name, slug)')
          .eq('is_flagged', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (communityFilter) {
          const { data: comm } = await db.from('communities').select('id, name')
            .or(`slug.eq.${communityFilter},name.ilike.%${communityFilter}%`)
            .limit(1)
            .single();
          if (comm) fallbackQuery = fallbackQuery.eq('community_id', comm.id);
        }

        const { data: fallbackPosts } = await fallbackQuery;
        if (fallbackPosts && fallbackPosts.length > 0) {
          let reply = `🔍 I couldn't find posts matching "<strong>${keywords.join(' ')}</strong>", but here are the latest posts${communityFilter ? ' from that community' : ''}:<br/><br/>`;
          fallbackPosts.forEach((post, i) => {
            const content = (post.title || post.content || '').replace(/^📢\s*\[ANNOUNCEMENT\]\s*/i, '');
            const preview = content.substring(0, 100);
            const timeAgo = formatTimeAgo(new Date(post.created_at));
            const comm = post.communities?.name || 'General';
            reply += `${i + 1}. "<strong>${escapeHtml(preview)}${preview.length >= 100 ? '...' : ''}</strong>"<br/><span style="font-size:.75rem;color:#6b7280;">${comm} · ${timeAgo}</span> <a href="#" class="cb-view-post" data-post-id="${post.id}" style="font-size:.72rem;color:var(--maroon);font-weight:600;text-decoration:none;">View Post →</a><br/><br/>`;
          });
          return reply;
        }
      }
      // ── Gemini AI fallback when DB has nothing ──
      const aiReply = await callGeminiAI(text);
      if (aiReply) return aiReply;
      return `🔍 No posts found. Try asking about announcements, lost items, or browse the communities directly.`;
    }

    // Format results
    const label = wantsAnnouncements ? 'announcements' : 'posts';
    const communityLabel = posts[0].communities?.name || 'all communities';
    const context = keywords.length > 0 && !isGenericQuery ? ` matching "<strong>${keywords.join(' ')}</strong>"` : '';
    let reply = `📋 Here are the latest <strong>${label}</strong>${context} from ${communityLabel}:<br/><br/>`;

    posts.forEach((post, i) => {
      const content = (post.title || post.content || '').replace(/^📢\s*\[ANNOUNCEMENT\]\s*/i, '');
      const preview = content.substring(0, 100);
      const timeAgo = formatTimeAgo(new Date(post.created_at));
      const comm = post.communities?.name || 'General';
      reply += `${i + 1}. "<strong>${escapeHtml(preview)}${preview.length >= 100 ? '...' : ''}</strong>"<br/><span style="font-size:.75rem;color:#6b7280;">${comm} · ${timeAgo}</span> <a href="#" class="cb-view-post" data-post-id="${post.id}" style="font-size:.72rem;color:var(--maroon);font-weight:600;text-decoration:none;">View Post →</a><br/><br/>`;
    });

    return reply;

  } catch (err) {
    console.error('Chatbot search error:', err);
    // Try Gemini as a fallback when DB fails
    const aiReply = await callGeminiAI(text);
    if (aiReply) return aiReply;
    return '⚠️ Sorry, I had trouble searching. Please try again.';
  }
}

// Search upcoming events
async function searchEvents(text) {
  try {
    const { data: events } = await db
      .from('campus_events')
      .select('*')
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString().split('T')[0])
      .order('event_date', { ascending: true })
      .limit(5);

    if (!events || events.length === 0) {
      return '📅 No upcoming events scheduled at the moment. Check back later or visit the Announcements page.';
    }

    let reply = '🎉 <strong>Upcoming Events:</strong><br/><br/>';
    events.forEach(ev => {
      const d = new Date(ev.event_date);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      reply += `📌 <strong>${escapeHtml(ev.title)}</strong><br/><span style="font-size:.75rem;color:#6b7280;">${dateStr} · ${escapeHtml(ev.location || 'CRMC Campus')}</span><br/><br/>`;
    });

    return reply;
  } catch (err) {
    return '⚠️ Could not load events. Please try again.';
  }
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

  // getBotReply is now async (queries database)
  getBotReply(text).then(reply => {
    typing.remove();
    appendMsg(reply, 'bot');
  }).catch(() => {
    typing.remove();
    appendMsg('⚠️ Something went wrong. Please try again.', 'bot');
  });
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

  // Chatbot "View Post" link click → open post in modal popup
  if (e.target.closest('.cb-view-post')) {
    e.preventDefault();
    const postId = e.target.closest('.cb-view-post').dataset.postId;
    if (!postId) return;

    // Close chatbot
    closeChatbot();

    // Open post in preview modal (like Facebook)
    openPostPreview(postId);
  }
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

// ── ACCOUNT STATUS BANNER ──
function showAccountStatusBanner(status) {
  const banner = document.createElement('div');
  banner.id = 'accountStatusBanner';
  banner.style.cssText = `
    position:sticky;top:60px;z-index:1500;
    background:#fee2e2;
    border-bottom:2px solid #ef4444;
    padding:.75rem 1.5rem;
    display:flex;align-items:center;gap:.75rem;
    font-family:'Poppins',sans-serif;font-size:.85rem;font-weight:500;
    color:#991b1b;
  `;
  banner.innerHTML = `
    <i class="fas fa-ban" style="font-size:1rem;flex-shrink:0;"></i>
    <span><strong>Account suspended.</strong> Your account has been suspended. Please contact your department admin.</span>
  `;
  document.body.insertBefore(banner, document.body.firstChild);

  // Disable posting
  setTimeout(() => {
    const btn = document.getElementById('openCreatePost');
    if (btn) { btn.disabled = true; btn.style.cssText += 'cursor:not-allowed;opacity:.5;'; }
    const card = document.querySelector('.create-post-card');
    if (card) card.style.opacity = '.6';
    document.querySelectorAll('.create-action-btn').forEach(b => b.disabled = true);
  }, 200);
}

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
let currentCommunityFilter = null;

// Load user data on page load
(async function initUser() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    window.location.href = 'landing-page/index.html';
    return;
  }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (profile) {
    loggedInUser = profile;

    // ── Update chatbot greeting with real name ──
    const greetingEl = document.getElementById('chatbotGreeting');
    if (greetingEl) {
      greetingEl.innerHTML = `👋 Hi ${profile.first_name}! I'm your <strong>CRMC Assistant</strong>. Ask me about exams, class suspensions, lost items, or campus announcements!`;
    }
    // Update dept suggestion button to match user's department
    const deptSugg = document.getElementById('cbDeptSugg');
    if (deptSugg) {
      const deptShort = profile.department?.match(/\(([^)]+)\)/)?.[1] || 'Dept';
      deptSugg.textContent = `📢 ${deptShort} updates`;
      deptSugg.dataset.q = `Latest ${deptShort} announcements?`;
    }

    // ── Show suspended banner and block posting if suspended ──
    if (profile.account_status === 'suspended') {
      showAccountStatusBanner(profile.account_status);
    }
    
    // Update UI with real user data
    const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
    const fullName = `${profile.first_name} ${profile.last_name}`;
    
    // Update modal
    const modalAvatar = document.querySelector('.cf-modal .post-avatar');
    const modalName = document.querySelector('.cf-modal-user > div > div');
    if (modalAvatar) {
      if (profile.avatar_url) {
        modalAvatar.innerHTML = `<img src="${profile.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${fullName}" />`;
      } else {
        modalAvatar.textContent = initials;
      }
    }
    if (modalName) modalName.textContent = fullName;
    
    // Build community dropdown dynamically
    const communitySelect = document.querySelector('.post-community-select');
    if (communitySelect) {
      // Map full department name to community slug
      const deptSlugMap = {
        'college of teacher education (cte)':              'cte',
        'college of business education (cbe)':             'cbe',
        'college of criminal justice education (ccje)':    'ccje',
        'college of computer studies (css)':               'css',
        'psychology (psych)':                              'psych',
      };
      const userDeptSlug = deptSlugMap[(profile.department || '').toLowerCase().trim()];

      // Fetch all communities then filter client-side (avoids .or() issues with special chars)
      const { data: communities } = await db
        .from('communities')
        .select('*')
        .order('type', { ascending: false }); // department first

      communitySelect.innerHTML = '';
      (communities || [])
        .filter(c => c.type === 'public' || c.slug === userDeptSlug)
        .filter(c => c.slug !== 'ssg-announcements') // admin-only, not for student posts
        .forEach(comm => {
          const option = document.createElement('option');
          option.value = comm.slug;
          option.textContent = comm.name;
          communitySelect.appendChild(option);
        });
      // Default selection to General
      communitySelect.value = 'general';
    }

    // ── Load posts immediately after user is ready ──
    document.querySelectorAll('.post-card').forEach(p => p.style.display = 'none');
    document.getElementById('feedTitle').textContent = 'Campus Feed';
    document.getElementById('feedSub').textContent = 'All posts from your communities';
    document.getElementById('feedHeaderIcon').innerHTML = '<i class="fas fa-home"></i>';
    currentCommunityFilter = null;
    await loadPostsFromDB();
    await loadSidebarCommunities();

    // Handle ?highlight=postId from profile page clicks
    const urlParams   = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');
    if (highlightId) {
      setTimeout(() => {
        const postCard = document.querySelector(`.post-card[data-post-id="${highlightId}"]`);
        if (postCard) {
          postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          postCard.classList.add('post-highlighted');
          setTimeout(() => postCard.classList.remove('post-highlighted'), 2500);
        }
      }, 500);
    }
  }
})();

// Wire up the Post button
let selectedImageFiles = []; // Changed to array
let selectedImagePreviewUrls = []; // Changed to array
const MAX_IMAGES = 5;

// Handle image upload button click
document.getElementById('uploadImageBtn')?.addEventListener('click', function(e) {
  e.preventDefault();
  document.getElementById('imageUploadInput').click();
});

// Handle image file selection (multiple)
document.getElementById('imageUploadInput')?.addEventListener('change', function(e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;
  
  // Check if adding these files would exceed the limit
  if (selectedImageFiles.length + files.length > MAX_IMAGES) {
    showToast(`You can only upload up to ${MAX_IMAGES} images`, 'error');
    return;
  }
  
  // Validate each file
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      showToast('Please select only image files', 'error');
      continue;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      showToast(`${file.name} is too large. Max 5MB per image`, 'error');
      continue;
    }
    
    selectedImageFiles.push(file);
    
    // Show preview
    const reader = new FileReader();
    reader.onload = function(e) {
      selectedImagePreviewUrls.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  }
  
  // Clear input so same file can be selected again if needed
  e.target.value = '';
});

// Render image preview grid
function renderImagePreviews() {
  const previewGrid = document.getElementById('imagePreviewGrid');
  const previewSection = document.getElementById('imageUploadSection');
  
  if (selectedImageFiles.length === 0) {
    previewSection.style.display = 'none';
    return;
  }
  
  previewSection.style.display = 'block';
  
  previewGrid.innerHTML = selectedImagePreviewUrls.map((url, index) => `
    <div class="cf-image-preview-item">
      <img src="${url}" alt="Preview ${index + 1}" />
      <button type="button" class="remove-single-image" data-index="${index}">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `).join('');
  
  // Add event listeners to remove buttons
  previewGrid.querySelectorAll('.remove-single-image').forEach(btn => {
    btn.addEventListener('click', function() {
      const index = parseInt(this.dataset.index);
      removeSingleImage(index);
    });
  });
}

// Remove a single image by index
function removeSingleImage(index) {
  selectedImageFiles.splice(index, 1);
  selectedImagePreviewUrls.splice(index, 1);
  renderImagePreviews();
}

document.querySelector('.cf-modal .btn-primary')?.addEventListener('click', async function() {
  const titleInput = document.querySelector('.cf-post-title-input');
  const textarea = document.querySelector('.cf-post-textarea');
  const title = titleInput?.value.trim();
  const content = textarea?.value.trim();
  const isAnon = document.getElementById('postAnonymousCheckbox')?.checked;
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
    
    let imageUrls = [];
    
    // Upload images if selected
    if (selectedImageFiles.length > 0) {
      this.textContent = `Uploading ${selectedImageFiles.length} image(s)...`;
      
      for (let i = 0; i < selectedImageFiles.length; i++) {
        const file = selectedImageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${loggedInUser.id}/${Date.now()}_${i}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await db
          .storage
          .from('post-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(`Failed to upload image ${i + 1}: ` + uploadError.message);
        }
        
        // Get public URL
        const { data: urlData } = db
          .storage
          .from('post-images')
          .getPublicUrl(fileName);
        
        imageUrls.push(urlData.publicUrl);
      }
      
      this.textContent = 'Creating post...';
    }
    
    const { data, error } = await db.from('posts').insert({
      community_id: community.id,
      author_id: loggedInUser.id,
      is_anonymous: isAnon || false,
      title: title || null,
      content: content,
      image_url: imageUrls.length > 0 ? imageUrls : null
    }).select().single();
    
    if (error) throw error;
    
    showToast('Post created successfully!', 'success');
    if (titleInput) titleInput.value = '';
    textarea.value = '';
    
    // Reset image upload
    selectedImageFiles = [];
    selectedImagePreviewUrls = [];
    document.getElementById('imageUploadSection').style.display = 'none';
    document.getElementById('imagePreviewGrid').innerHTML = '';
    document.getElementById('imageUploadInput').value = '';
    
    document.getElementById('createPostModal').hidden = true;
    document.body.style.overflow = '';
    
    // Reload feed to show new post
    setTimeout(() => loadPostsFromDB(), 500);

    // ── Run AI sentiment analysis in background (non-blocking) ──
    runSentimentAnalysis(data.id, content, title || '').then(result => {
      if (result.shouldFlag) {
        console.warn('⚠️ Post flagged by AI:', result.reason);
        // Show warning to the user
        showToast('⚠️ Your post has been flagged for review. Please ensure it follows community guidelines.', 'error');
      }
    });

    // ── Parse @mentions in post content ──
    processMentions(content + ' ' + (title || ''), data.id);
    
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
    // ── Step 1: Resolve community IDs to filter by ──
    let communityIds = [];

    if (currentCommunityFilter) {
      // Single community — always look up by slug (works for both dept slugs like 'css' and public slugs like 'general')
      const { data: comm } = await db
        .from('communities')
        .select('id')
        .eq('slug', currentCommunityFilter)
        .single();
      if (comm) communityIds = [comm.id];
    } else {
      // All posts — fetch public communities + user's dept community by slug
      const deptSlugMap = {
        'college of teacher education (cte)':              'cte',
        'college of business education (cbe)':             'cbe',
        'college of criminal justice education (ccje)':    'ccje',
        'college of computer studies (css)':               'css',
        'psychology (psych)':                              'psych',
      };
      const userDeptSlug = deptSlugMap[(loggedInUser.department || '').toLowerCase().trim()];

      // Fetch all public communities + user's dept community
      const { data: communities } = await db
        .from('communities')
        .select('id, slug, type');

      communityIds = (communities || [])
        .filter(c => c.type === 'public' || c.slug === userDeptSlug)
        .map(c => c.id);
    }

    if (communityIds.length === 0) {
      document.querySelector('.main-feed').querySelectorAll('.post-card, .feed-empty-state').forEach(el => el.remove());
      return;
    }

    // ── Step 2: Build query with community filter ──
    let query = db
      .from('posts')
      .select(`*, profiles:author_id (first_name, last_name, avatar_url, admin_role), communities:community_id (name, slug)`)
      .in('community_id', communityIds)

    // ── Step 3: Apply tab filter ──
    if (currentFeedTab === 'pinned') {
      query = query
        .eq('is_pinned', true)
        .order('created_at', { ascending: false });
    } else if (currentFeedTab === 'trending') {
      // Trending: most likes in last 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query
        .gte('created_at', weekAgo)
        .order('like_count', { ascending: false })
        .order('comment_count', { ascending: false })
        .order('created_at', { ascending: false });
    } else if (currentFeedTab === 'latest') {
      query = query.order('created_at', { ascending: false });
    } else {
      // All — pinned first, then newest
      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
    }

    query = query.limit(20);
    
    const { data: posts, error } = await query;
    
    if (error) throw error;

    // Clear posts and empty state
    const mainFeed = document.querySelector('.main-feed');
    mainFeed.querySelectorAll('.post-card, .feed-empty-state').forEach(p => p.remove());

    if (!posts || posts.length === 0) {
      const emptyMsg = {
        pinned:   { icon: 'fa-thumbtack', text: 'No pinned posts yet.' },
        trending: { icon: 'fa-fire',      text: 'No trending posts in the last 7 days.' },
        latest:   { icon: 'fa-clock',     text: 'No posts yet. Be the first to post!' },
        all:      { icon: 'fa-newspaper', text: 'No posts yet. Be the first to post!' },
      }[currentFeedTab] || { icon: 'fa-newspaper', text: 'No posts found.' };
      const emptyEl = document.createElement('div');
      emptyEl.className = 'feed-empty-state';
      emptyEl.innerHTML = `<i class="fas ${emptyMsg.icon}"></i><p>${emptyMsg.text}</p>`;
      mainFeed.appendChild(emptyEl);
      return;
    }

    const postIds = posts.map(p => p.id);

    // ── Batch fetch all likes and comments in just 2 queries ──
    const [likesRes, commentsRes, userLikesRes] = await Promise.all([
      // All like counts for these posts
      db.from('post_likes')
        .select('post_id')
        .in('post_id', postIds),

      // All comment counts for these posts
      db.from('comments')
        .select('post_id')
        .in('post_id', postIds),

      // Which of these posts the current user liked
      db.from('post_likes')
        .select('post_id')
        .in('post_id', postIds)
        .eq('user_id', loggedInUser.id)
    ]);

    // Build lookup maps
    const likeCountMap   = {};
    const commentCountMap = {};
    const userLikedSet   = new Set();

    (likesRes.data || []).forEach(row => {
      likeCountMap[row.post_id] = (likeCountMap[row.post_id] || 0) + 1;
    });
    (commentsRes.data || []).forEach(row => {
      commentCountMap[row.post_id] = (commentCountMap[row.post_id] || 0) + 1;
    });
    (userLikesRes.data || []).forEach(row => {
      userLikedSet.add(row.post_id);
    });

    // Attach counts to each post
    posts.forEach(post => {
      post.like_count     = likeCountMap[post.id]    || 0;
      post.comment_count  = commentCountMap[post.id] || 0;
      post.user_has_liked = userLikedSet.has(post.id);
    });
    
    // Render posts
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
  
  // ── Detect if this is an announcement ──
  const isAnnouncement = post.content?.startsWith('📢 [ANNOUNCEMENT]') 
    || post.is_pinned 
    || post.communities?.slug === 'ssg-announcements';
  const displayContent = post.content?.replace(/^📢\s*\[ANNOUNCEMENT\]\s*/i, '') || post.content;
  
  let authorName = 'Anonymous';
  let authorAvatar = '<div class="post-avatar post-avatar--anon"><i class="fas fa-user-secret"></i></div>';
  
  if (!isAnon && author) {
    authorName = `${author.first_name} ${author.last_name}`;
    const initials = (author.first_name[0] + author.last_name[0]).toUpperCase();
    // Show avatar photo if available, otherwise initials
    if (author.avatar_url) {
      authorAvatar = `<div class="post-avatar" style="background:linear-gradient(135deg,#6B0F1A,#8b1525);overflow:hidden;">
        <img src="${author.avatar_url}" style="width:100%;height:100%;object-fit:cover;" alt="${authorName}" />
      </div>`;
    } else {
      authorAvatar = `<div class="post-avatar" style="background:linear-gradient(135deg,#6B0F1A,#8b1525);">${initials}</div>`;
    }
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

  // ── Detect admin author ──
  const authorRole = author?.admin_role || null;
  const isAdmin = authorRole && authorRole !== 'student';
  // No separate admin badge — the account name already identifies them (e.g., "CSS Admin")

  // ── Announcement badge HTML ──
  const announcementBadge = isAnnouncement
    ? `<span class="post-announcement-badge"><i class="fas fa-bullhorn"></i> Announcement</span>`
    : '';

  // ── AI Flagged badge (shows which detection method caught it) ──
  let flaggedBadge = '';
  if (post.is_flagged) {
    const reason = (post.flag_reason || '').toLowerCase();
    // Slang/coded words that required "AI decoding" to understand
    const slangCodes = ['8080','8o8o','g4g0','bog0','kms','kys','fml','stfu','gtfo','pota','ptngina','potangina','tangina','tanginamo','kingina','ulul','engot','ungas','buang','buanga','yawa','giatay','bogo','siraulo'];
    
    // Check if the flag reason mentions a slang/coded word
    const isSlangDetected = slangCodes.some(code => reason.includes(code));
    // Or if explicitly marked as AI
    const isAIDetected = reason.includes('ai confidence') || reason.includes('ai sentiment') || reason.includes('coded/slang');
    
    if (isAIDetected || isSlangDetected) {
      flaggedBadge = `<span class="post-flagged-badge post-flagged--ai"><i class="fas fa-robot"></i> AI Detected</span>`;
    } else {
      flaggedBadge = `<span class="post-flagged-badge"><i class="fas fa-exclamation-triangle"></i> Keyword Flagged</span>`;
    }
  }

  // ── Add highlight class for announcements ──
  if (isAnnouncement) {
    article.classList.add('post-card--announcement');
  }

  // ── Add highlight class for AI flagged posts ──
  if (post.is_flagged) {
    article.classList.add('post-card--flagged');
  }
  
  article.innerHTML = `
    <div class="post-left">${isAnon ? authorAvatar : `<a href="profile.html?id=${post.author_id}">${authorAvatar}</a>`}</div>
    <div class="post-body">
      <div class="post-meta">
        <span class="post-author">${isAnon ? authorName : `<a href="profile.html?id=${post.author_id}" style="color:inherit;text-decoration:none;" class="post-author-link">${authorName}</a>`}</span>
        ${announcementBadge}
        ${flaggedBadge}
        <span class="post-dept-tag ${isAdmin && !isAnon ? 'tag-admin' : tagClass}">${communityName}</span>
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
        ` : `
          <div class="post-menu-wrapper">
            <button class="post-menu-btn" data-post-id="${post.id}" aria-label="Post options">
              <i class="fas fa-ellipsis-v"></i>
            </button>
            <div class="post-menu-dropdown" id="post-menu-${post.id}" hidden>
              <button class="post-menu-item post-copy-link-btn" data-post-id="${post.id}">
                <i class="fas fa-link"></i> Copy Link
              </button>
              <button class="post-menu-item post-report-btn" data-post-id="${post.id}">
                <i class="fas fa-flag"></i> Report Post
              </button>
            </div>
          </div>
        `}
      </div>
      ${post.title ? `<h2 class="post-title">${escapeHtml(post.title)}</h2>` : ''}
      <p class="post-content">${escapeHtml(displayContent)}</p>
      ${post.image_url && Array.isArray(post.image_url) && post.image_url.length > 0 ? (() => {
        const imgs = post.image_url;
        const shown = imgs.slice(0, 5);
        const extra = imgs.length > 5 ? imgs.length - 4 : 0;
        return `<div class="post-images-grid">
          ${shown.map((url, i) => `
            <div class="post-image-item" onclick="window.open('${url}', '_blank')">
              <img src="${url}" alt="Post image" loading="lazy" />
              ${extra && i === 3 ? `<div class="img-more-overlay">+${extra}</div>` : ''}
            </div>
          `).join('')}
        </div>`;
      })() : post.image_url && typeof post.image_url === 'string' ? `
        <div class="post-image" onclick="window.open('${post.image_url}', '_blank')">
          <img src="${post.image_url}" alt="Post image" loading="lazy" />
        </div>
      ` : ''}
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
          <div class="comment-input-avatar">${loggedInUser?.avatar_url ? `<img src="${loggedInUser.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : (loggedInUser ? (loggedInUser.first_name[0] + loggedInUser.last_name[0]).toUpperCase() : '--')}</div>
          <input type="text" class="comment-input top-level-comment-input" placeholder="Write a comment…" data-post-id="${post.id}" />
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

// Format comment text — bold the mentioned name at the start of replies
function formatCommentMention(text) {
  if (!text) return '';
  // Match a name pattern at start: "FirstName LastName rest of message"
  // Names are typically 2-3 words with capital letters
  const match = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s/);
  if (match) {
    const name = match[1];
    const rest = text.substring(name.length);
    return `<strong class="comment-mention">${name}</strong>${rest}`;
  }
  return text;
}

// Toggle comment section
document.addEventListener('click', async (e) => {
  // Skip events from inside the post preview modal — it has its own handlers
  if (e.target.closest('#postPreviewModal')) return;

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

  // Handle report post
  if (e.target.closest('.post-report-btn')) {
    const btn = e.target.closest('.post-report-btn');
    const postId = btn.dataset.postId;
    // Close the menu dropdown
    const dropdown = btn.closest('.post-menu-dropdown');
    if (dropdown) dropdown.hidden = true;
    openReportModal(postId);
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
  
  // Handle top-level comment send button
  if (e.target.closest('.comment-send-btn') && !e.target.closest('.reply-send-btn')) {
    const btn   = e.target.closest('.comment-send-btn');
    const postId = btn.dataset.postId;
    // Top-level input: scoped inside the comment-input-wrapper (not inside a reply box)
    const input = document.querySelector(
      `#comments-${postId} .top-level-comment-input`
    );
    await submitComment(postId, input);
    return;
  }

  // Handle reply send button
  if (e.target.closest('.reply-send-btn')) {
    const btn      = e.target.closest('.reply-send-btn');
    const postId   = btn.dataset.postId;
    const parentId = btn.dataset.parentId;
    const input    = document.querySelector(
      `#reply-input-${parentId} .reply-input`
    );
    await submitComment(postId, input, parentId);
    return;
  }

  // Handle reply button toggle
  if (e.target.closest('.comment-reply-btn')) {
    const btn        = e.target.closest('.comment-reply-btn');
    const commentId  = btn.dataset.commentId;
    const authorName = btn.dataset.author || '';
    const replyBox   = document.getElementById(`reply-input-${commentId}`);
    if (!replyBox) return;
    const isHidden = replyBox.style.display === 'none';
    // Close all other open reply boxes first
    document.querySelectorAll('.reply-input-wrapper').forEach(b => b.style.display = 'none');
    replyBox.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      const input = replyBox.querySelector('.reply-input');
      if (input) {
        const replyToName = btn.dataset.author || '';
        input.value = replyToName ? `${replyToName} ` : '';
        input.focus();
        // Move cursor to end
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    return;
  }

  // Handle comment delete button — show styled modal
  if (e.target.closest('.comment-delete-btn')) {
    const btn       = e.target.closest('.comment-delete-btn');
    const commentId = btn.dataset.commentId;
    const postId    = btn.dataset.postId;
    
    // Store pending delete info and show modal
    window._pendingCommentDelete = { commentId, postId };
    document.getElementById('deleteCommentModal').hidden = false;
    document.body.style.overflow = 'hidden';
    return;
  }
  
  // Close dropdowns when clicking outside
  if (!e.target.closest('.post-menu-wrapper')) {
    document.querySelectorAll('.post-menu-dropdown').forEach(d => d.hidden = true);
  }
});

// Handle Enter key for comment and reply inputs
document.addEventListener('keypress', async (e) => {
  if (e.key !== 'Enter') return;
  // Skip if inside preview modal — it has its own Enter handler
  if (e.target.closest('#postPreviewModal')) return;

  if (e.target.classList.contains('reply-input')) {
    const input    = e.target;
    const postId   = input.dataset.postId;
    const parentId = input.dataset.parentId;
    await submitComment(postId, input, parentId);
    return;
  }

  if (e.target.classList.contains('comment-input') && !e.target.classList.contains('reply-input')) {
    const input  = e.target;
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
let postToDelete = null;

async function deletePost(postId) {
  if (!loggedInUser) {
    showToast('You must be logged in', 'error');
    return;
  }
  
  // Store post ID for later
  postToDelete = postId;
  
  // Show custom confirmation modal
  const deleteModal = document.getElementById('deleteConfirmModal');
  deleteModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

// Handle delete confirmation
document.getElementById('confirmDeleteBtn')?.addEventListener('click', async function() {
  if (!postToDelete) return;
  
  const deleteModal = document.getElementById('deleteConfirmModal');
  const btn = this;
  
  btn.disabled = true;
  btn.textContent = 'Deleting...';
  
  try {
    // Delete from database (CASCADE will delete related comments and likes)
    const { error } = await db
      .from('posts')
      .delete()
      .eq('id', postToDelete)
      .eq('author_id', loggedInUser.id); // Ensure user can only delete their own posts
    
    if (error) throw error;
    
    // Remove from UI
    const postCard = document.querySelector(`.post-card[data-post-id="${postToDelete}"]`);
    if (postCard) {
      postCard.style.opacity = '0';
      postCard.style.transform = 'scale(0.95)';
      postCard.style.transition = 'all 0.3s ease';
      setTimeout(() => postCard.remove(), 300);
    }
    
    // Close modal
    deleteModal.hidden = true;
    document.body.style.overflow = '';
    postToDelete = null;
    
    showToast('Post deleted successfully', 'success');
    
  } catch (err) {
    console.error('Error deleting post:', err);
    showToast('Failed to delete post: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
});

// Handle delete cancel
document.getElementById('cancelDeleteBtn')?.addEventListener('click', function() {
  const deleteModal = document.getElementById('deleteConfirmModal');
  deleteModal.hidden = true;
  document.body.style.overflow = '';
  postToDelete = null;
});

// Close modal when clicking outside
document.getElementById('deleteConfirmModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    this.hidden = true;
    document.body.style.overflow = '';
    postToDelete = null;
  }
});

// ── DELETE COMMENT MODAL HANDLERS ──
document.getElementById('confirmDeleteCommentBtn')?.addEventListener('click', async function() {
  const pending = window._pendingCommentDelete;
  if (!pending) return;

  this.disabled = true;
  this.textContent = 'Deleting...';

  try {
    const { error } = await db.from('comments').delete()
      .eq('id', pending.commentId)
      .eq('author_id', loggedInUser.id);
    if (error) throw error;

    await loadComments(pending.postId);
    const { count } = await db.from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', pending.postId);
    const commentBtn = document.querySelector(`.post-comment-btn[data-post-id="${pending.postId}"]`);
    if (commentBtn) commentBtn.querySelector('span').textContent = count || 0;
    
    // Also refresh preview modal if delete came from there
    if (pending.fromPreview) {
      await refreshPreviewComments(pending.postId);
    }
    
    showToast('Comment deleted', 'success');
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  } finally {
    this.disabled = false;
    this.textContent = 'Delete';
    document.getElementById('deleteCommentModal').hidden = true;
    document.body.style.overflow = '';
    window._pendingCommentDelete = null;
  }
});

document.getElementById('cancelDeleteCommentBtn')?.addEventListener('click', function() {
  document.getElementById('deleteCommentModal').hidden = true;
  document.body.style.overflow = '';
  window._pendingCommentDelete = null;
});

document.getElementById('deleteCommentModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    this.hidden = true;
    document.body.style.overflow = '';
    window._pendingCommentDelete = null;
  }
});

// ══════════════════════════════════════════════════════════════════
// REPORT POST — Module 2 Enhancement
// ══════════════════════════════════════════════════════════════════

let postToReport = null;

function openReportModal(postId) {
  postToReport = postId;
  const modal = document.getElementById('reportPostModal');
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  // Reset form
  document.querySelectorAll('input[name="reportReason"]').forEach(r => r.checked = false);
  document.getElementById('reportDescription').value = '';
}

// Close report modal
document.getElementById('closeReportModal')?.addEventListener('click', () => {
  document.getElementById('reportPostModal').hidden = true;
  document.body.style.overflow = '';
  postToReport = null;
});
document.getElementById('cancelReportBtn')?.addEventListener('click', () => {
  document.getElementById('reportPostModal').hidden = true;
  document.body.style.overflow = '';
  postToReport = null;
});
document.getElementById('reportPostModal')?.addEventListener('click', function(e) {
  if (e.target === this) {
    this.hidden = true;
    document.body.style.overflow = '';
    postToReport = null;
  }
});

// Submit report
document.getElementById('submitReportBtn')?.addEventListener('click', async function() {
  if (!postToReport || !loggedInUser) return;

  const selectedReason = document.querySelector('input[name="reportReason"]:checked');
  if (!selectedReason) {
    showToast('Please select a reason for reporting', 'error');
    return;
  }

  const reason = selectedReason.value;
  const description = document.getElementById('reportDescription').value.trim();

  this.disabled = true;
  this.textContent = 'Submitting...';

  try {
    // Check if user already reported this post
    const { data: existing } = await db
      .from('post_reports')
      .select('id')
      .eq('post_id', postToReport)
      .eq('reporter_id', loggedInUser.id)
      .limit(1);

    if (existing && existing.length > 0) {
      showToast('You have already reported this post', 'error');
      document.getElementById('reportPostModal').hidden = true;
      document.body.style.overflow = '';
      postToReport = null;
      return;
    }

    // Insert report
    const { error } = await db.from('post_reports').insert({
      post_id: postToReport,
      reporter_id: loggedInUser.id,
      reason: reason,
      description: description || null,
    });

    if (error) throw error;

    // Notify all SSG admins about the report
    try {
      const { data: ssgAdmins } = await db
        .from('profiles')
        .select('id')
        .eq('admin_role', 'SSG');

      if (ssgAdmins && ssgAdmins.length > 0) {
        const reporterName = `${loggedInUser.first_name} ${loggedInUser.last_name}`;
        const notifications = ssgAdmins.map(admin => ({
          user_id: admin.id,
          type: 'mention',
          message: `🚨 ${reporterName} reported a post for: ${reason}`,
          link: `/campusfeed.html?post=${postToReport}`,
          is_read: false,
        }));
        await db.from('notifications').insert(notifications);
      }
    } catch (notifErr) {
      console.error('Failed to notify admins:', notifErr);
    }

    showToast('Report submitted. An admin will review it.', 'success');
    document.getElementById('reportPostModal').hidden = true;
    document.body.style.overflow = '';
    postToReport = null;

  } catch (err) {
    console.error('Error submitting report:', err);
    showToast('Failed to submit report: ' + err.message, 'error');
  } finally {
    this.disabled = false;
    this.innerHTML = '<i class="fas fa-flag"></i> Submit Report';
  }
});

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

// ── COMMENT RENDERING HELPER ──
function buildCommentHTML(comment, replies = []) {
  const isAnon = comment.is_anonymous;
  const author = comment.profiles;

  let authorName    = 'Anonymous';
  let authorInitials = '<i class="fas fa-user-secret" style="font-size:.7rem;"></i>';
  let avatarHtml = '';

  if (!isAnon && author) {
    authorName     = `${author.first_name} ${author.last_name}`;
    authorInitials = (author.first_name[0] + author.last_name[0]).toUpperCase();
    if (author.avatar_url) {
      avatarHtml = `<img src="${author.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${authorName}" />`;
    } else {
      avatarHtml = authorInitials;
    }
  } else {
    avatarHtml = authorInitials;
  }

  const timeAgo   = formatTimeAgo(new Date(comment.created_at));
  const isOwn     = loggedInUser && comment.author_id === loggedInUser.id;

  // Detect admin commenter
  const commentRole = author?.admin_role || null;
  const isAdminComment = commentRole && commentRole !== 'student' && !isAnon;
  const adminRoleLabels = { SSG: 'SSG', SSG_OFFICER: 'SSG Officer', CTE: 'CTE', CSS: 'CSS', CBE: 'CBE', PSYCH: 'PSYCH', CCJE: 'CCJE' };
  const commentAdminBadge = isAdminComment
    ? `<span class="comment-admin-badge"><i class="fas fa-shield-alt"></i> ${adminRoleLabels[commentRole] || 'Admin'}</span>`
    : '';
  const adminNameClass = isAdminComment ? ' comment-author--admin' : '';

  // Build nested replies HTML
  const repliesHTML = replies.length > 0
    ? `<div class="comment-replies">
        ${replies.map(reply => buildCommentHTML(reply, [])).join('')}
       </div>`
    : '';

  return `
    <div class="comment-item" data-comment-id="${comment.id}">
      <div class="comment-avatar ${isAnon ? 'comment-avatar-anon' : ''}${isAdminComment ? ' comment-avatar--admin' : ''}">${avatarHtml}</div>
      <div class="comment-content-wrapper">
        <div class="comment-header">
          <span class="comment-author${adminNameClass}">${isAnon ? authorName : `<a href="profile.html?id=${comment.author_id}" style="color:inherit;text-decoration:none;">${authorName}</a>`}</span>
          ${commentAdminBadge}
          <span class="comment-time">${timeAgo}</span>
          ${isOwn ? `<button class="comment-delete-btn" data-comment-id="${comment.id}" data-post-id="${comment.post_id}" title="Delete comment"><i class="fas fa-trash"></i></button>` : ''}
        </div>
        <div class="comment-text">${formatCommentMention(escapeHtml(comment.content))}</div>
        <button class="comment-reply-btn" data-comment-id="${comment.id}" data-post-id="${comment.post_id}" data-author="${authorName}">
          <i class="fas fa-reply"></i> Reply
        </button>
        <div class="reply-input-wrapper" id="reply-input-${comment.id}" style="display:none;">
          <div class="comment-input-avatar">${loggedInUser?.avatar_url ? `<img src="${loggedInUser.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : (loggedInUser ? (loggedInUser.first_name[0] + loggedInUser.last_name[0]).toUpperCase() : '--')}</div>
          <input type="text" class="comment-input reply-input" placeholder="Reply to ${authorName}…"
                 data-post-id="${comment.post_id}" data-parent-id="${comment.id}" />
          <button class="comment-send-btn reply-send-btn" data-post-id="${comment.post_id}" data-parent-id="${comment.id}">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
        ${repliesHTML}
      </div>
    </div>
  `;
}

// Load comments for a post
async function loadComments(postId) {
  const commentList = document.getElementById(`comment-list-${postId}`);

  try {
    // Fetch all comments + replies for this post in one query
    const { data: allComments, error } = await db
      .from('comments')
      .select(`*, profiles:author_id (id, first_name, last_name, admin_role, avatar_url)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (!allComments || allComments.length === 0) {
      commentList.innerHTML = '<div class="no-comments">No comments yet. Be the first to comment!</div>';
      return;
    }

    // Separate top-level comments from replies
    const topLevel = allComments.filter(c => !c.parent_id);
    const replyMap = {};
    
    allComments.filter(c => c.parent_id).forEach(reply => {
      const parentExists = allComments.some(c => c.id === reply.parent_id);
      if (!parentExists) {
        topLevel.push(reply);
      } else {
        let rootId = reply.parent_id;
        let safety = 20;
        while (safety > 0) {
          const parent = allComments.find(c => c.id === rootId);
          if (!parent || !parent.parent_id) break;
          rootId = parent.parent_id;
          safety--;
        }
        if (!replyMap[rootId]) replyMap[rootId] = [];
        replyMap[rootId].push(reply);
      }
    });

    commentList.innerHTML = topLevel
      .map(comment => buildCommentHTML(comment, replyMap[comment.id] || []))
      .join('');

  } catch (err) {
    console.error('Error loading comments:', err);
    commentList.innerHTML = '<div class="comment-error">Failed to load comments</div>';
  }
}

// Submit a comment or reply
async function submitComment(postId, inputElement, parentId = null) {
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
    // Trace parentId to root top-level comment (Facebook-style flat threading)
    let rootParentId = parentId;
    if (rootParentId) {
      let safety = 10;
      while (safety > 0) {
        const { data: parentComment } = await db.from('comments').select('parent_id').eq('id', rootParentId).single();
        if (!parentComment || !parentComment.parent_id) break;
        rootParentId = parentComment.parent_id;
        safety--;
      }
    }

    const payload = {
      post_id:      postId,
      author_id:    loggedInUser.id,
      is_anonymous: false,
      content:      content,
    };
    if (rootParentId) payload.parent_id = rootParentId;

    const { error } = await db.from('comments').insert(payload);
    if (error) throw error;

    // Clear input and hide reply box if it was a reply
    inputElement.value = '';
    if (parentId) {
      const replyBox = document.getElementById(`reply-input-${parentId}`);
      if (replyBox) replyBox.style.display = 'none';
    }

    // Reload comments to show the new one
    await loadComments(postId);

    // Update comment count badge (only top-level + replies count)
    const { count } = await db
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const commentBtn = document.querySelector(`.post-comment-btn[data-post-id="${postId}"]`);
    if (commentBtn) commentBtn.querySelector('span').textContent = count || 0;

    showToast(parentId ? 'Reply posted!' : 'Comment posted!', 'success');

    // ── Parse @mentions and send notifications ──
    processMentions(content, postId);

  } catch (err) {
    console.error('Error posting comment:', err);
    showToast('Failed to post: ' + err.message, 'error');
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
      // Department community — map the user's full department string to a DEPT_CONFIG slug
      // profiles.department stores e.g. "College of Computer Studies (CSS)"
      // DEPT_CONFIG keys are the community slugs: cte, css, cbe, ccje, psych
      const deptSlugMap = {
        'college of teacher education (cte)':              'cte',
        'college of business education (cbe)':             'cbe',
        'college of criminal justice education (ccje)':    'ccje',
        'college of computer studies (css)':               'css',
        'psychology (psych)':                              'psych',
      };
      const userDeptFull  = (loggedInUser?.department || '').toLowerCase().trim();
      const deptSlug      = deptSlugMap[userDeptFull] || null;
      const deptConf      = deptSlug ? DEPT_CONFIG[deptSlug] : null;

      if (deptConf) {
        feedTitle.textContent = deptConf.title;
        feedSub.textContent = deptConf.sub;
        feedIcon.className = `feed-icon ${deptConf.iconClass}`;
        feedIcon.innerHTML = `<img src="${deptConf.img}" alt="${deptConf.imgAlt}" style="width:100%;height:100%;object-fit:contain;" />`;
      } else {
        feedTitle.textContent = 'My Department';
        feedSub.textContent = 'Department posts';
        feedIcon.className = 'feed-icon';
        feedIcon.innerHTML = '<i class="fas fa-graduation-cap"></i>';
      }
      // Store the community slug (e.g. 'css') so loadPostsFromDB can do .eq('slug', ...)
      currentCommunityFilter = deptSlug || 'dept';
    } else {
      // Public community
      const communityNames = {
        'general': { name: 'General Discussion', sub: 'Open discussions for all', icon: 'fa-comments' },
        'lostandfound': { name: 'Lost & Found', sub: 'Report lost items', icon: 'fa-search' },
        'academic': { name: 'Academic Help', sub: 'Study help', icon: 'fa-book-open' },
        'marketplace': { name: 'Marketplace', sub: 'Borrow & lend', icon: 'fa-handshake' },
        'campus': { name: 'Campus Discussions', sub: 'Campus life', icon: 'fa-university' },
        'support': { name: 'Student Support', sub: 'Help & guidance', icon: 'fa-hands-helping' },
        'ssg':    { name: 'SSG — Student Government', sub: 'Ask & connect with SSG', icon: 'fa-star' }
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
      else if (feedSlug === 'ssg') feedIcon.classList.add('ci-ssg');
      else feedIcon.classList.add('ci-general');
      
      currentCommunityFilter = feedSlug;
    }
    
    // Reload posts with filter
    await loadPostsFromDB();
  });
});


// ══════════════════════════════════════════════════════════════════
// NOTIFICATIONS SYSTEM — Module 4
// ══════════════════════════════════════════════════════════════════

// Icon map per notification type
const NOTIF_ICONS = {
  like:         { icon: 'fa-heart',        cls: 'ni-like'    },
  comment:      { icon: 'fa-comment',      cls: 'ni-comment' },
  reply:        { icon: 'fa-reply',        cls: 'ni-comment' },
  announcement: { icon: 'fa-bullhorn',     cls: 'ni-urgent'  },
  mention:      { icon: 'fa-at',           cls: 'ni-dept'    },
};

// Load notifications from DB and render dropdown
async function loadNotifications() {
  if (!loggedInUser) return;

  const notifList = document.getElementById('notifList');
  if (!notifList) return;

  try {
    const { data: notifications, error } = await db
      .from('notifications')
      .select('*')
      .eq('user_id', loggedInUser.id)
      .order('created_at', { ascending: false })
      .limit(15);

    if (error) throw error;

    if (!notifications || notifications.length === 0) {
      notifList.innerHTML = `
        <div style="text-align:center;padding:2rem 1rem;color:var(--gray-400);">
          <i class="fas fa-bell-slash" style="font-size:1.5rem;margin-bottom:.5rem;display:block;"></i>
          No notifications yet
        </div>`;
      updateNotifBadge(0);
      return;
    }

    notifList.innerHTML = notifications.map(n => {
      const typeInfo = NOTIF_ICONS[n.type] || NOTIF_ICONS.mention;
      const timeAgo  = formatTimeAgo(new Date(n.created_at));
      const unreadClass = n.is_read ? '' : 'notif-unread';

      // Extract post ID from the link field (format: /campusfeed.html?post=UUID)
      const postId = n.link ? n.link.split('post=')[1] : null;

      // Clean up message — strip 📢 [ANNOUNCEMENT] prefix for cleaner display
      let displayMsg = (n.message || '').replace(/📢\s*\[ANNOUNCEMENT\]\s*/gi, '');
      // Also strip trailing quote marks and leading quotes from "posted:" format
      displayMsg = displayMsg.replace(/\s*posted:\s*"(.+)"$/i, ': $1');

      // Highlight the person's name (bold it in the notification text)
      // Handles: "Name liked...", "Name commented...", "Name replied...", "📢 Name: ...", "Name mentioned..."
      const nameClass = n.type === 'announcement' ? 'notif-name notif-name--admin' : 'notif-name';
      displayMsg = displayMsg
        .replace(/^(📢\s*)([^:]+?):\s*/, `$1<strong class="${nameClass}">$2</strong>: `)
        .replace(/^(.+?)\s+(liked your post|commented on your post|replied to your comment|mentioned you)/, `<strong class="${nameClass}">$1</strong> $2`);

      // Type label for visual clarity
      const typeLabels = {
        like: 'Like',
        comment: 'Comment',
        reply: 'Reply',
        announcement: 'Announcement',
        mention: 'Mention',
      };
      const typeLabel = typeLabels[n.type] || '';

      // Urgency level (from DB or inferred from type)
      const urgency = n.urgency || (n.type === 'like' ? 'low' : n.type === 'announcement' ? 'urgent' : n.type === 'reply' ? 'important' : 'normal');
      const urgencyClass = `notif-urgency--${urgency}`;

      return `
        <div class="notif-item ${unreadClass} ${urgencyClass}" data-notif-id="${n.id}" ${postId ? `data-post-id="${postId}" style="cursor:pointer;"` : ''}>
          <div class="notif-icon-wrap ${typeInfo.cls}">
            <i class="fas ${typeInfo.icon}"></i>
          </div>
          <div class="notif-body">
            <div class="notif-type-label notif-label--${n.type}">
              ${typeLabel}
              ${urgency === 'critical' ? '<span class="urgency-dot urgency-dot--critical"></span>' : ''}
              ${urgency === 'urgent' ? '<span class="urgency-dot urgency-dot--urgent"></span>' : ''}
            </div>
            <div class="notif-text">${displayMsg}</div>
            <div class="notif-time">${timeAgo}</div>
          </div>
        </div>`;
    }).join('');

    // Update badge with unread count
    const unreadCount = notifications.filter(n => !n.is_read).length;
    updateNotifBadge(unreadCount);

  } catch (err) {
    console.error('Error loading notifications:', err);
    notifList.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--gray-400);">Failed to load notifications</div>';
  }
}

// Update the bell badge number
function updateNotifBadge(count) {
  const badge = document.querySelector('#notifToggle .icon-badge');
  if (!badge) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}

// Mark all notifications as read
async function markAllNotificationsRead() {
  if (!loggedInUser) return;

  try {
    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', loggedInUser.id)
      .eq('is_read', false);

    if (error) throw error;

    // Update UI
    document.querySelectorAll('.notif-item.notif-unread').forEach(el => {
      el.classList.remove('notif-unread');
    });
    updateNotifBadge(0);

  } catch (err) {
    console.error('Error marking notifications read:', err);
  }
}

// Load notifications when dropdown opens — mark all as read automatically
document.getElementById('notifToggle')?.addEventListener('click', async () => {
  loadNotifications();

  // Mark all unread notifications as read when dropdown is opened
  if (loggedInUser) {
    await db.from('notifications').update({ is_read: true }).eq('user_id', loggedInUser.id).eq('is_read', false);
    updateNotifBadge(0);
  }
});

// Mark all read button
document.getElementById('markAllReadBtn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await markAllNotificationsRead();
});

// ── REALTIME NOTIFICATIONS — Supabase Realtime subscription ──
let notifChannel = null;

function setupRealtimeNotifications() {
  if (!loggedInUser) return;

  // Subscribe to INSERT events on notifications table filtered to this user
  notifChannel = db
    .channel('user-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${loggedInUser.id}`,
      },
      (payload) => {
        const newNotif = payload.new;
        console.log('🔔 New notification received:', newNotif.type);

        // Update badge count (+1) with pulse animation
        const badge = document.querySelector('#notifToggle .icon-badge');
        const current = badge ? parseInt(badge.textContent) || 0 : 0;
        updateNotifBadge(current + 1);

        // Trigger pulse animation on badge
        if (badge) {
          badge.classList.remove('badge-pulse');
          void badge.offsetWidth; // force reflow
          badge.classList.add('badge-pulse');
        }

        // Show toast for the new notification (clean message)
        const toastMsg = (newNotif.message || 'You have a new notification')
          .replace(/📢\s*\[ANNOUNCEMENT\]\s*/gi, '')
          .replace(/\s*posted:\s*"(.+)"$/i, ': $1');
        showToast(toastMsg, 'info');

        // If dropdown is open, prepend the new notification
        const notifList = document.getElementById('notifList');
        if (notifList && !document.getElementById('notifDropdown')?.hidden) {
          const typeInfo = NOTIF_ICONS[newNotif.type] || NOTIF_ICONS.mention;
          const timeAgo  = formatTimeAgo(new Date(newNotif.created_at));
          const postId   = newNotif.link ? newNotif.link.split('post=')[1] : null;

          // Clean up message for display
          let displayMsg = (newNotif.message || '').replace(/📢\s*\[ANNOUNCEMENT\]\s*/gi, '');
          displayMsg = displayMsg.replace(/\s*posted:\s*"(.+)"$/i, ': $1');

          // Highlight the person's name
          const nameClass = newNotif.type === 'announcement' ? 'notif-name notif-name--admin' : 'notif-name';
          displayMsg = displayMsg
            .replace(/^(📢\s*)([^:]+?):\s*/, `$1<strong class="${nameClass}">$2</strong>: `)
            .replace(/^(.+?)\s+(liked your post|commented on your post|replied to your comment|mentioned you)/, `<strong class="${nameClass}">$1</strong> $2`);

          const typeLabels = { like: 'Like', comment: 'Comment', reply: 'Reply', announcement: 'Announcement', mention: 'Mention' };
          const typeLabel = typeLabels[newNotif.type] || '';

          const itemHTML = `
            <div class="notif-item notif-unread" data-notif-id="${newNotif.id}" ${postId ? `data-post-id="${postId}" style="cursor:pointer;"` : ''}>
              <div class="notif-icon-wrap ${typeInfo.cls}">
                <i class="fas ${typeInfo.icon}"></i>
              </div>
              <div class="notif-body">
                <div class="notif-type-label notif-label--${newNotif.type}">${typeLabel}</div>
                <div class="notif-text">${displayMsg}</div>
                <div class="notif-time">${timeAgo}</div>
              </div>
            </div>`;

          // Remove "no notifications" message if present
          const emptyMsg = notifList.querySelector('[style*="text-align:center"]');
          if (emptyMsg) emptyMsg.remove();

          notifList.insertAdjacentHTML('afterbegin', itemHTML);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime notifications connected');
      }
    });
}

// Clean up subscription when page unloads
window.addEventListener('beforeunload', () => {
  if (notifChannel) {
    db.removeChannel(notifChannel);
  }
});

// Load unread count on page load (after user is set) + start realtime
setTimeout(async () => {
  if (!loggedInUser) return;

  // Start realtime subscription
  setupRealtimeNotifications();

  try {
    const { count } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', loggedInUser.id)
      .eq('is_read', false);
    updateNotifBadge(count || 0);
  } catch (err) {
    console.error('Error loading notification count:', err);
  }

  // ── Load real post counts for Active Communities widget ──
  try {
    const slugs = ['lostandfound', 'academic', 'general'];
    const { data: communities } = await db
      .from('communities')
      .select('id, slug')
      .in('slug', slugs);

    if (communities && communities.length > 0) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      await Promise.all(communities.map(async (comm) => {
        const { count } = await db
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', comm.id)
          .gte('created_at', weekAgo);

        const idMap = {
          'lostandfound': 'activePostsLostandfound',
          'academic':     'activePostsAcademic',
          'general':      'activePostsGeneral',
        };
        const el = document.getElementById(idMap[comm.slug]);
        if (el) {
          el.textContent = count > 0 ? `${count} post${count === 1 ? '' : 's'} this week` : 'No recent posts';
        }
      }));
    }
  } catch (err) {
    console.error('Error loading active community counts:', err);
    ['activePostsLostandfound', 'activePostsAcademic', 'activePostsGeneral'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }
}, 1500);

// ══════════════════════════════════════════════════════════════════
// @MENTION DETECTION — Module 4 Enhancement
// Parses @FirstName LastName patterns and creates notifications
// ══════════════════════════════════════════════════════════════════

async function processMentions(text, postId) {
  if (!text || !loggedInUser) return;

  // Match @FirstName LastName patterns (two words after @)
  const mentionPattern = /@([A-Za-z]+)\s+([A-Za-z]+)/g;
  const mentions = [];
  let match;

  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push({ firstName: match[1], lastName: match[2] });
  }

  if (mentions.length === 0) return;

  // Look up each mentioned user in the database
  for (const mention of mentions) {
    try {
      const { data: mentionedUsers } = await db
        .from('profiles')
        .select('id, first_name, last_name')
        .ilike('first_name', mention.firstName)
        .ilike('last_name', mention.lastName)
        .limit(1);

      if (!mentionedUsers || mentionedUsers.length === 0) continue;

      const mentionedUser = mentionedUsers[0];

      // Don't notify yourself
      if (mentionedUser.id === loggedInUser.id) continue;

      // Insert mention notification
      await db.from('notifications').insert({
        user_id: mentionedUser.id,
        type: 'mention',
        title: 'You were mentioned',
        message: `${loggedInUser.first_name} ${loggedInUser.last_name} mentioned you in a post`,
        link: `/campusfeed.html?post=${postId}`,
        is_read: false,
        urgency: 'important',
      });

    } catch (err) {
      console.error('Error processing mention:', err);
    }
  }
}

// ── CLICK ON NOTIFICATION → open post in modal popup ──
document.getElementById('notifList')?.addEventListener('click', async (e) => {
  const item = e.target.closest('.notif-item[data-post-id]');
  if (!item) return;

  const postId  = item.dataset.postId;
  const notifId = item.dataset.notifId;

  // Mark this notification as read
  if (notifId) {
    item.classList.remove('notif-unread');
    await db.from('notifications').update({ is_read: true }).eq('id', notifId);
    const unreadLeft = document.querySelectorAll('.notif-item.notif-unread').length;
    updateNotifBadge(unreadLeft);
  }

  // Close notifications dropdown
  document.getElementById('notifDropdown').hidden = true;

  // Open post in preview modal (like Facebook)
  openPostPreview(postId);

  // Auto-open the comment section
  const commentSection = document.getElementById(`comments-${postId}`);
  const commentBtn     = document.querySelector(`.post-comment-btn[data-post-id="${postId}"]`);
  if (commentSection && commentSection.style.display === 'none') {
    commentSection.style.display = 'block';
    if (commentBtn) commentBtn.classList.add('active');
    await loadComments(postId);
  }
});

// ── POST PREVIEW MODAL ──
async function openPostPreview(postId) {
  const modal   = document.getElementById('postPreviewModal');
  const content = document.getElementById('postPreviewContent');

  content.innerHTML = '<div class="post-preview-loading"><i class="fas fa-spinner fa-spin"></i> Loading post...</div>';
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  try {
    const { data: post, error } = await db
      .from('posts')
      .select(`*, profiles:author_id (first_name, last_name, admin_role), communities:community_id (name, slug)`)
      .eq('id', postId)
      .single();

    if (error || !post) throw new Error('Post not found');

    // Get actual like and comment counts from the source tables
    const { count: likeCount } = await db.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', postId);
    const { count: commentCount } = await db.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', postId);

    const isAnon   = post.is_anonymous;
    const author   = post.profiles;
    const authorName = (!isAnon && author) ? `${author.first_name} ${author.last_name}` : 'Anonymous';
    const initials   = (!isAnon && author) ? (author.first_name[0] + author.last_name[0]).toUpperCase() : '?';
    const avatarStyle = isAnon ? 'background:var(--gray-500);' : 'background:linear-gradient(135deg,#6B0F1A,#8b1525);';
    const timeAgo  = formatTimeAgo(new Date(post.created_at));
    const community = post.communities?.name || 'General';

    // Fetch ALL comments (top-level + replies) for this post
    const { data: allComments } = await db
      .from('comments')
      .select(`*, profiles:author_id (first_name, last_name, admin_role)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    // Separate top-level and replies (flatten like main feed)
    const commentById = {};
    (allComments || []).forEach(c => { commentById[c.id] = c; });
    const comments = (allComments || []).filter(c => !c.parent_id);
    const previewReplyMap = {};
    (allComments || []).filter(c => c.parent_id).forEach(reply => {
      const parentExists = (allComments || []).some(c => c.id === reply.parent_id);
      if (!parentExists) {
        comments.push(reply);
      } else {
        let rootId = reply.parent_id;
        let safety = 20;
        while (safety > 0) {
          const parent = (allComments || []).find(c => c.id === rootId);
          if (!parent || !parent.parent_id) break;
          rootId = parent.parent_id;
          safety--;
        }
        if (!previewReplyMap[rootId]) previewReplyMap[rootId] = [];
        previewReplyMap[rootId].push(reply);
      }
    });

    const userInitials = loggedInUser ? (loggedInUser.first_name[0] + loggedInUser.last_name[0]).toUpperCase() : '--';

    const buildPreviewComment = (c, isReply = false) => {
      const cName = c.is_anonymous ? 'Anonymous' : (c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Unknown');
      const cInit = c.is_anonymous ? '?' : (c.profiles ? (c.profiles.first_name[0] + c.profiles.last_name[0]).toUpperCase() : '?');
      const isOwn = loggedInUser && c.author_id === loggedInUser.id;
      return `
        <div class="comment-item ${isReply ? 'preview-reply' : ''}" data-comment-id="${c.id}">
          <div class="comment-avatar" style="${isReply ? 'width:26px;height:26px;font-size:.6rem;' : ''}">${cInit}</div>
          <div class="comment-content-wrapper">
            <div class="comment-header">
              <span class="comment-author">${cName}</span>
              <span class="comment-time">${formatTimeAgo(new Date(c.created_at))}</span>
              ${isOwn ? `<button class="comment-delete-btn preview-delete-comment" data-comment-id="${c.id}" data-post-id="${post.id}" title="Delete comment"><i class="fas fa-trash"></i></button>` : ''}
            </div>
            <div class="comment-text">${formatCommentMention(escapeHtml(c.content))}</div>
            <button class="comment-reply-btn preview-reply-btn" data-comment-id="${c.id}" data-post-id="${post.id}" data-author="${cName}">
              <i class="fas fa-reply"></i> Reply
            </button>
            <div class="reply-input-wrapper" id="preview-reply-input-${c.id}" style="display:none;">
              <div class="comment-input-avatar">${userInitials}</div>
              <input type="text" class="comment-input preview-reply-input" placeholder="Reply to ${cName}…"
                     data-post-id="${post.id}" data-parent-id="${c.id}" />
              <button class="comment-send-btn preview-reply-send" data-post-id="${post.id}" data-parent-id="${c.id}">
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
        </div>`;
    };

    const commentsHTML = (comments && comments.length > 0)
      ? comments.map(c => {
          const replies = previewReplyMap[c.id] || [];
          const repliesHtml = replies.map(r => buildPreviewComment(r, true)).join('');
          return buildPreviewComment(c, false) + (repliesHtml ? `<div class="comment-replies" style="margin-left:1.5rem;border-left:2px solid var(--gray-200);padding-left:.75rem;">${repliesHtml}</div>` : '');
        }).join('')
      : '<div class="no-comments">No comments yet. Be the first!</div>';

    content.innerHTML = `
      <div class="post-preview-inner">
        <div class="post-preview-header">
          <div class="post-avatar" style="${avatarStyle}width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.9rem;flex-shrink:0;">${initials}</div>
          <div>
            <div style="font-weight:600;font-size:.9rem;">${authorName}</div>
            <div style="font-size:.75rem;color:var(--gray-400);">${community} · ${timeAgo}</div>
          </div>
        </div>
        ${post.title ? `<h3 style="font-size:1rem;font-weight:700;margin:.75rem 0 .5rem;">${escapeHtml(post.title.replace(/^📢?\s*\[ANNOUNCEMENT\]\s*/i, ''))}</h3>` : ''}
        <p style="font-size:.88rem;color:var(--gray-700);line-height:1.6;margin-bottom:1rem;">${escapeHtml((post.content || '').replace(/^📢?\s*\[ANNOUNCEMENT\]\s*/i, ''))}</p>
        ${post.image_url && Array.isArray(post.image_url) && post.image_url.length > 0 ? `
          <div class="post-images-grid" style="margin-bottom:1rem;">
            ${post.image_url.slice(0,4).map(url => `<div class="post-image-item"><img src="${url}" loading="lazy" /></div>`).join('')}
          </div>` : ''}
        <div style="display:flex;gap:1.25rem;padding:.5rem 0;margin-bottom:.5rem;font-size:.82rem;color:var(--gray-500);">
          <span><i class="fas fa-heart" style="color:#ef4444;"></i> ${likeCount || 0} likes</span>
          <span><i class="fas fa-comment" style="color:#3b82f6;"></i> ${commentCount || 0} comments</span>
        </div>
        <div style="border-top:1px solid var(--gray-200);padding-top:.75rem;margin-bottom:.5rem;">
          <strong style="font-size:.82rem;color:var(--gray-600);">Comments</strong>
        </div>
        <div class="comment-list" id="preview-comment-list-${post.id}" style="max-height:400px;overflow-y:auto;margin-bottom:.75rem;">
          ${commentsHTML}
        </div>
        <div class="comment-input-wrapper" id="preview-new-comment-wrapper">
          <div class="comment-input-avatar">${userInitials}</div>
          <input type="text" class="comment-input preview-new-comment-input" placeholder="Write a comment…" data-post-id="${post.id}" />
          <button class="comment-send-btn preview-new-comment-send" data-post-id="${post.id}">
            <i class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>`;

  } catch (err) {
    content.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--gray-400);">Could not load post.</div>';
  }
}

// Close post preview modal
document.getElementById('closePostPreview')?.addEventListener('click', () => {
  document.getElementById('postPreviewModal').hidden = true;
  document.body.style.overflow = '';
});
document.getElementById('postPreviewModal')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('postPreviewModal')) {
    document.getElementById('postPreviewModal').hidden = true;
    document.body.style.overflow = '';
  }
});

// ── PREVIEW MODAL: comment & reply interactions ──
document.getElementById('postPreviewModal')?.addEventListener('click', async (e) => {

  // Toggle reply input box
  if (e.target.closest('.preview-reply-btn')) {
    const btn       = e.target.closest('.preview-reply-btn');
    const commentId = btn.dataset.commentId;
    const authorName = btn.dataset.author || '';
    const replyBox  = document.getElementById(`preview-reply-input-${commentId}`);
    if (!replyBox) return;
    const isHidden = replyBox.style.display === 'none';
    document.querySelectorAll('[id^="preview-reply-input-"]').forEach(b => b.style.display = 'none');
    replyBox.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      const input = replyBox.querySelector('input');
      if (input) {
        input.value = authorName ? `${authorName} ` : '';
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }
    return;
  }

  // Send reply from preview modal
  if (e.target.closest('.preview-reply-send')) {
    const btn      = e.target.closest('.preview-reply-send');
    const postId   = btn.dataset.postId;
    const parentId = btn.dataset.parentId;
    const input    = document.querySelector(`#preview-reply-input-${parentId} .preview-reply-input`);
    if (!input?.value.trim()) return;
    await submitCommentPreview(postId, input, parentId);
    await refreshPreviewComments(postId);
    return;
  }

  // Send new top-level comment from preview modal
  if (e.target.closest('.preview-new-comment-send')) {
    const btn    = e.target.closest('.preview-new-comment-send');
    const postId = btn.dataset.postId;
    const input  = document.querySelector('.preview-new-comment-input');
    if (!input?.value.trim()) return;
    await submitCommentPreview(postId, input);
    await refreshPreviewComments(postId);
    return;
  }

  // Delete comment from preview modal
  if (e.target.closest('.preview-delete-comment')) {
    const btn = e.target.closest('.preview-delete-comment');
    const commentId = btn.dataset.commentId;
    const postId = btn.dataset.postId;
    
    // Show delete comment modal
    window._pendingCommentDelete = { commentId, postId, fromPreview: true };
    document.getElementById('deleteCommentModal').hidden = false;
    return;
  }
});

// Enter key inside preview modal inputs
document.getElementById('postPreviewModal')?.addEventListener('keypress', async (e) => {
  if (e.key !== 'Enter') return;

  if (e.target.classList.contains('preview-reply-input')) {
    const postId   = e.target.dataset.postId;
    const parentId = e.target.dataset.parentId;
    await submitCommentPreview(postId, e.target, parentId);
    await refreshPreviewComments(postId);
    return;
  }

  if (e.target.classList.contains('preview-new-comment-input')) {
    const postId = e.target.dataset.postId;
    await submitCommentPreview(postId, e.target);
    await refreshPreviewComments(postId);
  }
});

// ── submitCommentPreview: used inside the notification post preview modal ──
// Same as submitComment but doesn't touch the main feed comment section
async function submitCommentPreview(postId, inputElement, parentId = null) {
  const content = inputElement.value.trim();
  if (!content) return;
  if (!loggedInUser) { showToast('You must be logged in to comment', 'error'); return; }

  // Clear input immediately to prevent double-submit
  inputElement.value = '';

  try {
    const payload = {
      post_id:      postId,
      author_id:    loggedInUser.id,
      is_anonymous: false,
      content:      content,
    };
    if (parentId) payload.parent_id = parentId;

    const { error } = await db.from('comments').insert(payload);
    if (error) throw error;

    // Hide reply box if it was a reply
    if (parentId) {
      const replyBox = document.getElementById(`preview-reply-input-${parentId}`);
      if (replyBox) replyBox.style.display = 'none';
    }

  } catch (err) {
    console.error('Preview comment error:', err);
    showToast('Failed to post: ' + err.message, 'error');
    // Restore content on error
    inputElement.value = content;
  }
}

// Refresh comment list inside preview modal after submitting
async function refreshPreviewComments(postId) {
  const list = document.getElementById(`preview-comment-list-${postId}`);
  if (!list) return;

  // Fetch ALL comments for this post (top-level + replies)
  const { data: allComments } = await db
    .from('comments')
    .select(`*, profiles:author_id (first_name, last_name, admin_role)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  const userInitials = loggedInUser ? (loggedInUser.first_name[0] + loggedInUser.last_name[0]).toUpperCase() : '--';

  if (!allComments || allComments.length === 0) {
    list.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
    return;
  }

  // Simple 2-level display: top-level comments + all their replies (any depth)
  const topLevel = allComments.filter(c => !c.parent_id);
  
  // ALL comments with a parent_id are replies — group by their direct parent
  // But show them ALL under whatever top-level ancestor they belong to
  const replyMap = {};
  const repliesOnly = allComments.filter(c => c.parent_id);
  
  // For orphaned replies (parent deleted), treat them as top-level
  repliesOnly.forEach(r => {
    // Check if parent exists in this set
    const parentExists = allComments.some(c => c.id === r.parent_id);
    if (!parentExists) {
      topLevel.push(r);
    } else {
      // Find the top-level ancestor
      let rootId = r.parent_id;
      let safety = 20;
      while (safety > 0) {
        const parent = allComments.find(c => c.id === rootId);
        if (!parent || !parent.parent_id) break;
        rootId = parent.parent_id;
        safety--;
      }
      if (!replyMap[rootId]) replyMap[rootId] = [];
      replyMap[rootId].push(r);
    }
  });

  const buildComment = (c) => {
    const cName = c.is_anonymous ? 'Anonymous' : (c.profiles ? `${c.profiles.first_name} ${c.profiles.last_name}` : 'Unknown');
    const cInit = c.is_anonymous ? '?' : (c.profiles ? (c.profiles.first_name[0] + c.profiles.last_name[0]).toUpperCase() : '?');
    const replies = replyMap[c.id] || [];

    const repliesHTML = replies.length > 0 ? `
      <div class="comment-replies" style="margin-left:1.5rem;border-left:2px solid var(--gray-200);padding-left:.75rem;">
        ${replies.map(r => {
          const rName = r.is_anonymous ? 'Anonymous' : (r.profiles ? `${r.profiles.first_name} ${r.profiles.last_name}` : 'Unknown');
          const rInit = r.is_anonymous ? '?' : (r.profiles ? (r.profiles.first_name[0] + r.profiles.last_name[0]).toUpperCase() : '?');
          const rIsOwn = loggedInUser && r.author_id === loggedInUser.id;
          return `
            <div class="comment-item">
              <div class="comment-avatar" style="width:26px;height:26px;font-size:.6rem;">${rInit}</div>
              <div class="comment-content-wrapper">
                <div class="comment-header">
                  <span class="comment-author">${rName}</span>
                  <span class="comment-time">${formatTimeAgo(new Date(r.created_at))}</span>
                  ${rIsOwn ? `<button class="comment-delete-btn preview-delete-comment" data-comment-id="${r.id}" data-post-id="${postId}" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
                </div>
                <div class="comment-text">${formatCommentMention(escapeHtml(r.content))}</div>
                <button class="comment-reply-btn preview-reply-btn" data-comment-id="${r.id}" data-post-id="${postId}" data-author="${rName}">
                  <i class="fas fa-reply"></i> Reply
                </button>
                <div class="reply-input-wrapper" id="preview-reply-input-${r.id}" style="display:none;">
                  <div class="comment-input-avatar">${userInitials}</div>
                  <input type="text" class="comment-input preview-reply-input" placeholder="Reply to ${rName}…"
                         data-post-id="${postId}" data-parent-id="${r.id}" />
                  <button class="comment-send-btn preview-reply-send" data-post-id="${postId}" data-parent-id="${r.id}">
                    <i class="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div>`;
        }).join('')}
      </div>` : '';

    return `
      <div class="comment-item" data-comment-id="${c.id}">
        <div class="comment-avatar">${cInit}</div>
        <div class="comment-content-wrapper">
          <div class="comment-header">
            <span class="comment-author">${cName}</span>
            <span class="comment-time">${formatTimeAgo(new Date(c.created_at))}</span>
            ${loggedInUser && c.author_id === loggedInUser.id ? `<button class="comment-delete-btn preview-delete-comment" data-comment-id="${c.id}" data-post-id="${postId}" title="Delete"><i class="fas fa-trash"></i></button>` : ''}
          </div>
          <div class="comment-text">${formatCommentMention(escapeHtml(c.content))}</div>
          <button class="comment-reply-btn preview-reply-btn" data-comment-id="${c.id}" data-post-id="${postId}" data-author="${cName}">
            <i class="fas fa-reply"></i> Reply
          </button>
          <div class="reply-input-wrapper" id="preview-reply-input-${c.id}" style="display:none;">
            <div class="comment-input-avatar">${userInitials}</div>
            <input type="text" class="comment-input preview-reply-input" placeholder="Reply to ${cName}…"
                   data-post-id="${postId}" data-parent-id="${c.id}" />
            <button class="comment-send-btn preview-reply-send" data-post-id="${postId}" data-parent-id="${c.id}">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
          ${repliesHTML}
        </div>
      </div>`;
  };

  list.innerHTML = topLevel.map(c => buildComment(c)).join('');

  // Update comment count badge on main feed post card
  const commentBtn = document.querySelector(`.post-comment-btn[data-post-id="${postId}"]`);
  if (commentBtn) {
    commentBtn.querySelector('span').textContent = allComments.length;
  }
}


// ══════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS WIDGET — Module 5
// Fetches real posts from ssg-announcements + dept announcement posts
// ══════════════════════════════════════════════════════════════════

async function loadAnnouncementsWidget() {
  const widget = document.getElementById('announcementsWidget');
  if (!widget || !loggedInUser) return;

  try {
    // Get the ssg-announcements community + user's own dept community only
    const deptSlugMap = {
      'college of teacher education (cte)':              'cte',
      'college of business education (cbe)':             'cbe',
      'college of criminal justice education (ccje)':    'ccje',
      'college of computer studies (css)':               'css',
      'psychology (psych)':                              'psych',
    };
    const userDeptSlug = deptSlugMap[(loggedInUser.department || '').toLowerCase().trim()];

    const { data: communities } = await db
      .from('communities')
      .select('id, slug, name')
      .or(`slug.eq.ssg-announcements,slug.eq.ssg,slug.eq.${userDeptSlug || 'none'}`);

    if (!communities || communities.length === 0) {
      widget.innerHTML = '<div class="ann-widget-loading">No announcements yet.</div>';
      return;
    }

    const commIds = communities.map(c => c.id);

    // Only show pinned posts OR posts marked as announcements (📢 [ANNOUNCEMENT] prefix)
    const { data: posts, error } = await db
      .from('posts')
      .select(`
        id, title, content, created_at, is_pinned,
        communities:community_id (name, slug)
      `)
      .in('community_id', commIds)
      .eq('moderation_status', 'approved')
      .eq('is_flagged', false)
      .or('is_pinned.eq.true,content.ilike.%[ANNOUNCEMENT]%')
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      widget.innerHTML = '<div class="ann-widget-loading">No announcements yet.</div>';
      return;
    }

    widget.innerHTML = posts.map(post => {
      const slug      = post.communities?.slug || '';
      const commName  = post.communities?.name || 'General';
      const rawText   = (post.title || post.content || '').replace(/^📢?\s*\[ANNOUNCEMENT\]\s*/i, '');
      const text      = rawText.substring(0, 70) + (rawText.length > 70 ? '…' : '');
      const timeAgo   = formatTimeAgo(new Date(post.created_at));

      // Pick tag style based on community or pinned status
      let tagLabel = 'General';
      let tagClass = 'tag-general';

      if (post.is_pinned) {
        tagLabel = 'Pinned';
        tagClass = 'tag-urgent';
      } else if (slug === 'ssg-announcements') {
        tagLabel = 'Official';
        tagClass = 'tag-urgent';
      } else if (slug.match(/cte|css|cbe|psych|ccje/)) {
        tagLabel = slug.toUpperCase();
        tagClass = 'tag-academic';
      } else if (slug === 'academic') {
        tagLabel = 'Academic';
        tagClass = 'tag-academic';
      } else if (slug === 'campus') {
        tagLabel = 'Event';
        tagClass = 'tag-event';
      }

      return `
        <div class="ann-widget-item ann-widget-clickable" data-post-id="${post.id}" style="cursor:pointer;">
          <span class="ann-w-tag ${tagClass}">${tagLabel}</span>
          <div class="ann-w-text">${escapeHtml(text)}</div>
          <div class="ann-w-time">${timeAgo}</div>
        </div>`;
    }).join('');

    // Click → scroll to post in feed
    widget.querySelectorAll('.ann-widget-clickable').forEach(item => {
      item.addEventListener('click', async () => {
        const postId  = item.dataset.postId;
        let postCard  = document.querySelector(`.post-card[data-post-id="${postId}"]`);

        if (!postCard) {
          currentCommunityFilter = null;
          await loadPostsFromDB();
          postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        }

        if (!postCard) { showToast('Post not found', 'info'); return; }

        postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postCard.classList.add('post-highlighted');
        setTimeout(() => postCard.classList.remove('post-highlighted'), 2500);
      });
    });

  } catch (err) {
    console.error('Error loading announcements:', err);
    widget.innerHTML = '<div class="ann-widget-loading">Could not load announcements.</div>';
  }
}

// "View all" → navigate to dedicated announcements page
// (Link is now an <a href="announcements.html"> so no JS needed, but keep as fallback)
document.getElementById('viewAllAnnouncements')?.addEventListener('click', (e) => {
  // Allow default navigation to announcements.html
});

// Load announcements on page load (after user is ready)
setTimeout(() => {
  if (loggedInUser) loadAnnouncementsWidget();
}, 1200);


// ══════════════════════════════════════════════════════════════════
// UPCOMING EVENTS WIDGET — pulls from campus_events table
// ══════════════════════════════════════════════════════════════════

async function loadEventsWidget() {
  const eventsList = document.getElementById('upcomingEventsList') || document.querySelector('.events-list');
  if (!eventsList) return;

  try {
    const { data: events, error } = await db
      .from('campus_events')
      .select('*')
      .eq('is_active', true)
      .gte('event_date', new Date().toISOString().split('T')[0]) // only future events
      .order('event_date', { ascending: true })
      .limit(3);

    if (error) throw error;

    if (!events || events.length === 0) {
      eventsList.innerHTML = '<div style="text-align:center;padding:1rem;font-size:.8rem;color:var(--gray-400);">No upcoming events.</div>';
      return;
    }

    eventsList.innerHTML = events.map(ev => {
      const d   = new Date(ev.event_date);
      const day = d.getDate();
      const mon = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
      return `
        <div class="event-item">
          <div class="event-date">
            <span class="event-day">${day}</span>
            <span class="event-month">${mon}</span>
          </div>
          <div class="event-info">
            <div class="event-name">${escapeHtml(ev.title)}</div>
            <div class="event-loc"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(ev.location || 'CRMC Campus')}</div>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    console.error('Error loading events widget:', err);
  }
}

// Load events widget on page load
setTimeout(() => {
  if (loggedInUser) loadEventsWidget();
}, 1300);

// ══════════════════════════════════════════════════════════════════
// DYNAMIC SIDEBAR COMMUNITIES — loads public communities from DB
// ══════════════════════════════════════════════════════════════════

async function loadSidebarCommunities() {
  const container = document.getElementById('publicCommunitiesList');
  if (!container) return;

  try {
    const { data: communities, error } = await db
      .from('communities')
      .select('*')
      .eq('type', 'public')
      .order('name', { ascending: true });

    if (error) throw error;
    if (!communities || communities.length === 0) {
      container.innerHTML = '<div style="padding:0.5rem 1rem;font-size:.75rem;color:var(--gray-400);">No communities yet</div>';
      return;
    }

    // Remove SSG Announcements (redundant with SSG Student Government)
    let filtered = communities.filter(c => c.slug !== 'ssg-announcements');

    // Sort: SSG first (priority), then alphabetical
    filtered.sort((a, b) => {
      if (a.slug === 'ssg') return -1;
      if (b.slug === 'ssg') return 1;
      return a.name.localeCompare(b.name);
    });

    // Icon mapping for known slugs
    const ICON_MAP = {
      'ssg':              { icon: 'fa-star',          cls: 'ci-ssg' },
      'ssg-announcements':{ icon: 'fa-bullhorn',     cls: 'ci-ssg' },
      'general':          { icon: 'fa-comments',     cls: 'ci-general' },
      'lostandfound':     { icon: 'fa-search',       cls: 'ci-lost' },
      'marketplace':      { icon: 'fa-handshake',    cls: 'ci-market' },
      'academic':         { icon: 'fa-book-open',    cls: 'ci-academic' },
      'campus':           { icon: 'fa-university',   cls: 'ci-campus' },
      'support':          { icon: 'fa-hands-helping',cls: 'ci-support' },
    };

    container.innerHTML = filtered.map(c => {
      const iconInfo = ICON_MAP[c.slug] || { icon: 'fa-users', cls: 'ci-general' };
      const desc = c.description || '';
      return `
        <a href="#" class="community-item" data-feed="${c.slug}">
          <div class="comm-icon ${iconInfo.cls}"><i class="fas ${iconInfo.icon}"></i></div>
          <div class="comm-info">
            <div class="comm-name">${escapeHtml(c.name)}</div>
            <div class="comm-sub">${escapeHtml(desc.substring(0, 30))}</div>
          </div>
        </a>`;
    }).join('');

    // Re-attach click handlers for new community items
    container.querySelectorAll('.community-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.community-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        if (window.innerWidth <= 640) document.getElementById('leftSidebar').classList.remove('open');

        const feedSlug = item.dataset.feed;
        const feedTitle = document.getElementById('feedTitle');
        const feedSub = document.getElementById('feedSub');
        const feedIcon = document.getElementById('feedHeaderIcon');

        const comm = filtered.find(c => c.slug === feedSlug);
        feedTitle.textContent = comm ? comm.name : feedSlug;
        feedSub.textContent = comm ? (comm.description || '') : '';
        feedIcon.innerHTML = `<i class="fas ${(ICON_MAP[feedSlug] || {icon:'fa-users'}).icon}"></i>`;
        feedIcon.className = 'feed-icon';

        currentCommunityFilter = feedSlug;
        loadPostsFromDB();
      });
    });

  } catch (err) {
    console.error('Error loading sidebar communities:', err);
  }
}

// Load sidebar communities is called from initUser()


// ══════════════════════════════════════════════════════════════════
// SEARCH BAR — searches posts and students
// ══════════════════════════════════════════════════════════════════

const searchInput    = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');
let searchTimeout    = null;

function highlightMatch(text, query) {
  if (!text || !query) return escapeHtml(text || '');
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escapeHtml(text).replace(
    new RegExp(`(${escaped})`, 'gi'),
    '<span class="search-result-highlight">$1</span>'
  );
}

async function runSearch(query) {
  if (!query || query.length < 2) {
    searchDropdown.hidden = true;
    return;
  }

  searchDropdown.innerHTML = '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
  searchDropdown.hidden = false;

  try {
    const [postsRes, studentsRes] = await Promise.all([
      db.from('posts')
        .select('id, title, content, created_at, communities:community_id(name, slug)')
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .eq('is_flagged', false)
        .order('created_at', { ascending: false })
        .limit(5),

      db.from('profiles')
        .select('id, first_name, last_name, department, student_id')
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,student_id.ilike.%${query}%`)
        .eq('admin_role', 'student')
        .limit(4)
    ]);

    const posts    = postsRes.data   || [];
    const students = studentsRes.data || [];

    if (posts.length === 0 && students.length === 0) {
      searchDropdown.innerHTML = `<div class="search-empty">No results for "<strong>${escapeHtml(query)}</strong>"</div>`;
      return;
    }

    let html = '';

    if (posts.length > 0) {
      html += `<div class="search-section-label"><i class="fas fa-newspaper"></i> Posts</div>`;
      html += posts.map(post => {
        const text    = post.title || post.content;
        const preview = text.length > 80 ? text.substring(0, 80) + '…' : text;
        const comm    = post.communities?.name || 'General';
        const timeAgo = formatTimeAgo(new Date(post.created_at));
        return `
          <div class="search-result-item" data-type="post" data-id="${post.id}">
            <div class="search-result-avatar" style="border-radius:6px;background:linear-gradient(135deg,var(--maroon),#8b1525);">
              <i class="fas fa-newspaper" style="font-size:.65rem;"></i>
            </div>
            <div>
              <div class="search-result-title">${highlightMatch(text.substring(0, 60), query)}</div>
              <div class="search-result-meta">${comm} · ${timeAgo}</div>
            </div>
          </div>`;
      }).join('');
    }

    if (students.length > 0) {
      html += `<div class="search-section-label"><i class="fas fa-user"></i> Students</div>`;
      html += students.map(s => {
        const fullName = `${s.first_name} ${s.last_name}`;
        const initials = (s.first_name[0] + s.last_name[0]).toUpperCase();
        const deptShort = s.department?.match(/\(([^)]+)\)/)?.[1] || s.department || '';
        return `
          <div class="search-result-item" data-type="student" data-id="${s.id}">
            <div class="search-result-avatar">${initials}</div>
            <div>
              <div class="search-result-title">${highlightMatch(fullName, query)}</div>
              <div class="search-result-meta">${deptShort} · ${s.student_id}</div>
            </div>
          </div>`;
      }).join('');
    }

    searchDropdown.innerHTML = html;

    // Click on post result → scroll to post in feed
    searchDropdown.querySelectorAll('.search-result-item[data-type="post"]').forEach(item => {
      item.addEventListener('click', async () => {
        const postId = item.dataset.id;
        searchDropdown.hidden = true;
        searchInput.value = '';

        let postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (!postCard) {
          currentCommunityFilter = null;
          await loadPostsFromDB();
          postCard = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        }
        if (!postCard) { showToast('Post not found', 'info'); return; }

        postCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        postCard.classList.add('post-highlighted');
        setTimeout(() => postCard.classList.remove('post-highlighted'), 2500);
      });
    });

    // Click on student → go to their profile page
    searchDropdown.querySelectorAll('.search-result-item[data-type="student"]').forEach(item => {
      item.addEventListener('click', () => {
        const userId = item.dataset.id;
        searchDropdown.hidden = true;
        searchInput.value = '';
        window.location.href = `profile.html?id=${userId}`;
      });
    });

  } catch (err) {
    console.error('Search error:', err);
    searchDropdown.innerHTML = '<div class="search-empty">Search failed. Try again.</div>';
  }
}

// Debounced input handler
searchInput?.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  if (!query) { searchDropdown.hidden = true; return; }
  searchTimeout = setTimeout(() => runSearch(query), 350);
});

// Close on click outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('#searchWrapper')) {
    searchDropdown.hidden = true;
  }
});

// Close on Escape
searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    searchDropdown.hidden = true;
    searchInput.value = '';
  }
});
