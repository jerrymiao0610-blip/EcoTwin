import { describe, expect, it } from "vitest";
import { optimizeClassroomEnergy } from "../optimizer/optimizer";
import { simulateScenario } from "../scenarios/scenarios";
import {
  DEFAULT_CLASSROOM_CONFIG,
  simulateClassroomEnergy,
  type ClassroomConfig,
} from "../simulation";
import { compareSimulationResults } from "./impact";

const simulate = (overrides: Partial<ClassroomConfig> = {}) =>
  simulateClassroomEnergy({ ...DEFAULT_CLASSROOM_CONFIG, ...overrides });

describe("compareSimulationResults", () => {
  it("reports energy, CO2, and cost savings as an improvement", () => {
    const baseline = simulate();
    const candidate = simulate({
      thermostatTemperatureC: 26,
      lightingLevelPercent: 60,
      devicePowerW: 1_200,
    });

    const report = compareSimulationResults(baseline, candidate);

    expect(report.direction).toBe("improvement");
    expect(report.energyKWh.daily.difference).toBeCloseTo(
      candidate.dailyEnergyKWh - baseline.dailyEnergyKWh,
    );
    expect(report.energyKWh.daily.percentageChange).toBeCloseTo(
      ((candidate.dailyEnergyKWh - baseline.dailyEnergyKWh) /
        baseline.dailyEnergyKWh) *
        100,
    );
    expect(report.co2Kg.annual.difference).toBeCloseTo(
      candidate.annualCO2Kg - baseline.annualCO2Kg,
    );
    expect(report.cost.monthly.difference).toBeCloseTo(
      candidate.monthlyCost - baseline.monthlyCost,
    );
    expect(report.energyKWh.daily.direction).toBe("improvement");
    expect(report.co2Kg.annual.direction).toBe("improvement");
    expect(report.cost.monthly.direction).toBe("improvement");
  });

  it("reports an energy increase as a degradation", () => {
    const baseline = simulate({
      thermostatTemperatureC: 26,
      lightingLevelPercent: 60,
      devicePowerW: 1_200,
    });
    const candidate = simulate();

    const report = compareSimulationResults(baseline, candidate);

    expect(report.direction).toBe("degradation");
    expect(report.energyKWh.daily.difference).toBeGreaterThan(0);
    expect(report.energyKWh.monthly.percentageChange).toBeGreaterThan(0);
    expect(report.co2Kg.daily.direction).toBe("degradation");
    expect(report.cost.annual.direction).toBe("degradation");
  });

  it("reports identical results as neutral", () => {
    const result = simulate();

    const report = compareSimulationResults(result, result);

    expect(report.direction).toBe("neutral");
    expect(report.energyKWh.daily).toMatchObject({
      difference: 0,
      percentageChange: 0,
      direction: "neutral",
    });
    expect(report.components.every(({ energyKWh }) => energyKWh.difference === 0)).toBe(
      true,
    );
    expect(report.majorContributors).toEqual([]);
  });

  it("compares and ranks component contributions using component outputs", () => {
    const baseline = simulate();
    const candidate = simulate({
      thermostatTemperatureC: 26,
      lightingLevelPercent: 70,
      devicePowerW: 1_500,
    });

    const report = compareSimulationResults(baseline, candidate);
    const hvac = report.components.find(({ component }) => component === "hvac");
    const lighting = report.components.find(
      ({ component }) => component === "lighting",
    );
    const devices = report.components.find(
      ({ component }) => component === "devices",
    );

    expect(hvac?.energyKWh.difference).toBeCloseTo(
      candidate.hvacEnergyKWh - baseline.hvacEnergyKWh,
    );
    expect(lighting?.energyKWh.difference).toBeCloseTo(
      candidate.lightingEnergyKWh - baseline.lightingEnergyKWh,
    );
    expect(devices?.energyKWh.difference).toBeCloseTo(
      candidate.deviceEnergyKWh - baseline.deviceEnergyKWh,
    );
    expect(
      report.components.reduce(
        (total, { contributionPercent }) => total + contributionPercent,
        0,
      ),
    ).toBeCloseTo(100);
    expect(report.majorContributors[0].component).toBe("hvac");
    expect(report.majorContributors[0].energyKWh.direction).toBe(
      "improvement",
    );
  });

  it("handles zero baselines without returning infinite percentages", () => {
    const zero = simulate({ operatingHoursPerDay: 0 });
    const nonZero = simulate({ operatingHoursPerDay: 1 });

    const unchanged = compareSimulationResults(zero, zero);
    const increase = compareSimulationResults(zero, nonZero);

    expect(unchanged.energyKWh.daily.percentageChange).toBe(0);
    expect(increase.energyKWh.daily.percentageChange).toBeNull();
    expect(increase.co2Kg.annual.percentageChange).toBeNull();
    expect(increase.cost.monthly.percentageChange).toBeNull();
    expect(increase.direction).toBe("degradation");
    expect(
      increase.components.every(
        ({ energyKWh }) =>
          energyKWh.percentageChange === null ||
          energyKWh.percentageChange === 0,
      ),
    ).toBe(true);
  });

  it("accepts optimizer and scenario simulation pairs directly", () => {
    const optimization = optimizeClassroomEnergy(DEFAULT_CLASSROOM_CONFIG);
    const scenario = simulateScenario(
      DEFAULT_CLASSROOM_CONFIG,
      "heatwave-tomorrow",
    );

    expect(
      compareSimulationResults(
        optimization.baselineSimulation,
        optimization.optimizedSimulation,
      ).direction,
    ).toBe("improvement");
    expect(
      compareSimulationResults(
        scenario.baselineSimulation,
        scenario.scenarioSimulation,
      ).direction,
    ).toBe("degradation");
  });
});
