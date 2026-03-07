// ================================================================
// ESP32 + DHT11 → Firebase Realtime Database
// Add this code to your existing Arduino sketch.
//
// Required Libraries (install via Arduino Library Manager):
//   1. Firebase ESP32 Client  →  by Mobizt
//   2. DHT sensor library     →  by Adafruit
//   3. Adafruit Unified Sensor →  by Adafruit
// ================================================================

#include <WiFi.h>
#include <FirebaseESP32.h>        // Firebase ESP32 Client by Mobizt
#include <DHT.h>

// ----------------------------------------------------------------
// 🔧 CONFIGURE THESE — your own values
// ----------------------------------------------------------------
#define WIFI_SSID        "REBEMAE GWAPA"       // ← fill in your WiFi name
#define WIFI_PASSWORD    "FHE LUMIGUID"   // ← fill in your WiFi password

// Firebase credentials — taken from your Firebase Project Settings
#define FIREBASE_HOST    "esp32-weather-station-91608-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH    "AIzaSyDaCwd669Af_0UBOfdmy_fmstROGkTs4"  // Web API Key

// DHT11 pin — change if yours is different
#define DHTPIN  4
#define DHTTYPE DHT11

// How often to push data (milliseconds)
#define UPDATE_INTERVAL 3000
// ----------------------------------------------------------------

DHT dht(DHTPIN, DHTTYPE);
FirebaseData   fbData;
FirebaseAuth   fbAuth;
FirebaseConfig fbConfig;

unsigned long lastUpdate = 0;

void setup() {
  Serial.begin(115200);
  dht.begin();

  // --- Connect to WiFi ---
  Serial.print("Connecting to WiFi");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected! IP: " + WiFi.localIP().toString());

  // --- Connect to Firebase ---
  fbConfig.host = FIREBASE_HOST;
  fbConfig.signer.tokens.legacy_token = FIREBASE_AUTH;
  Firebase.begin(&fbConfig, &fbAuth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase connected!");
}

void loop() {
  if (millis() - lastUpdate >= UPDATE_INTERVAL) {
    lastUpdate = millis();

    // Read sensor
    float temperature = dht.readTemperature();   // Celsius
    float humidity    = dht.readHumidity();

    // Check for failed reads
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("⚠️  DHT11 read failed — check wiring!");
      return;
    }

    Serial.printf("Temp: %.1f°C  Humidity: %.1f%%\n", temperature, humidity);

    // ── Push to Firebase at /sensor/current ──────────────────────
    // These paths MUST match what index.html listens to.
    Firebase.setFloat(fbData, "/sensor/current/temperature", temperature);
    Firebase.setFloat(fbData, "/sensor/current/humidity",    humidity);
    Firebase.setInt  (fbData, "/sensor/current/timestamp",   (int)(millis() / 1000));

    // Optional extras — shown in Device Info panel on the website
    Firebase.setString(fbData, "/sensor/current/ip",   WiFi.localIP().toString());
    Firebase.setInt   (fbData, "/sensor/current/rssi", WiFi.RSSI());

    // Log result
    if (fbData.httpCode() == 200) {
      Serial.println("✅ Firebase updated OK");
    } else {
      Serial.println("❌ Firebase error: " + fbData.errorReason());
    }
  }
}
