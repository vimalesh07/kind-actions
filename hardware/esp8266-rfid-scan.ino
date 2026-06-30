#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <MFRC522.h>
#include <SPI.h>

const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://10.209.143.16:5000/api/rfid/scan";

constexpr uint8_t SS_PIN = D8;
constexpr uint8_t RST_PIN = D3;

MFRC522 rfid(SS_PIN, RST_PIN);

String normalizeUid(const MFRC522::Uid& uid) {
  String value = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) value += "0";
    value += String(uid.uidByte[i], HEX);
  }
  value.toUpperCase();
  return value;
}

void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("Connected. ESP8266 IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
    delay(100);
    return;
  }

  const String uid = normalizeUid(rfid.uid);
  Serial.print("RFID UID: ");
  Serial.println(uid);

  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;
    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");

    const String body = "{\"rfid_uid\":\"" + uid + "\"}";
    const int statusCode = http.POST(body);
    Serial.print("Backend status: ");
    Serial.println(statusCode);
    Serial.println(http.getString());
    http.end();
  } else {
    Serial.println("WiFi disconnected.");
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  delay(1500);
}
