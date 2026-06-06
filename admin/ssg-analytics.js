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

  const counts = await Promise.all(
    communities.map(async c => {
      const { count } = await db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', c.id);
      return { name: c.name, count: count || 0 };
    })
  );

  // Sort by count descending, take top 8
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

  const counts = await Promise.all(
    communities.map(async c => {
      const { count } = await db.from('posts').select('*', { count: 'exact', head: true }).eq('community_id', c.id);
      return { name: c.name, type: c.type, count: count || 0 };
    })
  );

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
