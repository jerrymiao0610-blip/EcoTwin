import { describe, expect, it } from "vitest";
import { runDecisionPipeline } from "../decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import {
  createEdgeNodeTelemetry,
  formatEdgeNodeUpdated,
  getEdgeNodeFreshness,
} from "./telemetry";

describe("EcoTwin Edge Node observed context", () => {
  it("uses browser receipt time and updates repeated readings", () => {
    const reading = { temperatureC: 29.8, humidityPercent: 68 };
    const first = createEdgeNodeTelemetry(reading, 1_000);
    const repeated = createEdgeNodeTelemetry(reading, 2_000);

    expect(first.receivedAtMs).toBe(1_000);
    expect(repeated.receivedAtMs).toBe(2_000);
    expect(repeated).not.toBe(first);
    expect(Object.isFrozen(repeated)).toBe(true);
  });

  it.each([
    [4_999, "live"],
    [5_000, "stale"],
    [15_000, "stale"],
    [15_001, "no-recent-data"],
  ] as const)("classifies an age of %i ms as %s", (ageMs, expected) => {
    expect(getEdgeNodeFreshness(10_000, 10_000 + ageMs)).toBe(expected);
  });

  it("formats browser-relative update age", () => {
    expect(formatEdgeNodeUpdated(10_000, 11_000)).toBe("just now");
    expect(formatEdgeNodeUpdated(10_000, 17_900)).toBe("7 seconds ago");
  });

  it("does not mutate ClassroomConfig or change pipeline results", () => {
    const config = { ...DEFAULT_CLASSROOM_CONFIG };
    const beforeConfig = { ...config };
    const referenceOutdoorTemperature = config.outsideTemperatureC;
    const beforeDecision = runDecisionPipeline(config);

    createEdgeNodeTelemetry(
      { temperatureC: 29.8, humidityPercent: 68 },
      1_000,
    );

    expect(config).toEqual(beforeConfig);
    expect(config.outsideTemperatureC).toBe(referenceOutdoorTemperature);
    expect(runDecisionPipeline(config)).toEqual(beforeDecision);
  });
});
