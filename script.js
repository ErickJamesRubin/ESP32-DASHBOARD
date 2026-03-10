// ============================================================
// script.js — ESP32 Weather Station Dashboard
// Firebase + Chart.js + CSV Export + Timestamp + Connection UI
// ============================================================

// ============================================================
// 🔥 FIREBASE CONFIGURATION
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyDaCwd669Af_0UBOfdmy_fmstROGkTs4",
  authDomain:        "esp32-weather-station-91608.firebaseapp.com",
  databaseURL:       "https://esp32-weather-station-91608-default-rtdb.firebaseio.com",
  projectId:         "esp32-weather-station-91608",
  storageBucket:     "esp32-weather-station-91608.appspot.com",
  messagingSenderId: "650143484331",
  appId:             "1:650143484331:web:fb11ca0c9c31fe69c86ee"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================================
// CSV Data Log — stores every reading for export
// ============================================================
const dataLog = [];   // { timestamp, temperature, humidity, heatIndex, comfort }

// ============================================================
// Connection indicator
// ============================================================
const connDot   = document.getElementById('connDot');
const connLabel = document.getElementById('connLabel');
const connBadge = document.getElementById('connectionBadge');

function setConnection(online) {
  if (online) {
    connDot.className   = 'connection-dot online';
    connLabel.textContent = 'ONLINE';
    connBadge.className = 'connection-badge online';
  } else {
    connDot.className   = 'connection-dot offline';
    connLabel.textContent = 'OFFLINE';
    connBadge.className = 'connection-badge offline';
  }
}

// ============================================================
// Background particles
// ============================================================
const particlesContainer = document.getElementById('particles');
for (let i = 0; i < 50; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.left           = Math.random() * 100 + '%';
  p.style.top            = Math.random() * 100 + '%';
  p.style.animationDelay = Math.random() * 20 + 's';
  particlesContainer.appendChild(p);
}

// ============================================================
// Chart.js — animated, rolling 20-point history
// ============================================================
const MAX_POINTS    = 20;
let tempHistory     = Array(MAX_POINTS).fill(null);
let humidityHistory = Array(MAX_POINTS).fill(null);
let timeLabels      = Array(MAX_POINTS).fill('');

// Shared chart animation config
const chartAnimation = {
  duration: 600,
  easing: 'easeInOutQuart'
};

// Temperature Chart
const tempCtx   = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(tempCtx, {
  type: 'line',
  data: {
    labels: timeLabels,
    datasets: [{
      label: 'Temperature (°C)',
      data: tempHistory,
      borderColor: '#ff6b6b',
      backgroundColor: (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(255,107,107,0.35)');
        gradient.addColorStop(1, 'rgba(255,107,107,0)');
        return gradient;
      },
      borderWidth: 3, fill: true, tension: 0.4,
      pointRadius: 3, pointBackgroundColor: '#ff6b6b',
      pointHoverRadius: 7, pointHoverBackgroundColor: '#fff',
      pointBorderColor: '#ff6b6b', pointBorderWidth: 2,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: true,
    animation: chartAnimation,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: false,
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Rajdhani', size: 12 } }
      },
      x: {
        grid:  { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 6, font: { family: 'Rajdhani', size: 11 } }
      }
    }
  }
});

// Humidity Chart
const humidityCtx   = document.getElementById('humidityChart').getContext('2d');
const humidityChart = new Chart(humidityCtx, {
  type: 'line',
  data: {
    labels: timeLabels,
    datasets: [{
      label: 'Humidity (%)',
      data: humidityHistory,
      borderColor: '#4facfe',
      backgroundColor: (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(79,172,254,0.35)');
        gradient.addColorStop(1, 'rgba(79,172,254,0)');
        return gradient;
      },
      borderWidth: 3, fill: true, tension: 0.4,
      pointRadius: 3, pointBackgroundColor: '#4facfe',
      pointHoverRadius: 7, pointHoverBackgroundColor: '#fff',
      pointBorderColor: '#4facfe', pointBorderWidth: 2,
    }]
  },
  options: {
    responsive: true, maintainAspectRatio: true,
    animation: chartAnimation,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: false,
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', font: { family: 'Rajdhani', size: 12 } }
      },
      x: {
        grid:  { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 6, font: { family: 'Rajdhani', size: 11 } }
      }
    }
  }
});

// ============================================================
// State
// ============================================================
let prevTemp      = null;
let prevHumidity  = null;
let uptimeSeconds = 0;
let recordCount   = 0;

// Local uptime counter
setInterval(() => {
  uptimeSeconds++;
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const s = uptimeSeconds % 60;
  document.getElementById('uptime').textContent = `${h}h ${m}m ${s}s`;
}, 1000);

// ============================================================
// Helper — format full timestamp
// ============================================================
function formatTimestamp(date) {
  const mm  = String(date.getMonth() + 1).padStart(2, '0');
  const dd  = String(date.getDate()).padStart(2, '0');
  const yy  = date.getFullYear();
  const hh  = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss  = String(date.getSeconds()).padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  const hh12 = String(date.getHours() % 12 || 12).padStart(2, '0');
  return `${mm}/${dd}/${yy}  ${hh12}:${min}:${ss} ${ampm}`;
}

function formatCSVTimestamp(date) {
  const mm  = String(date.getMonth() + 1).padStart(2, '0');
  const dd  = String(date.getDate()).padStart(2, '0');
  const yy  = date.getFullYear();
  const hh  = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss  = String(date.getSeconds()).padStart(2, '0');
  return `${yy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

// ============================================================
// CSV Export
// ============================================================
function exportCSV() {
  if (dataLog.length === 0) {
    alert('No data to export yet. Wait for at least one reading from the ESP32.');
    return;
  }

  const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)', 'Heat Index (°C)', 'Comfort Level'];
  const rows = dataLog.map(r =>
    [r.timestamp, r.temperature, r.humidity, r.heatIndex, r.comfort].join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const now      = new Date();
  const filename = `weather_data_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}.csv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Button feedback animation
  const btn = document.getElementById('exportBtn');
  btn.textContent = '✓ Exported!';
  btn.style.borderColor = '#43e97b';
  btn.style.color = '#43e97b';
  setTimeout(() => {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Export CSV`;
    btn.style.borderColor = '';
    btn.style.color = '';
  }, 2500);
}

// ============================================================
// 🔥 Firebase Realtime Listener
// ============================================================
db.ref('/sensor/current').on(
  'value',
  (snapshot) => {
    setConnection(true);
    const data = snapshot.val();
    if (!data) return;

    const temp     = parseFloat(data.temperature);
    const humidity = parseFloat(data.humidity);
    const now      = new Date();

    // ── Temperature ───────────────────────────────────────────
    document.getElementById('temperature').textContent = temp.toFixed(1);
    if (prevTemp !== null) {
      const delta = temp - prevTemp;
      const el    = document.getElementById('temp-change');
      el.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '°C';
      el.parentElement.className = 'stat-change ' + (delta >= 0 ? 'change-up' : 'change-down');
      el.parentElement.querySelector('span:first-child').textContent = delta >= 0 ? '↑' : '↓';
    }
    prevTemp = temp;

    // ── Humidity ──────────────────────────────────────────────
    document.getElementById('humidity').textContent = humidity.toFixed(1);
    if (prevHumidity !== null) {
      const delta = humidity - prevHumidity;
      const el    = document.getElementById('humidity-change');
      el.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';
      el.parentElement.className = 'stat-change ' + (delta >= 0 ? 'change-up' : 'change-down');
      el.parentElement.querySelector('span:first-child').textContent = delta >= 0 ? '↑' : '↓';
    }
    prevHumidity = humidity;

    // ── Heat Index ────────────────────────────────────────────
    const hi =
      -8.78469475556
      + 1.61139411        * temp
      + 2.33854883889     * humidity
      + (-0.14611605)     * temp * humidity
      + (-0.012308094)    * temp * temp
      + (-0.0164248277778)* humidity * humidity
      + 0.002211732       * temp * temp * humidity
      + 0.00072546        * temp * humidity * humidity
      + (-0.000003582)    * temp * temp * humidity * humidity;

    const heatIndex = isNaN(hi) ? temp : hi;
    document.getElementById('heatIndex').textContent = heatIndex.toFixed(1);

    let comfort = 'Comfortable';
    if      (heatIndex > 39) comfort = '🔥 Danger';
    else if (heatIndex > 35) comfort = '🥵 Very Hot';
    else if (heatIndex > 32) comfort = '☀️ Hot';
    else if (heatIndex < 20) comfort = '❄️ Cool';
    document.getElementById('comfort-level').textContent = comfort;

    // ── System status ─────────────────────────────────────────
    document.getElementById('systemStatus').textContent = 'ONLINE';
    document.getElementById('lastUpdate').textContent   = now.toLocaleTimeString();

    // ── Full timestamp ────────────────────────────────────────
    document.getElementById('fullTimestamp').textContent = formatTimestamp(now);

    // ── Record count ──────────────────────────────────────────
    recordCount++;
    document.getElementById('recordCount').textContent = recordCount;

    // ── Log to CSV buffer ─────────────────────────────────────
    dataLog.push({
      timestamp:   formatCSVTimestamp(now),
      temperature: temp.toFixed(1),
      humidity:    humidity.toFixed(1),
      heatIndex:   heatIndex.toFixed(1),
      comfort:     comfort.replace(/[^\w\s]/gi, '') // strip emoji for CSV
    });

    // ── Optional device fields ────────────────────────────────
    if (data.rssi) document.getElementById('wifiSignal').textContent = data.rssi + ' dBm';
    if (data.ip)   document.getElementById('ipAddress').textContent  = data.ip;

    // ── Charts ────────────────────────────────────────────────
    const label = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0') + ':' + String(now.getSeconds()).padStart(2,'0');

    tempHistory.shift();     tempHistory.push(temp);
    humidityHistory.shift(); humidityHistory.push(humidity);
    timeLabels.shift();      timeLabels.push(label);

    tempChart.update();
    humidityChart.update();
  },
  (error) => {
    setConnection(false);
    console.error('Firebase error:', error);
    document.getElementById('systemStatus').textContent = 'ERROR';
  }
);