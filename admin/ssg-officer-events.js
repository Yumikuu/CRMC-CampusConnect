// ═══════════════════════════════════════════════════════════════
// SSG OFFICER — EVENTS MANAGEMENT
// ═══════════════════════════════════════════════════════════════

let adminUser      = null;
let currentFilter  = 'upcoming';
let editingEventId = null;
let deletingEventId = null;

// ── AUTH GUARD ──
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.admin_role !== 'SSG_OFFICER') {
    window.location.href = 'login.html'; return;
  }

  adminUser = profile;
  initAdminNotifications(profile.id);
  const initials = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminAvatar').textContent = initials;
  document.getElementById('adminName').textContent   = `${profile.first_name} ${profile.last_name}`;

  await loadEvents();
  setupListeners();
})();

// ── LOAD EVENTS ──
async function loadEvents() {
  const today = new Date().toISOString().split('T')[0];
  let query   = db.from('campus_events').select('*').eq('is_active', true).order('event_date', { ascending: true });

  if (currentFilter === 'upcoming') query = query.gte('event_date', today);
  if (currentFilter === 'past')     query = query.lt('event_date', today);

  const { data: events, error } = await query;
  renderEvents(events || []);
}

function renderEvents(events) {
  const container = document.getElementById('eventsContainer');
  if (!events.length) {
    container.innerHTML = `<div class="card" style="grid-column:1/-1;"><div class="empty-state"><i class="fas fa-calendar-times"></i><p>No ${currentFilter} events.</p><small>Add one using the button above.</small></div></div>`;
    return;
  }

  const today = new Date();
  container.innerHTML = events.map(ev => {
    const d       = new Date(ev.event_date);
    const day     = d.getDate();
    const month   = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year    = d.getFullYear();
    const isPast  = d < today;
    const daysLeft = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    const badge   = isPast
      ? `<span style="font-size:12px;background:#f3f4f6;color:var(--gray-500);padding:2px 8px;border-radius:999px;">Past</span>`
      : daysLeft === 0
        ? `<span style="font-size:12px;background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:999px;font-weight:600;">Today</span>`
        : daysLeft <= 3
          ? `<span style="font-size:12px;background:#fef3c7;color:#d97706;padding:2px 8px;border-radius:999px;font-weight:600;">${daysLeft}d away</span>`
          : `<span style="font-size:12px;background:rgba(107,15,26,.08);color:var(--maroon);padding:2px 8px;border-radius:999px;font-weight:600;">${daysLeft}d away</span>`;

    return `
      <div class="card">
        <div class="card-body">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            <div style="min-width:56px;text-align:center;background:${isPast ? 'var(--gray-100)' : 'rgba(107,15,26,.08)'};border-radius:10px;padding:8px 6px;flex-shrink:0;">
              <div style="font-size:1.4rem;font-weight:800;color:${isPast ? 'var(--gray-400)' : 'var(--maroon)'};">${day}</div>
              <div style="font-size:.65rem;font-weight:700;color:${isPast ? 'var(--gray-400)' : 'var(--maroon)'};">${month}</div>
              <div style="font-size:.65rem;color:var(--gray-400);">${year}</div>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.35rem;flex-wrap:wrap;">
                <span style="font-size:.95rem;font-weight:700;color:${isPast ? 'var(--gray-400)' : 'var(--gray-900)'};">${escapeHtml(ev.title)}</span>
                ${badge}
              </div>
              ${ev.location ? `<div style="font-size:.8rem;color:var(--gray-500);margin-bottom:.25rem;"><i class="fas fa-map-marker-alt" style="margin-right:4px;color:var(--gray-400);"></i>${escapeHtml(ev.location)}</div>` : ''}
              ${ev.description ? `<p style="font-size:.82rem;color:var(--gray-600);line-height:1.5;margin-bottom:.5rem;">${escapeHtml(ev.description)}</p>` : ''}
              <div style="display:flex;gap:.5rem;margin-top:.75rem;">
                <button onclick="openEditEvent('${ev.id}')" style="padding:.35rem .75rem;background:var(--gray-100);border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;"><i class="fas fa-edit"></i> Edit</button>
                <button onclick="openDeleteEvent('${ev.id}')" style="padding:.35rem .75rem;background:#fee2e2;border:1px solid #fecaca;border-radius:var(--radius-sm);font-size:12px;font-weight:600;cursor:pointer;font-family:Poppins,sans-serif;color:#dc2626;"><i class="fas fa-trash"></i> Remove</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── ADD / EDIT ──
function openAddEvent() {
  editingEventId = null;
  document.getElementById('eventModalTitle').innerHTML = '<i class="fas fa-calendar-plus"></i> Add Event';
  document.getElementById('submitEventBtn').innerHTML  = '<i class="fas fa-plus"></i> Add Event';
  document.getElementById('eventTitle').value       = '';
  document.getElementById('eventDate').value        = '';
  document.getElementById('eventLocation').value    = '';
  document.getElementById('eventDescription').value = '';
  document.getElementById('eventModal').style.display = 'flex';
}

async function openEditEvent(eventId) {
  const { data: ev } = await db.from('campus_events').select('*').eq('id', eventId).single();
  if (!ev) return;
  editingEventId = eventId;
  document.getElementById('eventModalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Event';
  document.getElementById('submitEventBtn').innerHTML  = '<i class="fas fa-save"></i> Save Changes';
  document.getElementById('eventTitle').value       = ev.title;
  document.getElementById('eventDate').value        = ev.event_date;
  document.getElementById('eventLocation').value    = ev.location || '';
  document.getElementById('eventDescription').value = ev.description || '';
  document.getElementById('eventModal').style.display = 'flex';
}

async function submitEvent() {
  const title       = document.getElementById('eventTitle').value.trim();
  const date        = document.getElementById('eventDate').value;
  const location    = document.getElementById('eventLocation').value.trim();
  const description = document.getElementById('eventDescription').value.trim();

  if (!title || !date) { showToast('Title and date are required', 'error'); return; }

  const btn = document.getElementById('submitEventBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    const payload = { title, event_date: date, location: location || null, description: description || null };

    if (editingEventId) {
      const { error } = await db.from('campus_events').update(payload).eq('id', editingEventId);
      if (error) throw error;
      showToast('Event updated!', 'success');
    } else {
      const { error } = await db.from('campus_events').insert({ ...payload, created_by: adminUser.id, is_active: true });
      if (error) throw error;
      showToast('Event added!', 'success');
    }

    document.getElementById('eventModal').style.display = 'none';
    await loadEvents();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = editingEventId ? '<i class="fas fa-save"></i> Save Changes' : '<i class="fas fa-plus"></i> Add Event';
  }
}

// ── DELETE ──
function openDeleteEvent(eventId) {
  deletingEventId = eventId;
  document.getElementById('deleteModal').style.display = 'flex';
}

async function confirmDelete() {
  if (!deletingEventId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Removing...';
  try {
    const { error } = await db.from('campus_events').update({ is_active: false }).eq('id', deletingEventId);
    if (error) throw error;
    showToast('Event removed', 'success');
    document.getElementById('deleteModal').style.display = 'none';
    deletingEventId = null;
    await loadEvents();
  } catch (err) {
    showToast('Failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Remove';
  }
}

// ── SETUP ──
function setupListeners() {
  document.getElementById('addEventBtn').addEventListener('click', openAddEvent);
  document.getElementById('submitEventBtn').addEventListener('click', submitEvent);
  document.getElementById('cancelEventBtn').addEventListener('click', () => document.getElementById('eventModal').style.display = 'none');
  document.getElementById('closeEventModal').addEventListener('click', () => document.getElementById('eventModal').style.display = 'none');
  document.getElementById('eventModal').addEventListener('click', e => { if (e.target.id === 'eventModal') document.getElementById('eventModal').style.display = 'none'; });
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => document.getElementById('deleteModal').style.display = 'none');
  document.getElementById('deleteModal').addEventListener('click', e => { if (e.target.id === 'deleteModal') document.getElementById('deleteModal').style.display = 'none'; });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      await loadEvents();
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await db.auth.signOut();
    window.location.href = 'login.html';
  });
}

// ── HELPERS ──
function escapeHtml(t) {
  if (!t) return '';
  const d = document.createElement('div'); d.textContent = t; return d.innerHTML;
}

function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:2rem;right:2rem;background:${type === 'success' ? '#16a34a' : '#dc2626'};color:white;padding:1rem 1.5rem;border-radius:.5rem;box-shadow:0 10px 40px rgba(0,0,0,.2);z-index:10000;font-weight:500;font-family:Poppins,sans-serif;`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 3000);
}
