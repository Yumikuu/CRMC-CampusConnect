// ═══════════════════════════════════════════════════════════════
// DEPT ANALYTICS — Stats, charts, and top contributors
// ═══════════════════════════════════════════════════════════════

let adminUser = null;
let deptCommunityId = null;
let lineChartInstance = null;
let doughnutChartInstance = null;

const DEPT_FULL = {
  'CTE':'College of Teacher Education (CTE)', 'CSS':'College of Computer Studies (CSS)',
  'CBE':'College of Business Education (CBE)', 'PSYCH':'Psychology (PSYCH)',
  'CCJE':'College of Criminal Justice Education (CCJE)'
};

(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = 'login.html'; return; }

  const { data: profile } = await db.from('profiles').select('*').eq('id', session.user.id).single();
  if (!profile || !['CTE','CSS','CBE','PSYCH','CCJE'].includes(profile.admin_role)) {
    window.location.href = profile?.admin_role === 'SSG' ? 'main-dashboard.html' : '../campusfeed.html';
    return;
  }
  adminUser = profile;

  document.getElementById('adminAvatar').textContent = (profile.first_name[0] + profile.last_name[0]).toUpperCase();
  document.getElementById('adminName').textContent = `${profile.first_name} ${profile.last_name}`;
  document.getElementById('adminRoleText').textContent = `${profile.admin_role} Admin`;
  document.getElementById('pageTitle').textContent = `${profile.admin_role} Analytics`;
  document.getElementById('pageSubtitle').textContent = `Overview of the ${DEPT_FULL[profile.admin_role]}`;
  document.querySelectorAll('.deptLabel').forEach(el => el.textContent = profile.admin_role);

  // Get department community
  const { data: community } = await db
    .from('communities')
    .select('id')
    .eq('type', 'department')
    .ilike('department', DEPT_FULL[profile.admin_role])
    .single();

  if (community) deptCommunityId = community.id;

  await Promise.all([
    loadStatCards(),
    loadLineChart(),
    loadDoughnutChart(),
    loadTopContributors(),
  ]);
})();

// ── STAT CARDS ──
async function loadStatCards() {
  const deptFull = DEPT_FULL[adminUser.admin_role];

  // Student count
  const { count: studentCount } = await db.from('profiles')
    .select('id', { count: 'exact', head: true })
    .ilike('department', deptFull)
    .is('admin_role', null);

  // Post count
  let postCount = 0;
  let flaggedCount = 0;
  let commentCount = 0;

  if (deptCommunityId) {
    const { count: pc } = await db.from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', deptCommunityId);
    postCount = pc || 0;

    const { count: fc } = await db.from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('community_id', deptCommunityId)
      .eq('is_flagged', true);
    flaggedCount = fc || 0;

    // Comments: join via posts in this community
    const { data: postIds } = await db.from('posts')
      .select('id')
      .eq('community_id', deptCommunityId);

    if (postIds && postIds.length > 0) {
      const ids = postIds.map(p => p.id);
      const { count: cc } = await db.from('comments')
        .select('id', { count: 'exact', head: true })
        .in('post_id', ids);
      commentCount = cc || 0;
    }
  }

  document.getElementById('statStudents').textContent = studentCount || 0;
  document.getElementById('statPosts').textContent = postCount;
  document.getElementById('statComments').textContent = commentCount;
  document.getElementById('statFlagged').textContent = flaggedCount;
}

// ── LINE CHART: Last 7 days post activity ──
async function loadLineChart() {
  const labels = [];
  const counts = [];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setHours(0,0,0,0);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    labels.push(dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    if (deptCommunityId) {
      const { count } = await db.from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('community_id', deptCommunityId)
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString());
      counts.push(count || 0);
    } else {
      counts.push(0);
    }
  }

  const ctx = document.getElementById('lineChart').getContext('2d');
  if (lineChartInstance) lineChartInstance.destroy();

  lineChartInstance = new Chart(ctx, {
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
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        fill: true,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} post${ctx.parsed.y !== 1 ? 's' : ''}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, font: { family: 'Poppins' } },
          grid: { color: '#f3f4f6' },
        },
        x: {
          ticks: { font: { family: 'Poppins', size: 11 } },
          grid: { display: false },
        },
      },
    },
  });
}

// ── DOUGHNUT CHART: Account status breakdown ──
async function loadDoughnutChart() {
  const deptFull = DEPT_FULL[adminUser.admin_role];
  const statuses = ['approved', 'pending', 'suspended', 'rejected'];
  const colors = ['#10b981', '#f59e0b', '#ef4444', '#6b7280'];
  const counts = [];

  for (const status of statuses) {
    const { count } = await db.from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('department', deptFull)
      .eq('account_status', status)
      .is('admin_role', null);
    counts.push(count || 0);
  }

  const ctx = document.getElementById('doughnutChart').getContext('2d');
  if (doughnutChartInstance) doughnutChartInstance.destroy();

  const total = counts.reduce((a, b) => a + b, 0);

  doughnutChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: statuses.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderColor: '#fff',
        borderWidth: 2,
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Poppins', size: 12 },
            padding: 12,
            usePointStyle: true,
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const val = ctx.parsed;
              const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${val} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// ── TOP CONTRIBUTORS TABLE ──
async function loadTopContributors() {
  const tbody = document.getElementById('contributorsBody');

  if (!deptCommunityId) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--gray-400);">Department community not found.</td></tr>`;
    return;
  }

  // Fetch up to 200 non-anonymous posts in the community
  const { data: posts } = await db.from('posts')
    .select('author_id')
    .eq('community_id', deptCommunityId)
    .eq('is_anonymous', false)
    .not('author_id', 'is', null)
    .limit(200);

  if (!posts || posts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--gray-400);">No post data available.</td></tr>`;
    return;
  }

  // Count posts per author client-side
  const countMap = {};
  for (const p of posts) {
    if (!p.author_id) continue;
    countMap[p.author_id] = (countMap[p.author_id] || 0) + 1;
  }

  // Sort and take top 5
  const top5 = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (top5.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--gray-400);">No contributors yet.</td></tr>`;
    return;
  }

  // Fetch profile details for top 5
  const ids = top5.map(([id]) => id);
  const { data: profiles } = await db.from('profiles')
    .select('id, first_name, last_name, student_id')
    .in('id', ids);

  const profileMap = {};
  if (profiles) profiles.forEach(p => { profileMap[p.id] = p; });

  const maxCount = top5[0][1];

  const rankIcons = ['🥇','🥈','🥉','4','5'];

  tbody.innerHTML = top5.map(([authorId, count], idx) => {
    const p = profileMap[authorId];
    const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Unknown User';
    const studentId = p?.student_id || '—';
    const initials = p ? ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() : '?';
    const barPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;

    return `<tr style="border-bottom:1px solid var(--gray-200);" onmouseenter="this.style.background='var(--gray-50)'" onmouseleave="this.style.background=''">
      <td style="padding:0.875rem 1.25rem;font-size:1.25rem;text-align:center;">${rankIcons[idx]}</td>
      <td style="padding:0.875rem 1.25rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="width:36px;height:36px;border-radius:50%;background:var(--maroon);color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${escapeHtml(initials)}</div>
          <span style="font-size:14px;font-weight:600;color:var(--gray-900);">${escapeHtml(name)}</span>
        </div>
      </td>
      <td style="padding:0.875rem 1.25rem;font-size:13px;color:var(--gray-600);">${escapeHtml(studentId)}</td>
      <td style="padding:0.875rem 1.25rem;">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <div style="flex:1;background:var(--gray-200);border-radius:9999px;height:8px;max-width:120px;">
            <div style="height:8px;border-radius:9999px;background:var(--maroon);width:${barPct}%;"></div>
          </div>
          <span style="font-size:13px;font-weight:700;color:var(--gray-800);min-width:24px;">${count}</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await db.auth.signOut();
  window.location.href = 'login.html';
});

