const API = 'http://localhost:5000';

// ════════════════════════════════════════
// TOAST
// ════════════════════════════════════════
function toast(msg, type = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ════════════════════════════════════════
// AUTH
// ════════════════════════════════════════
function getToken() { return localStorage.getItem('lf_token'); }

function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  if (tab === 'login') {
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.getElementById('form-login').classList.add('active');
  } else {
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.getElementById('form-register').classList.add('active');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  try {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === 'string' ? data : (data.msg || data.message || JSON.stringify(data)));
    localStorage.setItem('lf_token', data.wristband);
    toast('Account created!');
    const authSec = document.getElementById('auth-section');
    if (authSec) { updateNav(); authSec.classList.add('hidden'); }
    else { window.location.href = 'dashboard.html'; }
  } catch (err) { toast(err.message, 'err'); }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  try {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === 'string' ? data : (data.msg || data.message || JSON.stringify(data)));
    localStorage.setItem('lf_token', data.wristband);
    toast('Welcome back!');
    const authSec = document.getElementById('auth-section');
    if (authSec) { updateNav(); authSec.classList.add('hidden'); }
    else { window.location.href = 'dashboard.html'; }
  } catch (err) { toast(err.message, 'err'); }
}

function logout() {
  localStorage.removeItem('lf_token');
  window.location.href = 'index.html';
}

function updateNav() {
  const nav = document.getElementById('nav-links');
  if (!nav) return;
  if (getToken()) {
    nav.innerHTML = `
      <a href="dashboard.html">Dashboard</a>
      <a href="analytics.html">Analytics</a>
      <button onclick="logout()">Logout</button>
    `;
    const authSec = document.getElementById('auth-section');
    if (authSec) authSec.classList.add('hidden');
  } else {
    nav.innerHTML = `
      <a href="login.html">Login</a>
      <a href="register.html" class="btn-nav">Register</a>
    `;
    const authSec = document.getElementById('auth-section');
    if (authSec) authSec.classList.remove('hidden');
  }
}

// ════════════════════════════════════════
// FORGE (Shorten URL)
// ════════════════════════════════════════
async function forgeLink() {
  const longUrl = document.getElementById('long-url').value.trim();
  if (!longUrl) return toast('Paste a URL first!', 'err');
  if (!getToken()) return toast('Login first to forge links!', 'err');

  const aliasInput = document.getElementById('custom-alias');
  const customAlias = aliasInput && aliasInput.value.trim() ? aliasInput.value.trim() : undefined;

  try {
    const body = { longUrl };
    if (customAlias) body.customAlias = customAlias;

    const res = await fetch(`${API}/api/url/shorten`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': getToken()
      },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === 'string' ? data : (data.msg || data.message || JSON.stringify(data)));

    // Show result
    document.getElementById('result-url').textContent = data.shortUrl;
    document.getElementById('result').classList.add('show');
    document.getElementById('long-url').value = '';
    if (aliasInput) aliasInput.value = '';
    toast('Link forged!');
  } catch (err) { toast(err.message, 'err'); }
}

function copyLink() {
  const url = document.getElementById('result-url').textContent;
  navigator.clipboard.writeText(url).then(() => toast('Copied!'));
}

function toggleAlias() {
  document.getElementById('custom-alias').classList.toggle('show');
}

// ════════════════════════════════════════
// DASHBOARD
// ════════════════════════════════════════
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/api/url/dashboard`, {
      headers: { 'x-auth-token': getToken() }
    });
    const links = await res.json();
    if (!res.ok) throw new Error(typeof links === 'string' ? links : (links.msg || links.message || JSON.stringify(links)));

    const countEl = document.getElementById('link-count');
    if (countEl) countEl.textContent = `${links.length} link${links.length !== 1 ? 's' : ''} forged`;

    const body = document.getElementById('links-body');
    if (!body) return;

    if (links.length === 0) {
      body.innerHTML = '<div class="empty-state">No links yet. Go forge your first one!</div>';
      return;
    }

    body.innerHTML = links.map(link => `
      <div class="link-row">
        <span class="link-short">${link.shortUrl}</span>
        <span class="link-long" title="${link.longUrl}">${link.longUrl}</span>
        <span class="link-clicks">${link.clicks}</span>
        <span class="link-date">${new Date(link.createdAt).toLocaleDateString()}</span>
        <span class="link-actions">
          <button class="btn-sm" onclick="copyText('${link.shortUrl}')">📋</button>
        </span>
      </div>
    `).join('');
  } catch (err) { toast(err.message, 'err'); }
}

async function dashForge() {
  const input = document.getElementById('dash-url');
  const longUrl = input.value.trim();
  if (!longUrl) return toast('Paste a URL!', 'err');

  try {
    const res = await fetch(`${API}/api/url/shorten`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': getToken()
      },
      body: JSON.stringify({ longUrl })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(typeof data === 'string' ? data : (data.msg || data.message || JSON.stringify(data)));
    input.value = '';
    toast('Link forged!');
    loadDashboard(); // Refresh the table
  } catch (err) { toast(err.message, 'err'); }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => toast('Copied!'));
}

// ════════════════════════════════════════
// INIT
// ════════════════════════════════════════
updateNav();

// ════════════════════════════════════════
// ANALYTICS
// ════════════════════════════════════════

let allClickData = []; // Raw click events from API
let currentRange = 7;  // Default 7 days

function setRange(days, btn) {
  currentRange = days;
  document.querySelectorAll('.range-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  if (allClickData.length > 0) renderAnalytics(allClickData);
}

async function loadAnalytics() {
  try {
    const res = await fetch(`${API}/api/url/analytics`, {
      headers: { 'x-auth-token': getToken() }
    });
    const clicks = await res.json();
    if (!res.ok) throw new Error(typeof clicks === 'string' ? clicks : (clicks.msg || clicks.message || JSON.stringify(clicks)));

    allClickData = clicks;

    // Hide loading
    const loadingEl = document.getElementById('analytics-loading');
    if (loadingEl) loadingEl.classList.add('hidden');

    if (clicks.length === 0) {
      document.getElementById('analytics-empty').classList.remove('hidden');
      document.getElementById('analytics-sub').textContent = 'No click data yet';
      return;
    }

    document.getElementById('analytics-content').classList.remove('hidden');
    renderAnalytics(clicks);
  } catch (err) {
    const loadingEl = document.getElementById('analytics-loading');
    if (loadingEl) loadingEl.classList.add('hidden');
    toast(err.message, 'err');
  }
}

function renderAnalytics(clicks) {
  // Filter by range
  let filtered = clicks;
  if (currentRange > 0) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - currentRange);
    filtered = clicks.filter(c => new Date(c.timestamp) >= cutoff);
  }

  // ── STAT CARDS ──
  const total = filtered.length;
  const uniqueIPs = new Set(filtered.map(c => c.ipHash)).size;
  const countryCounts = countField(filtered, 'country');
  const browserCounts = countField(filtered, 'browser');

  document.getElementById('stat-total').textContent = formatNum(total);
  document.getElementById('stat-unique').textContent = formatNum(uniqueIPs);
  document.getElementById('stat-country').textContent = countryCounts[0] ? countryCounts[0][0] : '—';
  document.getElementById('stat-browser').textContent = browserCounts[0] ? browserCounts[0][0] : '—';
  document.getElementById('analytics-sub').textContent =
    `${formatNum(total)} click${total !== 1 ? 's' : ''} across ${uniqueIPs} unique visitor${uniqueIPs !== 1 ? 's' : ''}`;

  // ── TIMELINE CHART ──
  const timelineData = buildTimeline(filtered);
  drawAreaChart('chart-timeline', timelineData.labels, timelineData.values);

  // ── DONUT CHARTS ──
  const deviceCounts = countField(filtered, 'device');
  const osCounts = countField(filtered, 'os');

  drawDonut('chart-devices', 'legend-devices', deviceCounts, total);
  drawDonut('chart-browsers', 'legend-browsers', browserCounts.slice(0, 6), total);
  drawDonut('chart-os', 'legend-os', osCounts.slice(0, 6), total);

  // ── REFERRERS TABLE ──
  const refCounts = countField(filtered, 'referrer');
  renderTable('table-referrers', refCounts.slice(0, 10), total, false);

  // ── COUNTRIES TABLE ──
  renderTable('table-countries', countryCounts.slice(0, 10), total, true);
}

// ── HELPERS ──

function countField(arr, field) {
  const map = {};
  arr.forEach(item => {
    const val = item[field] || 'Unknown';
    map[val] = (map[val] || 0) + 1;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function formatNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

function buildTimeline(clicks) {
  const days = currentRange || 30; // if ALL, show last 30 days of chart
  const labels = [];
  const values = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    values.push(0);

    clicks.forEach(c => {
      if (new Date(c.timestamp).toISOString().slice(0, 10) === key) {
        values[values.length - 1]++;
      }
    });
  }
  return { labels, values };
}

// ═══════════════════════════════════════
// CANVAS CHARTS
// ═══════════════════════════════════════

const CHART_COLORS = [
  '#c62828', '#e53935', '#ff6e6e', '#ff9e80',
  '#ffab91', '#bcaaa4', '#90a4ae', '#78909c',
  '#546e7a', '#455a64'
];

function drawAreaChart(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Size canvas properly
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = 200 * dpr;
  canvas.style.height = '200px';
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = 200;
  const padL = 40, padR = 16, padT = 16, padB = 36;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...values, 1);
  const stepX = chartW / Math.max(labels.length - 1, 1);

  // Grid lines
  const gridLines = 4;
  ctx.strokeStyle = 'rgba(30,30,34,0.8)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(W - padR, y);
    ctx.stroke();

    // Y axis labels
    const val = Math.round(maxVal - (maxVal / gridLines) * i);
    ctx.fillStyle = '#71717a';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(val, padL - 8, y + 3);
  }

  // Build points
  const points = values.map((v, i) => ({
    x: padL + i * stepX,
    y: padT + chartH - (v / maxVal) * chartH
  }));

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, padT, 0, H - padB);
  gradient.addColorStop(0, 'rgba(198,40,40,0.25)');
  gradient.addColorStop(1, 'rgba(198,40,40,0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, H - padB);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, H - padB);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = '#c62828';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dots
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#e53935';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0b';
    ctx.fill();
  });

  // X axis labels (show ~8 max)
  const labelSkip = Math.ceil(labels.length / 8);
  ctx.fillStyle = '#71717a';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  labels.forEach((label, i) => {
    if (i % labelSkip === 0 || i === labels.length - 1) {
      ctx.fillText(label, padL + i * stepX, H - padB + 18);
    }
  });
}

function drawDonut(canvasId, legendId, data, total) {
  const canvas = document.getElementById(canvasId);
  const legend = document.getElementById(legendId);
  if (!canvas || !legend) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 140;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  ctx.scale(dpr, dpr);

  const cx = size / 2, cy = size / 2;
  const outerR = 62, innerR = 40;

  ctx.clearRect(0, 0, size, size);

  // If no data
  if (data.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(30,30,34,0.5)';
    ctx.fill();
    legend.innerHTML = '<li style="color:var(--gray)">No data</li>';
    return;
  }

  let startAngle = -Math.PI / 2;
  const filteredTotal = data.reduce((s, d) => s + d[1], 0);

  data.forEach((d, i) => {
    const sliceAngle = (d[1] / filteredTotal) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = CHART_COLORS[i % CHART_COLORS.length];
    ctx.fill();

    // Tiny gap between segments
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, endAngle - 0.02, endAngle + 0.02);
    ctx.arc(cx, cy, innerR, endAngle + 0.02, endAngle - 0.02, true);
    ctx.fillStyle = '#141416';
    ctx.fill();

    startAngle = endAngle;
  });

  // Center text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatNum(filteredTotal), cx, cy - 6);
  ctx.fillStyle = '#71717a';
  ctx.font = '9px Outfit, sans-serif';
  ctx.fillText('CLICKS', cx, cy + 10);

  // Legend
  legend.innerHTML = data.map((d, i) => {
    const pct = ((d[1] / filteredTotal) * 100).toFixed(1);
    return `<li>
      <span class="donut-legend__dot" style="background:${CHART_COLORS[i % CHART_COLORS.length]}"></span>
      ${d[0]}
      <span class="donut-legend__val">${d[1]} (${pct}%)</span>
    </li>`;
  }).join('');
}

function renderTable(tableId, data, total, showRank) {
  const table = document.getElementById(tableId);
  if (!table) return;
  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  if (data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="color:var(--gray);text-align:center;padding:1.5rem">No data yet</td></tr>';
    return;
  }

  const maxCount = data[0][1];
  tbody.innerHTML = data.map((d, i) => {
    const barWidth = (d[1] / maxCount) * 100;
    const rankCol = showRank ? `<td><span class="rank">${i + 1}</span></td>` : '';
    return `<tr>
      ${rankCol}
      <td class="bar-cell">
        <span class="bar-bg" style="width:${barWidth}%"></span>
        ${d[0]}
      </td>
      <td>${d[1]}</td>
    </tr>`;
  }).join('');
}
