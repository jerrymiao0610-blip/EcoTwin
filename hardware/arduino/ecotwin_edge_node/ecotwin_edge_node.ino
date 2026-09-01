/*
  EcoTwin Edge Node

  Reads an indoor DHT temperature/humidity sensor, presents the same observed
  values on a 128x64 I2C OLED, and emits browser-local newline-delimited JSON
  over USB Serial. The browser connection is optional: sensing and the OLED
  continue to run when no Web Serial client is connected.
*/

#include <Wire.h>
#include <DHT.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Confirmed EcoTwin prototype wiring: DHT11 data is connected to digital D7.
// Change DHT_TYPE to DHT22 only if the physical sensor is replaced.
#define DHT_PIN 7
#define DHT_TYPE DHT11

constexpr uint8_t OLED_ADDRESS_PRIMARY = 0x3C;
constexpr uint8_t OLED_ADDRESS_SECONDARY = 0x3D;
constexpr uint8_t SCREEN_WIDTH = 128;
constexpr uint8_t SCREEN_HEIGHT = 64;
constexpr unsigned long SENSOR_INTERVAL_MS = 2000;
constexpr unsigned long TELEMETRY_INTERVAL_MS = 1000;

DHT dht(DHT_PIN, DHT_TYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

bool displayReady = false;
bool sensorReadAttempted = false;
bool currentSensorReadValid = false;
bool hasLastValidReading = false;
float lastTemperatureC = 0.0F;
float lastHumidityPercent = 0.0F;
unsigned long lastSensorReadAt = 0;
unsigned long lastTelemetryAt = 0;

bool isSupportedPhysicalReading(float temperatureC, float humidityPercent) {
  return isfinite(temperatureC) &&
         isfinite(humidityPercent) &&
         temperatureC >= -50.0F &&
         temperatureC <= 100.0F &&
         humidityPercent >= 0.0F &&
         humidityPercent <= 100.0F;
}

bool i2cDeviceResponds(uint8_t address) {
  Wire.beginTransmission(address);
  return Wire.endTransmission() == 0;
}

void initializeDisplay() {
  Wire.begin();

  uint8_t address = 0;
  if (i2cDeviceResponds(OLED_ADDRESS_PRIMARY)) {
    address = OLED_ADDRESS_PRIMARY;
  } else if (i2cDeviceResponds(OLED_ADDRESS_SECONDARY)) {
    address = OLED_ADDRESS_SECONDARY;
  }

  if (address == 0) return;
  displayReady = display.begin(SSD1306_SWITCHCAPVCC, address);
  if (!displayReady) return;

  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextWrap(false);
  display.display();
}

void readSensor() {
  sensorReadAttempted = true;

  const float humidityPercent = dht.readHumidity();
  const float temperatureC = dht.readTemperature();
  currentSensorReadValid = isSupportedPhysicalReading(
    temperatureC,
    humidityPercent
  );

  if (!currentSensorReadValid) return;
  lastTemperatureC = temperatureC;
  lastHumidityPercent = humidityPercent;
  hasLastValidReading = true;
}

void printDisplayValue(float value) {
  display.print(value, 1);
}

void updateDisplay() {
  if (!displayReady) return;

  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(F("ECOTWIN NODE"));
  display.drawLine(0, 9, SCREEN_WIDTH - 1, 9, SSD1306_WHITE);

  display.setCursor(0, 13);
  display.print(F("TEMP C"));
  display.setCursor(68, 13);
  display.print(F("HUMID %"));

  display.setTextSize(2);
  display.setCursor(0, 23);
  if (hasLastValidReading) {
    printDisplayValue(lastTemperatureC);
  } else {
    display.print(F("--"));
  }

  display.setCursor(68, 23);
  if (hasLastValidReading) {
    printDisplayValue(lastHumidityPercent);
  } else {
    display.print(F("--"));
  }

  display.setTextSize(1);
  display.setCursor(0, 44);
  if (currentSensorReadValid) {
    display.print(F("SENSOR OK"));
  } else if (hasLastValidReading) {
    display.print(F("SENSOR ERROR - LAST VALUE"));
  } else {
    display.print(F("SENSOR ERROR - NO DATA"));
  }

  display.setCursor(0, 55);
  display.print(F("USB LINK  READY"));
  display.display();
}

void emitTelemetry() {
  if (!currentSensorReadValid || !hasLastValidReading) return;

  Serial.print(F("{\"type\":\"ecotwin-edge\",\"temperatureC\":"));
  Serial.print(lastTemperatureC, 1);
  Serial.print(F(",\"humidityPercent\":"));
  Serial.print(lastHumidityPercent, 1);
  Serial.println(F("}"));
}

void setup() {
  Serial.begin(115200);
  dht.begin();
  initializeDisplay();
  updateDisplay();
  lastTelemetryAt = millis();
}

void loop() {
  const unsigned long now = millis();

  if (!sensorReadAttempted || now - lastSensorReadAt >= SENSOR_INTERVAL_MS) {
    lastSensorReadAt = now;
    readSensor();
    updateDisplay();
  }

  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;
    emitTelemetry();
  }
}
