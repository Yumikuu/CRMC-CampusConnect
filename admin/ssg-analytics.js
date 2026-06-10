// ═══════════════════════════════════════════════════════════════
// SSG ANALYTICS — Charts and data visualization
// ═══════════════════════════════════════════════════════════════

let adminUser = null;

const DEPT_LIST = [
  { key: 'CTE', full: 'College of Teacher Education (CTE)', color: '#3b82f6' },
  { key: 'CSS', full: 'College of Computer Studies (CSS)', color: '#10b981' },
  { key: 'CBE', full: 'College of Business Education (CBE)', color: '#f59e0b' },
  { key: 'PSYCH', full: 'Psychology (PSYCH)', color: '#8b5cf6' },
  { key: 'CCJE', full: 'College of Criminal Justice Education (CCJE)', color: '#ef4444' },
];

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || profile.admin_role !== 'SSG') {
    window.location.href = profile?.admin_role ? 'dept-dashboard.html' : '../campusfeed.html';
    return;
  }
  adminUser = profile;
  document.getElementById('adminAvatar').textContent = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminName').textContent = `${profile.first_name} ${profile.last_name}`;

  await Promise.all([
    loadSummaryStats(),
    loadPostsByCommunityChart(),
    loadDeptDistributionChart(),
    loadPostsOverTimeChart(),
    loadTopCommunities(),
    loadDeptTable(),
    loadPostsByCategoryChart(),
    loadSentimentChart(),
    loadResponseTimeStats(),
    loadActivitySummary(),
  ]);
})();

// ── SUMMARY STATS ──
async function loadSummaryStats() {
  const [
    { count: userCount },
    { count: postCount },
    { count: commentCount },
    { count: flaggedCount },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('posts').select('*', { count: 'exact', head: true }),
    db.from('comments').select('*', { count: 'exact', head: true }),
    db.from('posts').select('*', { count: 'exact', head: true }).eq('is_flagged', true),
  ]);

  document.getElementById('statTotalUsers').textContent = userCount || 0;
  document.getElementById('statTotalPosts').textContent = postCount || 0;
  document.getElementById('statTotalComments').textContent = commentCount || 0;
  document.getElementById('statFlagged').textContent = flaggedCount || 0;
}

// ── POSTS BY COMMUNITY BAR CHART ──
async function loadPostsByCommunityChart() {
  const { data: communities } = await db.from('communities').select('id, name').order('name');
  if (!communities?.length) return;

  // Batch: get all posts and count per community
  const { data: allPosts } = await db.from('posts').select('community_id');
  const countMap = {};
  (allPosts || []).forEach(p => { countMap[p.community_id] = (countMap[p.community_id] || 0) + 1; });

  const counts = communities.map(c => ({ name: c.name, count: countMap[c.id] || 0 }));
  counts.sort((a, b) => b.count - a.count);
  const top = counts.slice(0, 8);

  const ctx = document.getElementById('postsByCommunityChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: top.map(c => c.name),
      datasets: [{
        label: 'Posts',
        data: top.map(c => c.count),
        backgroundColor: 'rgba(107,15,26,0.8)',
        borderColor: '#6B0F1A',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} posts`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'Poppins', size: 11 } },
          grid: { color: '#f3f4f6' },
        },
        x: {
          ticks: {
            font: { family: 'Poppins', size: 10 },
            maxRotation: 35,
          },
          grid: { display: false },
        }
      }
    }
  });
}

// ── DEPARTMENT DISTRIBUTION PIE CHART ──
async function loadDeptDistributionChart() {
  const counts = await Promise.all(
    DEPT_LIST.map(async d => {
      const { count } = await db.from('profiles').select('*', { count: 'exact', head: true }).eq('department', d.full);
      return { key: d.key, count: count || 0, color: d.color };
    })
  );

  const ctx = document.getElementById('deptDistributionChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: counts.map(d => d.key),
      datasets: [{
        data: counts.map(d => d.count),
        backgroundColor: counts.map(d => d.color),
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Poppins', size: 12 },
            padding: 12,
            usePointStyle: true,
            pointStyleWidth: 8,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${ctx.parsed} students`
          }
        }
      }
    }
  });
}

// ── POSTS OVER TIME LINE CHART (Last 7 days) ──
async function loadPostsOverTimeChart() {
  const days = [];
  const labels = [];
  const counts = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const { count } = await db.from('posts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', d.toISOString())
      .lt('created_at', next.toISOString());

    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    counts.push(count || 0);
  }

  const ctx = document.getElementById('postsOverTimeChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Posts',
        data: counts,
        borderColor: '#6B0F1A',
        backgroundColor: 'rgba(107,15,26,0.08)',
        borderWidth: 2.5,
        pointBackgroundColor: '#6B0F1A',
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.y} posts` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'Poppins', size: 11 } },
          grid: { color: '#f3f4f6' },
        },
        x: {
          ticks: { font: { family: 'Poppins', size: 11 } },
          grid: { display: false },
        }
      }
    }
  });
}

// ── TOP COMMUNITIES LIST ──
async function loadTopCommunities() {
  const { data: communities } = await db.from('communities').select('id, name, type');
  if (!communities?.length) return;

  const { data: allPosts } = await db.from('posts').select('community_id');
  const countMap = {};
  (allPosts || []).forEach(p => { countMap[p.community_id] = (countMap[p.community_id] || 0) + 1; });

  const counts = communities.map(c => ({ name: c.name, type: c.type, count: countMap[c.id] || 0 }));
  counts.sort((a, b) => b.count - a.count);
  const top5 = counts.slice(0, 5);
  const maxCount = top5[0]?.count || 1;

  const container = document.getElementById('topCommunitiesList');
  container.innerHTML = top5.map((c, i) => {
    const pct = Math.round((c.count / maxCount) * 100);
    const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
    return `
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:600;color:var(--gray-800);">${medals[i]} ${escapeHtml(c.name)}</span>
          <span style="font-size:12px;font-weight:700;color:var(--maroon);">${c.count}</span>
        </div>
        <div style="height:6px;background:var(--gray-200);border-radius:9999px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:var(--maroon);border-radius:9999px;transition:width 0.6s ease;"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ── DEPARTMENT TABLE ──
async function loadDeptTable() {
  const { count: totalUsers } = await db.from('profiles').select('*', { count: 'exact', head: true });

  const rows = await Promise.all(
    DEPT_LIST.map(async d => {
      const [{ count: userCount }, { count: postCount }] = await Promise.all([
        db.from('profiles').select('*', { count: 'exact', head: true }).eq('department', d.full),
        db.from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('community_id',
            (await db.from('communities').select('id').ilike('name', `%${d.key}%`).single())?.data?.id || '00000000-0000-0000-0000-000000000000'
          ),
      ]);
      return { ...d, userCount: userCount || 0, postCount: postCount || 0 };
    })
  );

  const total = totalUsers || 1;
  const tbody = document.getElementById('deptTableBody');

  tbody.innerHTML = rows.map(row => {
    const pct = ((row.userCount / total) * 100).toFixed(1);
    return `
      <tr style="border-bottom:1px solid var(--gray-200);">
        <td style="padding:1rem;">
          <div style="display:flex;align-items:center;gap:0.75rem;">
            <div style="width:12px;height:12px;border-radius:50%;background:${row.color};flex-shrink:0;"></div>
            <div>
              <div style="font-weight:700;font-size:14px;">${row.key}</div>
              <div style="font-size:12px;color:var(--gray-500);">${row.full.replace(/ \([^)]+\)$/, '')}</div>
            </div>
          </div>
        </td>
        <td style="padding:1rem;text-align:center;font-size:1.1rem;font-weight:800;color:${row.color};">${row.userCount}</td>
        <td style="padding:1rem;text-align:center;font-size:1.1rem;font-weight:800;color:var(--gray-700);">${row.postCount}</td>
        <td style="padding:1rem;text-align:center;font-size:14px;font-weight:600;color:var(--gray-600);">${pct}%</td>
        <td style="padding:1rem;">
          <div style="height:8px;background:var(--gray-200);border-radius:9999px;overflow:hidden;min-width:80px;">
            <div style="height:100%;width:${pct}%;background:${row.color};border-radius:9999px;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div'); d.textContent = text; return d.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => { await db.auth.signOut(); window.location.href = 'login.html'; });

// ── POSTS BY CATEGORY (Lost & Found, Academic, General, Marketplace) ──
async function loadPostsByCategoryChart() {
  const CATEGORIES = [
    { label: 'Lost & Found',      slugs: ['lostandfound', 'lost-and-found', 'lost_found'],  color: '#ef4444' },
    { label: 'Academic',          slugs: ['academic'],                                        color: '#3b82f6' },
    { label: 'General',           slugs: ['general', 'ssg'],                                  color: '#6B0F1A' },
    { label: 'Marketplace',       slugs: ['marketplace', 'sharing'],                          color: '#f59e0b' },
    { label: 'Department Feeds',  slugs: ['cte', 'css', 'cbe', 'psych', 'ccje'],             color: '#10b981' },
  ];

  const { data: communities } = await db.from('communities').select('id, slug');
  const { data: allPosts }    = await db.from('posts').select('community_id');

  if (!communities || !allPosts) return;

  const countMap = {};
  allPosts.forEach(p => { countMap[p.community_id] = (countMap[p.community_id] || 0) + 1; });

  const categoryCounts = CATEGORIES.map(cat => {
    const matchedIds = communities
      .filter(c => cat.slugs.some(s => c.slug?.toLowerCase().includes(s)))
      .map(c => c.id);
    const total = matchedIds.reduce((sum, id) => sum + (countMap[id] || 0), 0);
    return { label: cat.label, count: total, color: cat.color };
  });

  const ctx = document.getElementById('postsByCategoryChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categoryCounts.map(c => c.label),
      datasets: [{
        label: 'Posts',
        data: categoryCounts.map(c => c.count),
        backgroundColor: categoryCounts.map(c => c.color + 'cc'),
        borderColor: categoryCounts.map(c => c.color),
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} posts` } }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'Poppins', size: 11 } },
          grid: { color: '#f3f4f6' },
        },
        x: {
          ticks: { font: { family: 'Poppins', size: 11 } },
          grid: { display: false },
        }
      }
    }
  });
}

// ── SENTIMENT DISTRIBUTION CHART ──
async function loadSentimentChart() {
  const sentiments = ['positive', 'neutral', 'negative', 'critical'];
  const colors     = ['#10b981',  '#6b7280',  '#f59e0b',  '#dc2626'];
  const labels     = ['Positive', 'Neutral',  'Negative', 'Critical'];

  const counts = await Promise.all(
    sentiments.map(async s => {
      const { count } = await db
        .from('post_sentiment')
        .select('*', { count: 'exact', head: true })
        .eq('sentiment', s);
      return count || 0;
    })
  );

  const total = counts.reduce((a, b) => a + b, 0);

  const ctx = document.getElementById('sentimentChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderColor: '#ffffff',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Poppins', size: 12 },
            padding: 12,
            usePointStyle: true,
          }
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${ctx.parsed} posts (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

// ── MODERATION RESPONSE TIME ──
async function loadResponseTimeStats() {
  const container = document.getElementById('responseTimeStats');

  try {
    // Get flagged posts that have been reviewed (moderation_status changed from pending)
    const { data: flaggedPosts } = await db
      .from('posts')
      .select('id, created_at, moderation_status, is_flagged')
      .eq('is_flagged', true)
      .order('created_at', { ascending: false })
      .limit(100);

    // Get admin activity logs for post actions (delete/unflag = resolved)
    const { data: logs } = await db
      .from('admin_activity_logs')
      .select('action_type, target_id, created_at')
      .in('action_type', ['delete_post', 'unflag_post'])
      .order('created_at', { ascending: false })
      .limit(200);

    // Count total flagged vs resolved
    const totalFlagged = flaggedPosts?.length || 0;

    // Match resolutions to flag events
    const resolvedIds = new Set((logs || []).map(l => l.target_id));
    const resolvedCount = (flaggedPosts || []).filter(p => resolvedIds.has(p.id)).length;
    const pendingCount  = totalFlagged - resolvedCount;

    // Average response time: compare post created_at vs earliest log action on that post
    let totalMs = 0;
    let pairedCount = 0;

    for (const post of (flaggedPosts || [])) {
      const resolution = (logs || []).find(l => l.target_id === post.id);
      if (resolution) {
        const diff = new Date(resolution.created_at) - new Date(post.created_at);
        if (diff > 0) { totalMs += diff; pairedCount++; }
      }
    }

    const avgMs      = pairedCount > 0 ? totalMs / pairedCount : null;
    const avgHours   = avgMs ? (avgMs / 3600000).toFixed(1) : null;
    const avgDisplay = avgHours
      ? (avgHours < 1 ? `${Math.round(avgMs / 60000)} min` : `${avgHours} hrs`)
      : 'N/A';

    // Resolution rate
    const resolutionRate = totalFlagged > 0 ? Math.round((resolvedCount / totalFlagged) * 100) : 0;

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div style="padding:1rem;background:var(--gray-50);border-radius:8px;text-align:center;">
          <div style="font-size:1.75rem;font-weight:800;color:#6B0F1A;">${avgDisplay}</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;font-weight:500;">Avg. Response Time</div>
        </div>
        <div style="padding:1rem;background:var(--gray-50);border-radius:8px;text-align:center;">
          <div style="font-size:1.75rem;font-weight:800;color:#10b981;">${resolutionRate}%</div>
          <div style="font-size:12px;color:var(--gray-500);margin-top:4px;font-weight:500;">Resolution Rate</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:0.625rem;margin-top:0.5rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.625rem 0.875rem;background:#fee2e2;border-radius:8px;">
          <span style="font-size:13px;font-weight:600;color:#dc2626;"><i class="fas fa-flag"></i> Total Flagged</span>
          <span style="font-size:1rem;font-weight:800;color:#dc2626;">${totalFlagged}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.625rem 0.875rem;background:#dcfce7;border-radius:8px;">
          <span style="font-size:13px;font-weight:600;color:#16a34a;"><i class="fas fa-check-circle"></i> Resolved</span>
          <span style="font-size:1rem;font-weight:800;color:#16a34a;">${resolvedCount}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:0.625rem 0.875rem;background:#fef3c7;border-radius:8px;">
          <span style="font-size:13px;font-weight:600;color:#d97706;"><i class="fas fa-clock"></i> Pending Review</span>
          <span style="font-size:1rem;font-weight:800;color:#d97706;">${pendingCount}</span>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color:var(--gray-400);font-size:14px;">Unable to load response time data.</div>`;
    console.warn('Response time stats error:', err);
  }
}

// ── USER ACTIVITY SUMMARY ──
async function loadActivitySummary() {
  const container = document.getElementById('activitySummary');

  try {
    const now = new Date();
    const today      = new Date(now); today.setHours(0,0,0,0);
    const weekAgo    = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo   = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      { count: postsToday },
      { count: postsWeek },
      { count: postsMonth },
      { count: commentsWeek },
      { count: likesWeek },
      { count: newUsersWeek },
    ] = await Promise.all([
      db.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      db.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      db.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo.toISOString()),
      db.from('comments').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      db.from('post_likes').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
      db.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
    ]);

    const rows = [
      { icon: 'fa-newspaper',  color: '#6B0F1A', label: 'Posts today',         value: postsToday  || 0 },
      { icon: 'fa-calendar-week', color: '#3b82f6', label: 'Posts this week',  value: postsWeek   || 0 },
      { icon: 'fa-calendar-alt',  color: '#8b5cf6', label: 'Posts this month', value: postsMonth  || 0 },
      { icon: 'fa-comments',   color: '#10b981', label: 'Comments this week',  value: commentsWeek || 0 },
      { icon: 'fa-heart',      color: '#ef4444', label: 'Likes this week',     value: likesWeek   || 0 },
      { icon: 'fa-user-plus',  color: '#f59e0b', label: 'New users this week', value: newUsersWeek || 0 },
    ];

    container.innerHTML = rows.map(r => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.625rem 0.875rem;background:var(--gray-50);border-radius:8px;">
        <div style="display:flex;align-items:center;gap:0.625rem;">
          <div style="width:32px;height:32px;border-radius:8px;background:${r.color}18;color:${r.color};display:flex;align-items:center;justify-content:center;font-size:0.875rem;">
            <i class="fas ${r.icon}"></i>
          </div>
          <span style="font-size:13px;font-weight:500;color:var(--gray-700);">${r.label}</span>
        </div>
        <span style="font-size:1rem;font-weight:800;color:${r.color};">${r.value}</span>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div style="color:var(--gray-400);font-size:14px;">Unable to load activity data.</div>`;
    console.warn('Activity summary error:', err);
  }
}
