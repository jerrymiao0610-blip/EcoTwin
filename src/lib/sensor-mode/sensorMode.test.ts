import { describe, expect, it } from "vitest";
import { DEFAULT_CLASSROOM_CONFIG, simulateClassroomEnergy } from "../simulation";
import type { EdgeNodeTelemetry } from "../hardware/types";
import {
  buildSensorEnvironmentalSnapshot,
  canActivateSensorMode,
  getActiveSensorModeHealth,
  MISSING_OUTDOOR_HUMIDITY_WARNING,
  PRESSURE_FALLBACK_WARNING,
  shouldRecomputeSensorEstimate,
} from ".";

const telemetry: EdgeNodeTelemetry = {
  type: "ecotwin-edge",
  source: "arduino-usb-serial",
  temperatureC: 25.8,
  humidityPercent: 44,
  receivedAtMs: Date.parse("2026-09-01T04:00:00.000Z"),
};

describe("sensor-informed mode boundaries", () => {
  it("cannot activate without connected, fresh telemetry", () => {
    expect(canActivateSensorMode("connected", "live", telemetry)).toBe(true);
    expect(canActivateSensorMode("connected", "stale", telemetry)).toBe(false);
    expect(canActivateSensorMode("disconnected", "live", telemetry)).toBe(false);
    expect(canActivateSensorMode("connected", "live", null)).toBe(false);
  });

  it("keeps indoor sensor temperature separate from outdoor context", () => {
    const { snapshot } = buildSensorEnvironmentalSnapshot({
      config: DEFAULT_CLASSROOM_CONFIG,
      telemetry,
      weatherContext: {
        location: { name: "Shanghai", latitude: 31.2, longitude: 121.5 },
        temperature: 32,
        relativeHumidityPercent: 70,
        pressureKPa: 100.8,
        source: "open-meteo",
        timestamp: "2026-09-01T04:00:00.000Z",
        warnings: [],
      },
      manualOutdoorRelativeHumidityPercent: null,
    });

    expect(snapshot.indoorObservation.temperatureC).toBe(25.8);
    expect(snapshot.outdoorObservation.temperatureC).toBe(32);
    expect(snapshot.targets.temperatureC).toBe(24);
    expect(snapshot.targets.relativeHumidityPercent).toBe(50);
  });

  it("requires explicit outdoor RH and warns when pressure falls back", () => {
    expect(() => buildSensorEnvironmentalSnapshot({
      config: DEFAULT_CLASSROOM_CONFIG,
      telemetry,
      weatherContext: null,
      manualOutdoorRelativeHumidityPercent: null,
    })).toThrow(MISSING_OUTDOOR_HUMIDITY_WARNING);

    const result = buildSensorEnvironmentalSnapshot({
      config: DEFAULT_CLASSROOM_CONFIG,
      telemetry,
      weatherContext: null,
      manualOutdoorRelativeHumidityPercent: 55,
      now: () => new Date("2026-09-01T04:00:00.000Z"),
    });
    expect(result.snapshot.outdoorObservation.source).toBe("manual");
    expect(result.snapshot.outdoorObservation.pressureKPa).toBe(101.325);
    expect(result.warnings).toEqual([PRESSURE_FALLBACK_WARNING]);
  });

  it("uses a provenance-consistent manual observation when only manual RH exists", () => {
    const result = buildSensorEnvironmentalSnapshot({
      config: DEFAULT_CLASSROOM_CONFIG,
      telemetry,
      weatherContext: {
        location: { name: "Shanghai", latitude: 31.2, longitude: 121.5 },
        temperature: 29,
        pressureKPa: 100.8,
        source: "open-meteo",
        timestamp: "2026-09-01T04:00:00.000Z",
        warnings: [],
      },
      manualOutdoorRelativeHumidityPercent: 55,
      now: () => new Date("2026-09-01T04:01:00.000Z"),
    });

    expect(result.snapshot.outdoorObservation).toMatchObject({
      temperatureC: DEFAULT_CLASSROOM_CONFIG.outsideTemperatureC,
      relativeHumidityPercent: 55,
      pressureKPa: 101.325,
      source: "manual",
      timestamp: "2026-09-01T04:01:00.000Z",
    });
    expect(result.warnings).toEqual([PRESSURE_FALLBACK_WARNING]);
  });

  it("does not mutate ClassroomConfig or pass humidity into the legacy engine", () => {
    const config = Object.freeze({ ...DEFAULT_CLASSROOM_CONFIG });
    const before = simulateClassroomEnergy(config);
    buildSensorEnvironmentalSnapshot({
      config,
      telemetry,
      weatherContext: null,
      manualOutdoorRelativeHumidityPercent: 55,
    });
    const after = simulateClassroomEnergy(config);

    expect(config).toEqual(DEFAULT_CLASSROOM_CONFIG);
    expect(after).toEqual(before);
    expect("humidityPercent" in config).toBe(false);
  });

  it("throttles to five seconds and ignores tiny jitter", () => {
    expect(shouldRecomputeSensorEstimate(null, telemetry, null, 1_000)).toBe(true);
    expect(shouldRecomputeSensorEstimate(telemetry, {
      ...telemetry,
      temperatureC: 26.2,
      receivedAtMs: telemetry.receivedAtMs + 1_000,
    }, 1_000, 5_999)).toBe(false);
    expect(shouldRecomputeSensorEstimate(telemetry, {
      ...telemetry,
      temperatureC: 25.99,
      humidityPercent: 44.9,
    }, 1_000, 6_000)).toBe(false);
    expect(shouldRecomputeSensorEstimate(telemetry, {
      ...telemetry,
      humidityPercent: 45,
    }, 1_000, 6_000)).toBe(true);
  });

  it("keeps stale estimates but falls back on disconnect/error", () => {
    expect(getActiveSensorModeHealth("connected", "stale")).toBe("stale");
    expect(getActiveSensorModeHealth("connected", "no-recent-data")).toBe("stale");
    expect(getActiveSensorModeHealth("disconnected", "live")).toBe("fallback-to-manual");
    expect(getActiveSensorModeHealth("error", "live")).toBe("fallback-to-manual");
  });
});
