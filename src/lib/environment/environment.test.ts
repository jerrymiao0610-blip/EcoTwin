import { describe, expect, it } from "vitest";
import { createEnvironmentalSnapshot } from ".";

const input = {
  indoorObservation: {
    temperatureC: 25.8,
    relativeHumidityPercent: 44,
    timestamp: "2026-09-01T04:00:00.000Z",
    source: "edge-node" as const,
  },
  outdoorObservation: {
    temperatureC: 32,
    relativeHumidityPercent: 70,
    pressureKPa: 100.8,
    timestamp: "2026-09-01T04:00:00.000Z",
    source: "open-meteo" as const,
  },
  targets: { temperatureC: 24, relativeHumidityPercent: 50 },
};

describe("createEnvironmentalSnapshot", () => {
  it("preserves separate indoor, outdoor, target, and provenance values", () => {
    const snapshot = createEnvironmentalSnapshot(input);

    expect(snapshot.indoorObservation.temperatureC).toBe(25.8);
    expect(snapshot.outdoorObservation.temperatureC).toBe(32);
    expect(snapshot.indoorObservation.source).toBe("edge-node");
    expect(snapshot.outdoorObservation.source).toBe("open-meteo");
    expect(snapshot.targets.relativeHumidityPercent).toBe(50);
  });

  it("returns detached, recursively immutable records", () => {
    const snapshot = createEnvironmentalSnapshot(input);

    expect(snapshot).not.toBe(input);
    expect(snapshot.indoorObservation).not.toBe(input.indoorObservation);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.indoorObservation)).toBe(true);
    expect(Object.isFrozen(snapshot.outdoorObservation)).toBe(true);
    expect(Object.isFrozen(snapshot.targets)).toBe(true);
  });

  it("rejects invalid humidity and timestamps", () => {
    expect(() => createEnvironmentalSnapshot({
      ...input,
      indoorObservation: { ...input.indoorObservation, relativeHumidityPercent: 101 },
    })).toThrow("Indoor relative humidity must be from 0 to 100 percent.");
    expect(() => createEnvironmentalSnapshot({
      ...input,
      outdoorObservation: { ...input.outdoorObservation, timestamp: "invalid" },
    })).toThrow("Outdoor timestamp must be valid ISO 8601.");
  });
});
