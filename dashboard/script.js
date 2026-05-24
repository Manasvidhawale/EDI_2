// =========================================================
// RailSense AI — script.js
// Phase 4: Real-Time ML Data Integration
// =========================================================

// ---------------------------------------------------------
// Clock
// ---------------------------------------------------------
function updateClock() {
  const n = new Date();
  const pad = v => String(v).padStart(2, '0');
  document.getElementById('clock').textContent =
    `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}
setInterval(updateClock, 1000);
updateClock();

// ---------------------------------------------------------
// Uptime counter
// ---------------------------------------------------------
const start = Date.now() - 864000000; // pretend started 10 days ago
setInterval(() => {
  const ms = Date.now() - start;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const el = document.getElementById('uptime');
  if (el) el.textContent = `${h}h ${m}m continuous`;
}, 5000);
(() => {
  const el = document.getElementById('uptime');
  if (el) el.textContent = '240h 00m continuous';
})();

// ---------------------------------------------------------
// Particles (cosmetic only)
// ---------------------------------------------------------
const pc = document.getElementById('particles');
for (let i = 0; i < 18; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.left = Math.random() * 100 + '%';
  p.style.animationDuration = (8 + Math.random() * 14) + 's';
  p.style.animationDelay = (Math.random() * 10) + 's';
  p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
  pc.appendChild(p);
}

// ---------------------------------------------------------
// Track sleepers (cosmetic only)
// ---------------------------------------------------------
const sl = document.getElementById('sleepers');
for (let i = 0; i < 22; i++) {
  const d = document.createElement('div');
  d.className = 'sleeper';
  sl.appendChild(d);
}

// ---------------------------------------------------------
// Chart.js — Vibration & Distance history (last 20 readings)
// ---------------------------------------------------------
const MAX_POINTS = 20;
const vibHistory  = Array(MAX_POINTS).fill(0);
const distHistory = Array(MAX_POINTS).fill(0);
const labels      = Array.from({ length: MAX_POINTS }, (_, i) => i);

const chartOpts = color => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false },
    y: { display: false, min: 0 }
  },
  animation: { duration: 400 },
  elements: { point: { radius: 0 }, line: { tension: 0.4, borderWidth: 1.5 } }
});

const vibChart = new Chart(document.getElementById('vibChart'), {
  type: 'line',
  data: {
    labels,
    datasets: [{
      data: vibHistory,
      borderColor: '#ffab00',
      backgroundColor: 'rgba(255,171,0,.08)',
      fill: true
    }]
  },
  options: chartOpts('#ffab00')
});

const distChart = new Chart(document.getElementById('distChart'), {
  type: 'line',
  data: {
    labels,
    datasets: [{
      data: distHistory,
      borderColor: '#00e5ff',
      backgroundColor: 'rgba(0,229,255,.07)',
      fill: true
    }]
  },
  options: chartOpts('#00e5ff')
});

// ---------------------------------------------------------
// Live log messages
// ---------------------------------------------------------
const logMessages = [
  { cls: 'warn', msg: 'Vibration anomaly detected — checking zone' },
  { cls: '',     msg: 'AI model inference complete' },
  { cls: 'warn', msg: 'Track temp monitoring active' },
  { cls: '',     msg: 'Sensor heartbeat OK' },
  { cls: 'warn', msg: 'Distance deviation flagged' },
  { cls: '',     msg: 'ESP32 data received successfully' }
];
let li = 0;

function pushLog(msg, cls) {
  const list = document.getElementById('logList');
  if (!list) return;
  const now = new Date();
  const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const item = document.createElement('div');
  item.className = 'log-item ' + (cls || '');
  item.textContent = `${t} — ${msg}`;
  list.insertBefore(item, list.firstChild);
  if (list.children.length > 8) list.removeChild(list.lastChild);
}

setInterval(() => {
  const m = logMessages[li % logMessages.length]; li++;
  pushLog(m.msg, m.cls);
}, 3500);

// ---------------------------------------------------------
// Helper: update gauge bar + badge
// ---------------------------------------------------------
function updateGauge(barId, pct, level) {
  const bar = document.getElementById(barId);
  if (!bar) return;
  bar.style.width = pct + '%';
  bar.className = 'gauge-fill ' + level;
}

function updateBadge(badgeId, text, level) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.textContent = text;
  badge.className = 'badge ' + (level === 'safe' ? 'ok' : level === 'critical' ? 'crit' : 'warn');
}

// ---------------------------------------------------------
// ✅ CORE: fetchLiveData — reads live_data.json from Python
// ---------------------------------------------------------
async function fetchLiveData() {
  try {
    // Cache-bust so browser always gets fresh JSON
    const res  = await fetch('live_data.json?t=' + Date.now());
    const data = await res.json();

    const { distance, vibration, prediction, accuracy, status_color } = data;

    // --- Distance sensor ---
    const distEl = document.getElementById('dist');
    if (distEl) distEl.textContent = distance.toFixed(1);

    const distPct   = Math.min(100, ((distance - 8) / (22 - 8)) * 100).toFixed(0);
    const distLevel = distance >= 20 ? 'critical' : distance >= 16 ? 'warn' : 'safe';
    updateGauge('dist-bar', distPct, distLevel);
    updateBadge('dist-badge',
      distance >= 20 ? 'CRITICAL' : distance >= 16 ? 'ELEVATED' : 'NORMAL',
      distLevel);

    // --- Vibration sensor ---
    const vibEl = document.getElementById('vib');
    if (vibEl) vibEl.textContent = vibration.toFixed(2);

    const vibPct   = Math.min(100, ((vibration - 0.1) / (1.4 - 0.1)) * 100).toFixed(0);
    const vibLevel = vibration >= 1.1 ? 'critical' : vibration >= 0.75 ? 'warn' : 'safe';
    updateGauge('vib-bar', vibPct, vibLevel);
    updateBadge('vib-badge',
      vibration >= 1.1 ? 'CRITICAL' : vibration >= 0.75 ? 'ELEVATED' : 'NORMAL',
      vibLevel);

    // --- Avg vibration ---
    const avgVibEl = document.getElementById('avg-vib');
    if (avgVibEl) avgVibEl.textContent = vibration.toFixed(2) + ' g';

    // --- AI Crack Probability (derived from model confidence) ---
    const crackProb = prediction === 'NORMAL'
      ? (100 - accuracy).toFixed(1)
      : accuracy.toFixed(1);

    const cpEl = document.getElementById('crack-prob');
    if (cpEl) cpEl.textContent = crackProb + '%';

    const ab = document.getElementById('anom-bar');
    const ap = document.getElementById('anom-pct');
    if (ab) ab.style.width = crackProb + '%';
    if (ap) ap.textContent = Math.round(crackProb) + '%';

    // --- Prediction label ---
    const predEl = document.getElementById('prediction');
    if (predEl) {
      predEl.textContent = prediction;
      predEl.style.color =
        prediction === 'NORMAL'       ? '#69f0ae' :
        prediction === 'CRACK'        ? 'var(--amber)' : 'var(--red)';
    }

    // --- Accuracy label ---
    const accEl = document.getElementById('accuracy');
    if (accEl) accEl.textContent = accuracy + '%';

    // --- Status Box ---
    const statusBox = document.getElementById('statusBox');
    if (statusBox) {
      statusBox.textContent = prediction === 'WAITING' ? 'AWAITING DATA' : prediction;
      statusBox.style.background =
        status_color === 'green'  ? 'rgba(0,200,83,0.18)'  :
        status_color === 'orange' ? 'rgba(255,171,0,0.18)' :
        status_color === 'red'    ? 'rgba(255,23,68,0.25)' : 'rgba(255,255,255,0.05)';
      statusBox.style.borderColor =
        status_color === 'green'  ? '#69f0ae'      :
        status_color === 'orange' ? 'var(--amber)' :
        status_color === 'red'    ? 'var(--red)'   : 'rgba(255,255,255,0.15)';
      statusBox.style.color =
        status_color === 'green'  ? '#69f0ae'      :
        status_color === 'orange' ? 'var(--amber)' :
        status_color === 'red'    ? 'var(--red)'   : 'rgba(255,255,255,0.5)';
    }

    // --- Rolling chart history ---
    vibHistory.push(vibration);  if (vibHistory.length  > MAX_POINTS) vibHistory.shift();
    distHistory.push(distance);  if (distHistory.length > MAX_POINTS) distHistory.shift();
    vibChart.data.datasets[0].data  = [...vibHistory];
    distChart.data.datasets[0].data = [...distHistory];
    vibChart.update('none');
    distChart.update('none');

    // --- Push a log entry on CRACK/SEVERE_CRACK ---
    if (prediction === 'CRACK') {
      pushLog(`⚠ CRACK detected — vib ${vibration.toFixed(2)}g  dist ${distance.toFixed(1)}cm`, 'warn');
    } else if (prediction === 'SEVERE_CRACK') {
      pushLog(`🚨 SEVERE CRACK — immediate action required!`, 'warn');
    }

  } catch (err) {
    console.warn('fetchLiveData error:', err);
  }
}

// Poll every 1 second
setInterval(fetchLiveData, 1000);
fetchLiveData(); // run immediately on load
