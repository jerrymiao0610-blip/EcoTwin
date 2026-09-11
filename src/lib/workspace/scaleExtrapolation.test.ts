import { describe, expect, it } from "vitest";
import type { ImpactChange } from "../impact/types";
import {
  MAX_SCALE_ROOMS,
  MIN_SCALE_ROOMS,
  TREE_CO2_KG_PER_YEAR,
  type ScaleImpactSource,
  extrapolateScale,
} from "./scaleExtrapolation";

function change(baseline: number, candidate: number): ImpactChange {
  const difference = candidate - baseline;
  return {
    baseline,
    candidate,
    difference,
    percentageChange: baseline === 0 ? null : (difference / baseline) * 100,
    direction:
      difference < 0
        ? "improvement"
        : difference > 0
          ? "degradation"
          : "neutral",
  };
}

function savedImpact(): ScaleImpactSource {
  return {
    energyKWh: change(38.8, 29.4),
    co2Kg: change(17.5, 13.2),
    cost: change(5.82, 4.41),
  };
}

describe("extrapolateScale", () => {
  it("scales the signed annual delta linearly by the number of spaces", () => {
    const result = extrapolateScale(savedImpact(), 10);
    expect(result.rooms).toBe(10);
    expect(result.annualEnergyKWhDelta).toBeCloseTo((29.4 - 38.8) * 10, 6);
    expect(result.annualCO2KgDelta).toBeCloseTo((13.2 - 17.5) * 10, 6);
    expect(result.annualCostDelta).toBeCloseTo((4.41 - 5.82) * 10, 6);
    expect(result.hasAvoidedCO2).toBe(true);
  });

  it("clamps the room count to the supported range", () => {
    expect(extrapolateScale(savedImpact(), 0).rooms).toBe(MIN_SCALE_ROOMS);
    expect(extrapolateScale(savedImpact(), 99_999).rooms).toBe(MAX_SCALE_ROOMS);
    expect(extrapolateScale(savedImpact(), Number.NaN).rooms).toBe(
      MIN_SCALE_ROOMS,
    );
  });

  it("reports a positive delta and no tree equivalent when energy is added", () => {
    const added: ScaleImpactSource = {
      energyKWh: change(29.4, 38.8),
      co2Kg: change(13.2, 17.5),
      cost: change(4.41, 5.82),
    };
    const result = extrapolateScale(added, 10);
    expect(result.annualEnergyKWhDelta).toBeCloseTo((38.8 - 29.4) * 10, 6);
    expect(result.hasAvoidedCO2).toBe(false);
    expect(result.treeEquivalent).toBe(0);
  });

  it("derives tree equivalent only from avoided CO₂", () => {
    const result = extrapolateScale(savedImpact(), 1);
    expect(result.treeEquivalent).toBeCloseTo(
      Math.max(0, -result.annualCO2KgDelta) / TREE_CO2_KG_PER_YEAR,
      6,
    );
  });
});
