// ============================================================
// script.js — IMPERIAL WEATHER COMMAND
// Firebase + Chart.js + Imperial March (Web Audio API)
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
// STARFIELD
// ============================================================
(function initStarfield() {
  const canvas = document.getElementById('starfield');
  const ctx    = canvas.getContext('2d');
  let stars    = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  function makeStars(n) {
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random(),
        speed: Math.random() * 0.003 + 0.001,
        drift: (Math.random() - 0.5) * 0.05
      });
    }
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.a += s.speed;
      s.x += s.drift;
      if (s.x < 0) s.x = canvas.width;
      if (s.x > canvas.width) s.x = 0;
      const alpha = (Math.sin(s.a) + 1) / 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha * 0.7})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', () => { resize(); makeStars(200); });
  resize(); makeStars(200); draw();
})();

// ============================================================
// IMPERIAL MARCH — Web Audio API synthesizer
// ============================================================
let audioCtx   = null;
let marchNodes = [];
let marchPlaying = false;
let marchLoop  = null;

// Imperial March note sequence (frequency, duration in seconds)
const MARCH_NOTES = [
  // Opening theme
  [392.0,0.42],[392.0,0.42],[392.0,0.42],[311.1,0.28],[466.2,0.14],
  [392.0,0.42],[311.1,0.28],[466.2,0.14],[392.0,0.84],
  [587.3,0.42],[587.3,0.42],[587.3,0.42],[622.3,0.28],[466.2,0.14],
  [369.9,0.42],[311.1,0.28],[466.2,0.14],[392.0,0.84],
  // Second phrase
  [784.0,0.42],[392.0,0.21],[392.0,0.21],[784.0,0.42],[739.9,0.28],[698.5,0.14],
  [659.3,0.14],[622.3,0.14],[659.3,0.28],[0,0.28],[415.3,0.28],[554.4,0.42],[523.3,0.28],[493.9,0.14],
  [466.2,0.14],[440.0,0.14],[466.2,0.28],[0,0.28],[311.1,0.28],[369.9,0.42],[311.1,0.28],[369.9,0.42],
  [466.2,0.42],[392.0,0.28],[466.2,0.14],[587.3,0.84]
];

function playImperialMarch() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  let t = audioCtx.currentTime + 0.05;
  marchNodes = [];

  MARCH_NOTES.forEach(([freq, dur]) => {
    if (freq === 0) { t += dur; return; }

    const osc    = audioCtx.createOscillator();
    const gain   = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.setValueAtTime(1, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.setValueAtTime(0.22, t + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, t + dur - 0.02);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t);
    osc.stop(t + dur);
    marchNodes.push(osc);
    t += dur;
  });

  // Schedule loop
  const totalDuration = MARCH_NOTES.reduce((s, [, d]) => s + d, 0);
  marchLoop = setTimeout(() => {
    if (marchPlaying) playImperialMarch();
  }, (totalDuration * 1000));
}

function stopImperialMarch() {
  clearTimeout(marchLoop);
  marchNodes.forEach(n => { try { n.stop(); } catch(e){} });
  marchNodes = [];
}

function toggleAudio() {
  marchPlaying = !marchPlaying;
  const btn  = document.getElementById('audioBtn');
  const icon = document.getElementById('audioIcon');
  const note = document.getElementById('footerNote');

  if (marchPlaying) {
    playImperialMarch();
    btn.classList.add('playing');
    icon.textContent = '🔇';
    btn.innerHTML = '<span id="audioIcon">🔇</span>&nbsp;STOP MARCH';
    note.textContent = '♪ Imperial March playing';
  } else {
    stopImperialMarch();
    btn.classList.remove('playing');
    btn.innerHTML = '<span id="audioIcon">🔊</span>&nbsp;IMPERIAL MARCH';
    note.textContent = '♪ Imperial March standing by';
  }
}

// ============================================================
// CSV Data Log
// ============================================================
const dataLog = [];

// ============================================================
// Connection indicator
// ============================================================
function setConnection(online) {
  const badge = document.getElementById('connectionBadge');
  const label = document.getElementById('connLabel');
  if (online) {
    badge.className = 'connection-badge online';
    label.textContent = 'ONLINE';
  } else {
    badge.className = 'connection-badge';
    label.textContent = 'OFFLINE';
  }
}

// ============================================================
// Chart.js setup
// ============================================================
const MAX_POINTS    = 20;
let tempHistory     = Array(MAX_POINTS).fill(null);
let humidityHistory = Array(MAX_POINTS).fill(null);
let timeLabels      = Array(MAX_POINTS).fill('');
let paused          = false;

const chartAnim = { duration: 500, easing: 'easeInOutQuart' };

const chartDefaults = {
  responsive: true, maintainAspectRatio: true,
  animation: chartAnim,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: false,
      grid:  { color: 'rgba(204,0,0,0.08)' },
      ticks: { color: '#888', font: { family: 'Share Tech Mono', size: 11 } }
    },
    x: {
      grid:  { color: 'rgba(204,0,0,0.04)' },
      ticks: { color: '#888', maxTicksLimit: 6, font: { family: 'Share Tech Mono', size: 10 } }
    }
  }
};

// Temperature chart
const tempCtx   = document.getElementById('tempChart').getContext('2d');
const tempChart = new Chart(tempCtx, {
  type: 'line',
  data: {
    labels: [...timeLabels],
    datasets: [{
      label: 'Temp °C', data: [...tempHistory],
      borderColor: '#ff3333',
      backgroundColor: ctx => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,260);
        g.addColorStop(0,'rgba(255,51,51,0.4)');
        g.addColorStop(1,'rgba(255,51,51,0)');
        return g;
      },
      borderWidth: 2.5, fill: true, tension: 0.4,
      pointRadius: 3, pointBackgroundColor: '#ff3333',
      pointHoverRadius: 6, pointHoverBackgroundColor: '#fff',
      pointBorderColor: '#ff3333', pointBorderWidth: 1.5,
    }]
  },
  options: { ...chartDefaults }
});

// Humidity chart
const humCtx   = document.getElementById('humidityChart').getContext('2d');
const humChart = new Chart(humCtx, {
  type: 'line',
  data: {
    labels: [...timeLabels],
    datasets: [{
      label: 'Humidity %', data: [...humidityHistory],
      borderColor: '#ffe81f',
      backgroundColor: ctx => {
        const g = ctx.chart.ctx.createLinearGradient(0,0,0,260);
        g.addColorStop(0,'rgba(255,232,31,0.35)');
        g.addColorStop(1,'rgba(255,232,31,0)');
        return g;
      },
      borderWidth: 2.5, fill: true, tension: 0.4,
      pointRadius: 3, pointBackgroundColor: '#ffe81f',
      pointHoverRadius: 6, pointHoverBackgroundColor: '#fff',
      pointBorderColor: '#ffe81f', pointBorderWidth: 1.5,
    }]
  },
  options: { ...chartDefaults }
});

// Combined chart
const combCtx   = document.getElementById('combinedChart').getContext('2d');
const combChart = new Chart(combCtx, {
  type: 'line',
  data: {
    labels: [...timeLabels],
    datasets: [
      {
        label: 'Temp °C', data: [...tempHistory],
        borderColor: '#ff3333',
        backgroundColor: 'rgba(255,51,51,0.08)',
        borderWidth: 2, fill: false, tension: 0.4,
        pointRadius: 2, pointBackgroundColor: '#ff3333',
        yAxisID: 'y',
      },
      {
        label: 'Humidity %', data: [...humidityHistory],
        borderColor: '#ffe81f',
        backgroundColor: 'rgba(255,232,31,0.08)',
        borderWidth: 2, fill: false, tension: 0.4,
        pointRadius: 2, pointBackgroundColor: '#ffe81f',
        yAxisID: 'y1',
      }
    ]
  },
  options: {
    responsive: true, maintainAspectRatio: true,
    animation: chartAnim,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#888', font: { family: 'Share Tech Mono', size: 11 }, boxWidth: 12 }
      }
    },
    scales: {
      y: {
        beginAtZero: false, position: 'left',
        grid: { color: 'rgba(255,51,51,0.07)' },
        ticks: { color: '#ff6644', font: { family: 'Share Tech Mono', size: 11 } }
      },
      y1: {
        beginAtZero: false, position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#ffe81f', font: { family: 'Share Tech Mono', size: 11 } }
      },
      x: {
        grid: { color: 'rgba(204,0,0,0.04)' },
        ticks: { color: '#888', maxTicksLimit: 6, font: { family: 'Share Tech Mono', size: 10 } }
      }
    }
  }
});

function togglePause() {
  paused = !paused;
  const btn = document.getElementById('pauseBtn');
  btn.textContent = paused ? '▶ RESUME' : '⏸ PAUSE';
}

// ============================================================
// State
// ============================================================
let prevTemp     = null;
let prevHumidity = null;
let uptimeSeconds = 0;
let recordCount  = 0;

setInterval(() => {
  uptimeSeconds++;
  const h = Math.floor(uptimeSeconds / 3600);
  const m = Math.floor((uptimeSeconds % 3600) / 60);
  const s = uptimeSeconds % 60;
  document.getElementById('uptime').textContent =
    `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}, 1000);

// ============================================================
// Helpers
// ============================================================
function formatTimestamp(d) {
  const mm  = String(d.getMonth()+1).padStart(2,'0');
  const dd  = String(d.getDate()).padStart(2,'0');
  const yy  = d.getFullYear();
  const hh  = d.getHours() % 12 || 12;
  const min = String(d.getMinutes()).padStart(2,'0');
  const ss  = String(d.getSeconds()).padStart(2,'0');
  const ap  = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${mm}/${dd}/${yy}  ${String(hh).padStart(2,'0')}:${min}:${ss} ${ap}`;
}
function formatCSVTimestamp(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} `
       + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

// ============================================================
// CSV Export
// ============================================================
function exportCSV() {
  if (dataLog.length === 0) {
    alert('No data to export yet. Awaiting sensor readings from the ESP32.');
    return;
  }
  const headers = ['Timestamp','Temperature (°C)','Humidity (%)','Heat Index (°C)','Comfort Level'];
  const rows = dataLog.map(r =>
    [r.timestamp, r.temperature, r.humidity, r.heatIndex, r.comfort].join(',')
  );
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const now  = new Date();
  const fn   = `imperial_weather_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}.csv`;
  const a    = document.createElement('a');
  a.href = url; a.download = fn; a.click();
  URL.revokeObjectURL(url);

  const btn = document.getElementById('exportBtn');
  btn.innerHTML = '✓ TRANSMITTED!';
  btn.style.borderColor = '#00ff41';
  btn.style.color = '#00ff41';
  setTimeout(() => {
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>&nbsp;EXPORT CSV`;
    btn.style.borderColor = ''; btn.style.color = '';
  }, 2500);
}

// ============================================================
// Firebase Listener
// ============================================================
db.ref('/sensor/current').on(
  'value',
  snapshot => {
    setConnection(true);
    const data = snapshot.val();
    if (!data) return;

    const temp     = parseFloat(data.temperature);
    const humidity = parseFloat(data.humidity);
    const now      = new Date();

    // ── Temperature
    document.getElementById('temperature').textContent = temp.toFixed(1);
    if (prevTemp !== null) {
      const delta = temp - prevTemp;
      const arrowEl  = document.getElementById('temp-arrow');
      const changeEl = document.getElementById('temp-change');
      arrowEl.textContent  = delta >= 0 ? '↑' : '↓';
      changeEl.textContent = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '°C';
      document.getElementById('temp-change-wrap').style.color = delta >= 0 ? '#ff3333' : '#4fc3f7';
    }
    prevTemp = temp;
    // Comfort badge for temp
    let tempBadge = 'NOMINAL';
    if      (temp > 38) tempBadge = '🔴 CRITICAL';
    else if (temp > 35) tempBadge = '🟠 DANGER';
    else if (temp > 30) tempBadge = '🟡 HOT';
    else if (temp < 20) tempBadge = '🔵 COLD';
    document.getElementById('temp-badge').textContent = tempBadge;

    // ── Humidity
    document.getElementById('humidity').textContent = humidity.toFixed(1);
    if (prevHumidity !== null) {
      const delta = humidity - prevHumidity;
      document.getElementById('humidity-arrow').textContent  = delta >= 0 ? '↑' : '↓';
      document.getElementById('humidity-change').textContent = (delta >= 0 ? '+' : '') + delta.toFixed(1) + '%';
      document.getElementById('humidity-change-wrap').style.color = delta >= 0 ? '#4fc3f7' : '#ff3333';
    }
    prevHumidity = humidity;
    let humBadge = 'COMFORTABLE';
    if      (humidity > 80) humBadge = '💦 VERY HUMID';
    else if (humidity > 65) humBadge = '💧 HUMID';
    else if (humidity < 30) humBadge = '🏜 DRY';
    document.getElementById('humidity-badge').textContent = humBadge;

    // ── Heat Index
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
    if      (heatIndex > 39) comfort = '🔥 LETHAL — EVACUATE';
    else if (heatIndex > 35) comfort = '🥵 DANGER ZONE';
    else if (heatIndex > 32) comfort = '☀️ VERY HOT';
    else if (heatIndex < 20) comfort = '❄️ COOL';
    document.getElementById('comfort-level').textContent = comfort;

    // ── Status
    document.getElementById('systemStatus').textContent = 'IMPERIAL LINK ACTIVE';
    document.getElementById('lastUpdate').textContent   = now.toLocaleTimeString();
    document.getElementById('fullTimestamp').textContent = formatTimestamp(now);

    // ── Record count
    recordCount++;
    document.getElementById('recordCount').textContent = recordCount;

    // ── Log
    dataLog.push({
      timestamp:   formatCSVTimestamp(now),
      temperature: temp.toFixed(1),
      humidity:    humidity.toFixed(1),
      heatIndex:   heatIndex.toFixed(1),
      comfort:     comfort.replace(/[^\w\s\-]/gi, '').trim()
    });

    // ── Optional device fields
    if (data.rssi) document.getElementById('wifiSignal').textContent = data.rssi + ' dBm';
    if (data.ip)   document.getElementById('ipAddress').textContent  = data.ip;

    // ── Charts
    if (!paused) {
      const label = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      tempHistory.shift();     tempHistory.push(temp);
      humidityHistory.shift(); humidityHistory.push(humidity);
      timeLabels.shift();      timeLabels.push(label);

      tempChart.data.labels   = [...timeLabels];
      tempChart.data.datasets[0].data = [...tempHistory];
      humChart.data.labels    = [...timeLabels];
      humChart.data.datasets[0].data = [...humidityHistory];
      combChart.data.labels   = [...timeLabels];
      combChart.data.datasets[0].data = [...tempHistory];
      combChart.data.datasets[1].data = [...humidityHistory];

      tempChart.update();
      humChart.update();
      combChart.update();
    }
  },
  error => {
    setConnection(false);
    console.error('Firebase error:', error);
    document.getElementById('systemStatus').textContent = 'LINK SEVERED';
  }
);