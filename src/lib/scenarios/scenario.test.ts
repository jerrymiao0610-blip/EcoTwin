import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLASSROOM_CONFIG,
  simulateClassroomEnergy,
  type ClassroomConfig,
} from "../simulation";
import {
  BUILT_IN_SCENARIO_IDS,
  HEATWAVE_TEMPERATURE_INCREASE_C,
  simulateScenario,
  simulateScenarios,
} from "./scenarios";

describe("scenario simulation", () => {
  it("never mutates the baseline configuration", () => {
    const baseline: ClassroomConfig = { ...DEFAULT_CLASSROOM_CONFIG };
    const snapshot = structuredClone(baseline);

    const results = simulateScenarios(baseline);

    expect(baseline).toEqual(snapshot);
    expect(results).toHaveLength(3);
    for (const result of results) {
      expect(result.baselineConfiguration).toEqual(snapshot);
      expect(result.baselineConfiguration).not.toBe(baseline);
      expect(result.scenarioConfiguration).not.toBe(baseline);
    }
  });

  it("models Heatwave Tomorrow by changing only outdoor temperature", () => {
    const result = simulateScenario(
      DEFAULT_CLASSROOM_CONFIG,
      "heatwave-tomorrow",
    );

    expect(result.scenarioConfiguration).toEqual({
      ...DEFAULT_CLASSROOM_CONFIG,
      outsideTemperatureC:
        DEFAULT_CLASSROOM_CONFIG.outsideTemperatureC +
        HEATWAVE_TEMPERATURE_INCREASE_C,
    });
    expect(result.changes).toEqual([
      expect.objectContaining({
        parameter: "outsideTemperatureC",
        before: 32,
        after: 37,
        delta: 5,
        unit: "°C",
      }),
    ]);
    expect(result.changes[0].explanation).toContain("heatwave");
  });

  it("models Empty Classroom by reducing occupancy to zero", () => {
    const result = simulateScenario(
      DEFAULT_CLASSROOM_CONFIG,
      "empty-classroom",
    );

    expect(result.scenarioConfiguration).toEqual({
      ...DEFAULT_CLASSROOM_CONFIG,
      occupants: 0,
    });
    expect(result.changes).toEqual([
      expect.objectContaining({
        parameter: "occupants",
        before: 30,
        after: 0,
        delta: -30,
        unit: "people",
      }),
    ]);
    expect(result.changes[0].explanation).toContain("empty classroom");
  });

  it("models Eco Mode using only the optimizer-recommended controls", () => {
    const result = simulateScenario(DEFAULT_CLASSROOM_CONFIG, "eco-mode");

    expect(result.scenarioConfiguration).toEqual({
      ...DEFAULT_CLASSROOM_CONFIG,
      thermostatTemperatureC: 26,
      lightingLevelPercent: 60,
      devicePowerW: 1_200,
    });
    expect(result.changes.map(({ parameter }) => parameter)).toEqual([
      "thermostatTemperatureC",
      "lightingLevelPercent",
      "devicePowerW",
    ]);
    expect(result.changes.every(({ explanation }) => explanation.length > 0)).toBe(
      true,
    );
  });

  it("returns directly comparable baseline and scenario results", () => {
    const results = simulateScenarios(DEFAULT_CLASSROOM_CONFIG);

    expect(results.map(({ scenario }) => scenario.id)).toEqual(
      BUILT_IN_SCENARIO_IDS,
    );
    for (const result of results) {
      expect(result.baselineSimulation).toEqual(results[0].baselineSimulation);
      expect(result.comparison.dailyEnergyKWhDelta).toBeCloseTo(
        result.scenarioSimulation.dailyEnergyKWh -
          result.baselineSimulation.dailyEnergyKWh,
      );
      expect(result.comparison.annualCostDelta).toBeCloseTo(
        result.scenarioSimulation.annualCost -
          result.baselineSimulation.annualCost,
      );
    }

    expect(results[0].comparison.dailyEnergyKWhDelta).toBeGreaterThan(0);
    expect(results[2].comparison.dailyEnergyKWhDelta).toBeLessThan(0);
  });

  it("uses the simulation engine as the source of truth for every result", () => {
    const results = simulateScenarios(DEFAULT_CLASSROOM_CONFIG);

    for (const result of results) {
      expect(result.baselineSimulation).toEqual(
        simulateClassroomEnergy(result.baselineConfiguration),
      );
      expect(result.scenarioSimulation).toEqual(
        simulateClassroomEnergy(result.scenarioConfiguration),
      );
    }
  });

  it("is deterministic for individual and batched simulation", () => {
    expect(simulateScenarios(DEFAULT_CLASSROOM_CONFIG)).toEqual(
      simulateScenarios(DEFAULT_CLASSROOM_CONFIG),
    );
    expect(
      simulateScenario(DEFAULT_CLASSROOM_CONFIG, "heatwave-tomorrow"),
    ).toEqual(
      simulateScenario(DEFAULT_CLASSROOM_CONFIG, "heatwave-tomorrow"),
    );
  });
});
