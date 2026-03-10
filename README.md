# 🌡️ ESP32 Weather Station Dashboard

A real-time IoT weather monitoring system using **ESP32 + DHT11**, **Firebase Realtime Database**, and a live hosted web dashboard.

🔗 **Live Website:** [https://esp32-weather-station-91608.web.app](https://esp32-weather-station-91608.web.app)

---

## 📸 Features

- 🌡️ Live temperature & humidity readings from DHT11 sensor
- 🔥 Heat index calculator with comfort level indicator
- 📊 Real-time charts showing last 20 sensor readings
- 📡 Device info panel (WiFi signal, IP address, uptime)
- 🔥 Firebase Realtime Database integration
- 🌐 Hosted live on Firebase Hosting

---

## 🗂️ Project Structure

```
esp32-dashboard/
├── index.html           # Dashboard HTML structure
├── styles.css           # Styling and animations
├── script.js            # Firebase logic + Chart.js
├── esp32_firebase.ino   # Arduino C++ code for ESP32
├── firebase.json        # Firebase Hosting config
└── .firebaserc          # Firebase project link
```

---

## 🔧 Hardware

| Component | Details |
|-----------|---------|
| Microcontroller | ESP32 Dev Module |
| Sensor | DHT11 Temperature & Humidity |
| Connection | USB (for upload) + WiFi (for data) |

### DHT11 Wiring

| DHT11 Pin | ESP32 Pin |
|-----------|-----------|
| VCC | 3.3V |
| GND | GND |
| DATA | GPIO 4 |

---

## 🚀 Getting Started

### 1. Arduino Libraries
Install these via **Sketch → Include Library → Manage Libraries**:
- `Firebase ESP32 Client` by Mobizt
- `DHT sensor library` by Adafruit
- `Adafruit Unified Sensor` by Adafruit

### 2. Configure Credentials
In `esp32_firebase.ino`, fill in your details:
```cpp
#define WIFI_SSID        "YOUR_WIFI_NAME"
#define WIFI_PASSWORD    "YOUR_WIFI_PASSWORD"
#define FIREBASE_HOST    "your-project-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH    "YOUR_API_KEY"
```

> ⚠️ ESP32 only supports **2.4GHz WiFi** — it will not connect to 5GHz networks.

### 3. Upload to ESP32
1. Select board: **ESP32 Dev Module**
2. Select the correct **COM port**
3. Click **Upload ➡️**
4. Open Serial Monitor at **115200 baud** to verify

---

## 🌐 Firebase Setup

### Database Rules
Go to **Firebase Console → Realtime Database → Rules** and set:
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Database Structure
The ESP32 writes to `/sensor/current`:
```
/sensor/current/temperature   → 25.3
/sensor/current/humidity      → 71.0
/sensor/current/ip            → 192.168.1.33
/sensor/current/rssi          → -52
/sensor/current/timestamp     → 160
```

---

## 📦 Deploy Website

```bash
# Install Firebase CLI (first time only)
npm install -g firebase-tools

# Login
firebase login

# Go to project folder
cd C:\esp32-dashboard

# Initialize (first time only)
firebase init hosting

# Deploy
firebase deploy
```

### Update Workflow
Every time you make changes:
1. Edit your file and save with `Ctrl + S`
2. Run `firebase deploy`
3. Hard refresh browser with `Ctrl + Shift + R`

---

## 🛠️ Troubleshooting

| Problem | Solution |
|---------|----------|
| `FirebaseESP32.h: No such file` | Install Firebase ESP32 Client library by Mobizt |
| Serial Monitor shows only dots | Wrong WiFi credentials or connected to 5GHz network |
| Website shows `--` for all values | Set Firebase Database Rules to `true` |
| CSS changes not showing | Press `Ctrl+Shift+R` to hard refresh |
| DHT11 read failed | Check wiring — DATA must be on GPIO 4 |

---

## 🛠️ Built With

- [ESP32](https://www.espressif.com/) - Microcontroller
- [DHT11](https://www.adafruit.com/) - Temperature & Humidity Sensor
- [Firebase](https://firebase.google.com/) - Realtime Database + Hosting
- [Chart.js](https://www.chartjs.org/) - Live charts
- [Orbitron & Rajdhani](https://fonts.google.com/) - Google Fonts