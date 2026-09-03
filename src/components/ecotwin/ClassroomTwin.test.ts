import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_CLASSROOM_CONFIG, simulateClassroomEnergy } from "../../lib/simulation";
import { ClassroomTwin, twinHvacPresentationState } from "./ClassroomTwin";

describe("ClassroomTwin operating semantics", () => {
  it("shows an enabled HVAC as idle with no active load outside operating hours", () => {
    expect(twinHvacPresentationState(
      { hvacEnabled: true, operatingHoursPerDay: 0 },
      { hvacMode: "cooling" },
    )).toEqual({ state: "idle", drawingLoad: false });
  });

  it("retains normal active and disabled states during operating hours", () => {
    expect(twinHvacPresentationState(
      { hvacEnabled: true, operatingHoursPerDay: 8 },
      { hvacMode: "heating" },
    )).toEqual({ state: "heating", drawingLoad: true });
    expect(twinHvacPresentationState(
      { hvacEnabled: false, operatingHoursPerDay: 8 },
      { hvacMode: "off" },
    )).toEqual({ state: "off", drawingLoad: false });
  });

  it("keeps HVAC, lighting, occupancy, and modeled load bound to the supplied state", () => {
    const config = {
      ...DEFAULT_CLASSROOM_CONFIG,
      occupants: 18,
      lightingLevelPercent: 60,
    };
    const result = simulateClassroomEnergy(config);
    const html = renderToStaticMarkup(createElement(ClassroomTwin, { config, result }));

    expect(html).toContain(`hvac-${result.hvacMode}`);
    expect(html).toContain("--lighting-level:0.6");
    expect(html).toContain("18 people");
    expect(html).toContain(`${result.dailyEnergyKWh.toFixed(1)} kilowatt-hours per day`);
    expect(html.match(/desk occupied/g)).toHaveLength(6);
  });

  it("removes occupants without removing the spatial classroom", () => {
    const config = { ...DEFAULT_CLASSROOM_CONFIG, occupants: 0 };
    const result = simulateClassroomEnergy(config);
    const html = renderToStaticMarkup(createElement(ClassroomTwin, {
      config,
      result,
      scenarioTitle: "Empty classroom",
    }));

    expect(html).toContain("room-spatial-stage");
    expect(html).toContain("scenario-state");
    expect(html).toContain("Empty classroom");
    expect(html).not.toContain("desk occupied");
    expect(html.match(/class="desk "/g)).toHaveLength(12);
  });

  it("renders only supplied Edge Node telemetry in the crisp overlay", () => {
    const result = simulateClassroomEnergy(DEFAULT_CLASSROOM_CONFIG);
    const html = renderToStaticMarkup(createElement(ClassroomTwin, {
      config: DEFAULT_CLASSROOM_CONFIG,
      result,
      edgeNodeTelemetry: {
          type: "ecotwin-edge",
          source: "arduino-usb-serial",
          temperatureC: 24.8,
          humidityPercent: 69,
          receivedAtMs: 1_000,
      },
      edgeNodeConnectionStatus: "connected",
      edgeNodeFreshness: "live",
    }));

    expect(html).toContain("edge-node-sensor freshness-live");
    expect(html).toContain("edge-node-twin-telemetry freshness-live");
    expect(html).toContain("Measured temperature 24.8 degrees Celsius");
    expect(html).toContain("Measured humidity 69 percent relative humidity");
    expect(html).toContain("LIVE");
  });
});
