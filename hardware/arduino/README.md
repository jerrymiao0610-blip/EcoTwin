# EcoTwin Edge Node · final Arduino workflow

This folder contains the upload-ready Arduino UNO-class firmware for the
EcoTwin Edge Node. It reads indoor temperature and humidity from a DHT sensor,
shows the observed values on a 128x64 I2C OLED, and emits the same values over
USB Serial for EcoTwin's browser-local Web Serial connection.

The browser reads telemetry locally and does not upload it to a cloud telemetry
service. Indoor temperature and humidity remain separate from the legacy
`ClassroomConfig` simulation; they contribute only after the user explicitly
activates the sensor-informed modeled estimate.

## Hardware and libraries

- Board: **Arduino UNO** / ATmega328P-compatible board
- Sensor: **DHT11** by default
- Sensor data pin: digital pin **7** (confirmed by hardware probe)
- OLED: 128x64 SSD1306 over I2C
- OLED address: **`0x3C`** on the confirmed prototype; firmware checks `0x3C`
  first and retains `0x3D` as a compatibility fallback
- USB Serial: **115200 baud**

Install these libraries from Arduino IDE's Library Manager:

1. **DHT sensor library** by Adafruit
2. **Adafruit Unified Sensor** by Adafruit (DHT dependency)
3. **Adafruit SSD1306** by Adafruit
4. **Adafruit GFX Library** by Adafruit

`Wire` is included with the Arduino AVR board package.

The EcoTwin prototype was probed successfully as a DHT11 on digital pin 7. The
hardware-specific line remains isolated near the top of `ecotwin_edge_node.ino`:

```cpp
#define DHT_PIN 7
```

If the sensor is later replaced by a DHT22/AM2302, change only:

```cpp
#define DHT_TYPE DHT22
```

## Upload

1. Open `ecotwin_edge_node/ecotwin_edge_node.ino` in Arduino IDE.
2. Install the four libraries listed above.
3. Select **Tools → Board → Arduino AVR Boards → Arduino Uno**.
4. Select the Arduino USB port under **Tools → Port**.
5. Verify the sensor pin and type constants.
6. Click **Verify**, then **Upload**.

The OLED should show `ECOTWIN NODE`, temperature, humidity, sensor health, and
`USB LINK READY`. OLED operation does not depend on a browser connection. The
sketch probes only `0x3C` and `0x3D` once during startup; it does not run a
continuous I2C scan.

## Verify serial telemetry

1. Open Arduino IDE's Serial Monitor.
2. Set it to **115200 baud**.
3. Confirm approximately one newline-delimited JSON object per second:

```json
{"type":"ecotwin-edge","temperatureC":29.8,"humidityPercent":68.0}
```

Production telemetry contains no debug text. Temperature and humidity use the
same last valid sensor values on both the OLED and USB Serial, with one decimal
place.

## Connect EcoTwin

1. Close Arduino Serial Monitor. A serial port can normally be owned by only
   one application at a time.
2. Open EcoTwin in desktop Chrome or Edge.
3. Click **Connect Edge Node** and choose the Arduino USB port.
4. Confirm `CONNECTED` / `LIVE`, source `Arduino · USB Serial`, and values that
   match the OLED (allowing normal one-second timing differences).
5. Click **Disconnect** before reopening Serial Monitor.

If USB is unplugged, EcoTwin releases the reader and reports an error without
affecting the simulation. Reconnect the cable and click **Connect Edge Node**
again; a page refresh is not required.

## Sensor failure behavior

The DHT is sampled with non-blocking `millis()` timing. If a read fails, the
OLED retains the last valid values when available and visibly reports
`SENSOR ERROR`; when no valid value has ever arrived it reports `NO DATA`.
Invalid/NaN readings are never serialized. The sketch keeps retrying and
automatically resumes JSON telemetry after the sensor recovers, without a
reboot loop or multi-second blocking delay.
