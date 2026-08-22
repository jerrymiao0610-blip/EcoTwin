import {
  simulateClassroomEnergy,
  type ClassroomConfig,
  type SimulationResult,
} from "../simulation";
import {
  createOptimizerSearchSpace,
  DEFAULT_OPTIMIZER_CONSTRAINTS,
} from "./constraints";
import type {
  ControllableParameter,
  OptimizationResult,
  OptimizationSavings,
  OptimizerConstraints,
  ParameterChange,
} from "./types";

const ENERGY_COMPARISON_EPSILON = 1e-9;

interface Candidate {
  configuration: ClassroomConfig;
  simulation: SimulationResult;
}

function countChanges(
  baseline: ClassroomConfig,
  candidate: ClassroomConfig,
): number {
  return (
    Number(
      baseline.thermostatTemperatureC !==
        candidate.thermostatTemperatureC,
    ) +
    Number(baseline.lightingLevelPercent !== candidate.lightingLevelPercent) +
    Number(baseline.devicePowerW !== candidate.devicePowerW)
  );
}

function totalNormalizedChange(
  baseline: ClassroomConfig,
  candidate: ClassroomConfig,
  constraints: OptimizerConstraints,
): number {
  const deviceStep = Math.max(
    1,
    Math.max(0, baseline.occupants) *
      constraints.devicePowerW.stepPerOccupant,
  );

  return (
    Math.abs(
      baseline.thermostatTemperatureC -
        candidate.thermostatTemperatureC,
    ) /
      constraints.thermostatTemperatureC.step +
    Math.abs(baseline.lightingLevelPercent - candidate.lightingLevelPercent) /
      constraints.lightingLevelPercent.step +
    Math.abs(baseline.devicePowerW - candidate.devicePowerW) / deviceStep
  );
}

function isBetterCandidate(
  candidate: Candidate,
  best: Candidate | undefined,
  baseline: ClassroomConfig,
  constraints: OptimizerConstraints,
): boolean {
  if (!best) return true;

  const energyDifference =
    candidate.simulation.dailyEnergyKWh - best.simulation.dailyEnergyKWh;
  if (energyDifference < -ENERGY_COMPARISON_EPSILON) return true;
  if (energyDifference > ENERGY_COMPARISON_EPSILON) return false;

  const candidateChanges = countChanges(baseline, candidate.configuration);
  const bestChanges = countChanges(baseline, best.configuration);
  if (candidateChanges !== bestChanges) return candidateChanges < bestChanges;

  const candidateDistance = totalNormalizedChange(
    baseline,
    candidate.configuration,
    constraints,
  );
  const bestDistance = totalNormalizedChange(
    baseline,
    best.configuration,
    constraints,
  );
  if (candidateDistance !== bestDistance) {
    return candidateDistance < bestDistance;
  }

  const candidateValues = [
    candidate.configuration.thermostatTemperatureC,
    candidate.configuration.lightingLevelPercent,
    candidate.configuration.devicePowerW,
  ];
  const bestValues = [
    best.configuration.thermostatTemperatureC,
    best.configuration.lightingLevelPercent,
    best.configuration.devicePowerW,
  ];

  for (let index = 0; index < candidateValues.length; index += 1) {
    if (candidateValues[index] !== bestValues[index]) {
      return candidateValues[index] < bestValues[index];
    }
  }

  return false;
}

function difference(baseline: number, optimized: number): number {
  return baseline - optimized;
}

function calculateSavings(
  baseline: SimulationResult,
  optimized: SimulationResult,
): OptimizationSavings {
  return {
    dailyEnergyKWh: difference(
      baseline.dailyEnergyKWh,
      optimized.dailyEnergyKWh,
    ),
    monthlyEnergyKWh: difference(
      baseline.monthlyEnergyKWh,
      optimized.monthlyEnergyKWh,
    ),
    annualEnergyKWh: difference(
      baseline.annualEnergyKWh,
      optimized.annualEnergyKWh,
    ),
    energyPercent:
      baseline.dailyEnergyKWh > 0
        ? (difference(
            baseline.dailyEnergyKWh,
            optimized.dailyEnergyKWh,
          ) /
            baseline.dailyEnergyKWh) *
          100
        : 0,
    dailyCO2Kg: difference(baseline.dailyCO2Kg, optimized.dailyCO2Kg),
    monthlyCO2Kg: difference(
      baseline.monthlyCO2Kg,
      optimized.monthlyCO2Kg,
    ),
    annualCO2Kg: difference(
      baseline.annualCO2Kg,
      optimized.annualCO2Kg,
    ),
    dailyCost: difference(baseline.dailyCost, optimized.dailyCost),
    monthlyCost: difference(baseline.monthlyCost, optimized.monthlyCost),
    annualCost: difference(baseline.annualCost, optimized.annualCost),
  };
}

function getReason(
  parameter: ControllableParameter,
  before: number,
  after: number,
  baselineSimulation: SimulationResult,
): string {
  if (parameter === "thermostatTemperatureC") {
    if (after > before) {
      return "Raise the cooling setpoint to reduce modeled HVAC demand while staying within the comfort range.";
    }
    if (baselineSimulation.hvacMode === "heating") {
      return "Lower the heating setpoint to reduce modeled HVAC demand while staying within the comfort range.";
    }
    return "Adjust the thermostat toward thermal balance to reduce modeled HVAC demand.";
  }

  if (parameter === "lightingLevelPercent") {
    return "Dim lighting to the classroom usability floor to reduce lighting energy.";
  }

  return "Reduce the device power allowance while retaining the minimum per-occupant service level.";
}

function createChangedParameters(
  baseline: ClassroomConfig,
  optimized: ClassroomConfig,
  baselineSimulation: SimulationResult,
): ParameterChange[] {
  const definitions: Array<{
    parameter: ControllableParameter;
    unit: ParameterChange["unit"];
  }> = [
    { parameter: "thermostatTemperatureC", unit: "°C" },
    { parameter: "lightingLevelPercent", unit: "%" },
    { parameter: "devicePowerW", unit: "W" },
  ];

  return definitions.flatMap(({ parameter, unit }) => {
    const before = baseline[parameter];
    const after = optimized[parameter];
    if (before === after) return [];

    return [
      {
        parameter,
        before,
        after,
        delta: after - before,
        unit,
        reason: getReason(parameter, before, after, baselineSimulation),
      },
    ];
  });
}

/**
 * Finds the lowest modeled daily-energy configuration on a finite usability
 * grid. All objective values come directly from simulateClassroomEnergy().
 */
export function optimizeClassroomEnergy(
  config: ClassroomConfig,
  constraints: OptimizerConstraints = DEFAULT_OPTIMIZER_CONSTRAINTS,
): OptimizationResult {
  const baselineConfiguration = { ...config };
  const baselineSimulation = simulateClassroomEnergy(baselineConfiguration);
  const searchSpace = createOptimizerSearchSpace(
    baselineConfiguration,
    constraints,
  );
  let best: Candidate | undefined;

  for (const thermostatTemperatureC of searchSpace.thermostatTemperatureC) {
    for (const lightingLevelPercent of searchSpace.lightingLevelPercent) {
      for (const devicePowerW of searchSpace.devicePowerW) {
        const configuration: ClassroomConfig = {
          ...baselineConfiguration,
          thermostatTemperatureC,
          lightingLevelPercent,
          devicePowerW,
        };
        const candidate = {
          configuration,
          simulation: simulateClassroomEnergy(configuration),
        };

        if (isBetterCandidate(candidate, best, baselineConfiguration, constraints)) {
          best = candidate;
        }
      }
    }
  }

  // Every validated grid contains at least one value.
  if (!best) throw new Error("Optimizer search space is empty.");

  const changedParameters = createChangedParameters(
    baselineConfiguration,
    best.configuration,
    baselineSimulation,
  );
  const recommendations = changedParameters.length
    ? changedParameters.map(({ reason }) => reason)
    : [
        "No control changes are recommended; this configuration already minimizes modeled energy within the usability constraints.",
      ];

  return {
    baselineConfiguration,
    optimizedConfiguration: best.configuration,
    baselineSimulation,
    optimizedSimulation: best.simulation,
    changedParameters,
    savings: calculateSavings(baselineSimulation, best.simulation),
    recommendations,
    searchSpaceSize:
      searchSpace.thermostatTemperatureC.length *
      searchSpace.lightingLevelPercent.length *
      searchSpace.devicePowerW.length,
  };
}
