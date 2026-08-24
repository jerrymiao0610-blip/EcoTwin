import { describe, expect, it } from "vitest";
import type { ImpactChange } from "@/lib/impact/types";
import {
  describeImpactChange,
  describePercentageChange,
  describeScenarioChange,
  directionLabel,
} from "./scenarioPresentation";

const impact = (
  difference: number,
  percentageChange: number | null,
  direction: ImpactChange["direction"],
): ImpactChange => ({
  baseline: 40,
  candidate: 40 + difference,
  difference,
  percentageChange,
  direction,
});

describe("scenario presentation", () => {
  it("presents degradation with positive additional magnitudes", () => {
    const change = impact(4.2, 10.8, "degradation");

    expect(describeImpactChange(change, "kWh/day")).toBe(
      "4.2 kWh/day additional",
    );
    expect(describePercentageChange(change)).toBe(
      "10.8% higher than current",
    );
  });

  it("presents improvement without negative consumption", () => {
    const change = impact(-7.5, -19.3, "improvement");

    expect(describeImpactChange(change, "kWh/day")).toBe(
      "7.5 kWh/day avoided",
    );
    expect(describePercentageChange(change)).toBe(
      "19.3% lower than current",
    );
    expect(describeImpactChange(change, "kWh/day")).not.toContain("-");
  });

  it("presents neutral and zero-baseline changes honestly", () => {
    expect(describeImpactChange(impact(0, 0, "neutral"), "kg")).toBe(
      "No modeled change",
    );
    expect(describePercentageChange(impact(2, null, "degradation"))).toBe(
      "Change from a zero baseline",
    );
  });

  it("formats source scenario changes and stable direction labels", () => {
    expect(describeScenarioChange({
      parameter: "outsideTemperatureC",
      before: 32,
      after: 37,
      delta: 5,
      unit: "°C",
      explanation: "Engine-owned scenario change.",
    })).toBe("32 °C → 37 °C");
    expect(directionLabel("improvement")).toBe("Lower impact");
    expect(directionLabel("degradation")).toBe("Higher impact");
    expect(directionLabel("neutral")).toBe("No modeled change");
  });
});
