// ============================================================
// script.js — ESP32 Weather Station Dashboard
// Firebase Realtime Database listener + Chart.js rendering
// ============================================================

// ============================================================
// 🔥 FIREBASE CONFIGURATION
// Replace these values with YOUR Firebase project credentials.
// Firebase Console → Project Settings → Your Apps → Web App
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ============================================================
// Firebase status indicator
// ============================================================
const fbDot  = document.getElementById('fbDot');
const fbText = document.getElementById('fbStatusText');

function setFirebaseStatus(state) {
  fbDot.className = 'firebase-dot ' + state;
  if (state === 'connected') {
    fbText.textContent = '🔥 Firebase Connected — Live Data';
  } else if (state === 'error') {
    fbText.textContent = '⚠️ Firebase Error — Check Config';
  } else {
    fbText.textContent = 'Connecting to Firebase...';
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
// Chart.js — rolling 20-point history
// ============================================================
const MAX_POINTS    = 20;
let tempHistory     = Array(MAX_POINTS).fill(null);
let humidityHistory = Array(MAX_POINTS).fill(null);
let timeLabels      = Array(MAX_POINTS).fill('');

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
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: false,
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 6 }
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
      backgroundColor: 'rgba(79, 172, 254, 0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 6
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: false,
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8' }
      },
      x: {
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#94a3b8', maxTicksLimit: 6 }
      }
    }
  }
});

// ============================================================
// State tracking
// ============================================================
let prevTemp      = null;
let prevHumidity  = null;
let uptimeSeconds = 0;

// Local uptime counter (resets on page reload)
setInterval(() => {
  uptimeSeconds++;
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const s = uptimeSeconds % 60;
  document.getElementById('uptime').textContent = `${h}h ${m}m ${s}s`;
}, 1000);

// ============================================================
// 🔥 Firebase Realtime Listener
// Path: /sensor/current  ← must match what your ESP32 writes to
// ============================================================
db.ref('/sensor/current').on(
  'value',
  (snapshot) => {
    setFirebaseStatus('connected');
    const data = snapshot.val();
    if (!data) return;

    const temp     = parseFloat(data.temperature);
    const humidity = parseFloat(data.humidity);

    // ── Temperature card ──────────────────────────────────────
    document.getElementById('temperature').textContent = temp.toFixed(1);
    if (prevTemp !== null) {
      const delta = temp - prevTemp;
      const el    = document.getElementById('temp-change');
      el.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '°C';
      el.parentElement.className = 'stat-change ' + (delta >= 0 ? 'change-up' : 'change-down');
      el.parentElement.querySelector('span:first-child').textContent = delta >= 0 ? '↑' : '↓';
    }
    prevTemp = temp;

    // ── Humidity card ─────────────────────────────────────────
    document.getElementById('humidity').textContent = humidity.toFixed(1);
    if (prevHumidity !== null) {
      const delta = humidity - prevHumidity;
      const el    = document.getElementById('humidity-change');
      el.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';
      el.parentElement.className = 'stat-change ' + (delta >= 0 ? 'change-up' : 'change-down');
      el.parentElement.querySelector('span:first-child').textContent = delta >= 0 ? '↑' : '↓';
    }
    prevHumidity = humidity;

    // ── Heat Index (Steadman formula) ─────────────────────────
    const hi =
      -8.78469475556
      + 1.61139411       * temp
      + 2.33854883889    * humidity
      + (-0.14611605)    * temp * humidity
      + (-0.012308094)   * temp * temp
      + (-0.0164248277778) * humidity * humidity
      + 0.002211732      * temp * temp * humidity
      + 0.00072546       * temp * humidity * humidity
      + (-0.000003582)   * temp * temp * humidity * humidity;

    const heatIndex = isNaN(hi) ? temp : hi;
    document.getElementById('heatIndex').textContent = heatIndex.toFixed(1);

    let comfort = 'Comfortable';
    if      (heatIndex > 39) comfort = '🔥 Danger';
    else if (heatIndex > 35) comfort = '🥵 Very Hot';
    else if (heatIndex > 32) comfort = '☀️ Hot';
    else if (heatIndex < 20) comfort = '❄️ Cool';
    document.getElementById('comfort-level').textContent = comfort;

    // ── System Status ─────────────────────────────────────────
    document.getElementById('systemStatus').textContent = 'ONLINE';
    document.getElementById('lastUpdate').textContent   = new Date().toLocaleTimeString();

    // ── Optional device fields (sent by ESP32) ────────────────
    if (data.rssi) document.getElementById('wifiSignal').textContent = data.rssi + ' dBm';
    if (data.ip)   document.getElementById('ipAddress').textContent  = data.ip;

    // ── Update Charts ─────────────────────────────────────────
    const now   = new Date();
    const label = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');

    tempHistory.shift();     tempHistory.push(temp);
    humidityHistory.shift(); humidityHistory.push(humidity);
    timeLabels.shift();      timeLabels.push(label);

    tempChart.update();
    humidityChart.update();
  },
  (error) => {
    setFirebaseStatus('error');
    console.error('Firebase error:', error);
    document.getElementById('systemStatus').textContent = 'ERROR';
  }
);