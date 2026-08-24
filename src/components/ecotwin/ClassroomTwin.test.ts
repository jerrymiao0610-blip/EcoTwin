import { describe, expect, it } from "vitest";
import { twinHvacPresentationState } from "./ClassroomTwin";

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
});
