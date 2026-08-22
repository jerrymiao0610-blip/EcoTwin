import { optimizeClassroomEnergy } from "../optimizer/optimizer";
import {
  simulateClassroomEnergy,
  type ClassroomConfig,
  type SimulationResult,
} from "../simulation";
import type {
  BuiltInScenarioId,
  ScenarioChange,
  ScenarioComparison,
  ScenarioDefinition,
  ScenarioParameter,
  ScenarioResult,
} from "./types";

export const HEATWAVE_TEMPERATURE_INCREASE_C = 5;

export const BUILT_IN_SCENARIO_IDS: readonly BuiltInScenarioId[] = [
  "heatwave-tomorrow",
  "empty-classroom",
  "eco-mode",
];

export const BUILT_IN_SCENARIOS: Readonly<
  Record<BuiltInScenarioId, ScenarioDefinition>
> = {
  "heatwave-tomorrow": {
    id: "heatwave-tomorrow",
    name: "Heatwave Tomorrow",
    description:
      "Models tomorrow with a 5 °C higher outdoor temperature and all classroom controls unchanged.",
  },
  "empty-classroom": {
    id: "empty-classroom",
    name: "Empty Classroom",
    description:
      "Models an unoccupied classroom while retaining the existing system settings.",
  },
  "eco-mode": {
    id: "eco-mode",
    name: "Eco Mode",
    description:
      "Models the constrained configuration recommended by the EcoTwin optimizer.",
  },
};

interface ScenarioPatch {
  configuration: Partial<
    Pick<
      ClassroomConfig,
      | "outsideTemperatureC"
      | "occupants"
      | "thermostatTemperatureC"
      | "lightingLevelPercent"
      | "devicePowerW"
    >
  >;
  explanations: Partial<Record<ScenarioParameter, string>>;
}

const CHANGE_UNITS: Record<ScenarioParameter, ScenarioChange["unit"]> = {
  outsideTemperatureC: "°C",
  occupants: "people",
  thermostatTemperatureC: "°C",
  lightingLevelPercent: "%",
  devicePowerW: "W",
};

const SCENARIO_PARAMETER_ORDER: readonly ScenarioParameter[] = [
  "outsideTemperatureC",
  "occupants",
  "thermostatTemperatureC",
  "lightingLevelPercent",
  "devicePowerW",
];

function createScenarioPatch(
  baseline: ClassroomConfig,
  scenarioId: BuiltInScenarioId,
): ScenarioPatch {
  if (scenarioId === "heatwave-tomorrow") {
    return {
      configuration: {
        outsideTemperatureC:
          baseline.outsideTemperatureC + HEATWAVE_TEMPERATURE_INCREASE_C,
      },
      explanations: {
        outsideTemperatureC:
          "Increase the outdoor temperature by 5 °C to model a near-term heatwave.",
      },
    };
  }

  if (scenarioId === "empty-classroom") {
    return {
      configuration: { occupants: 0 },
      explanations: {
        occupants:
          "Remove occupants to model an empty classroom without assuming that equipment has been switched off.",
      },
    };
  }

  const optimization = optimizeClassroomEnergy(baseline);
  const explanations = Object.fromEntries(
    optimization.changedParameters.map(({ parameter, reason }) => [
      parameter,
      reason,
    ]),
  ) as Partial<Record<ScenarioParameter, string>>;

  return {
    configuration: {
      thermostatTemperatureC:
        optimization.optimizedConfiguration.thermostatTemperatureC,
      lightingLevelPercent:
        optimization.optimizedConfiguration.lightingLevelPercent,
      devicePowerW: optimization.optimizedConfiguration.devicePowerW,
    },
    explanations,
  };
}

function createChanges(
  baseline: ClassroomConfig,
  scenario: ClassroomConfig,
  patch: ScenarioPatch,
): ScenarioChange[] {
  return SCENARIO_PARAMETER_ORDER.flatMap((parameter) => {
    if (!(parameter in patch.configuration)) return [];

    const before = baseline[parameter];
    const after = scenario[parameter];
    if (before === after) return [];

    return [
      {
        parameter,
        before,
        after,
        delta: after - before,
        unit: CHANGE_UNITS[parameter],
        explanation:
          patch.explanations[parameter] ??
          `Change ${parameter} from ${before} to ${after}.`,
      },
    ];
  });
}

function delta(baseline: number, scenario: number): number {
  return scenario - baseline;
}

function compareSimulations(
  baseline: SimulationResult,
  scenario: SimulationResult,
): ScenarioComparison {
  return {
    dailyEnergyKWhDelta: delta(
      baseline.dailyEnergyKWh,
      scenario.dailyEnergyKWh,
    ),
    monthlyEnergyKWhDelta: delta(
      baseline.monthlyEnergyKWh,
      scenario.monthlyEnergyKWh,
    ),
    annualEnergyKWhDelta: delta(
      baseline.annualEnergyKWh,
      scenario.annualEnergyKWh,
    ),
    dailyEnergyPercentChange:
      baseline.dailyEnergyKWh > 0
        ? (delta(baseline.dailyEnergyKWh, scenario.dailyEnergyKWh) /
            baseline.dailyEnergyKWh) *
          100
        : 0,
    dailyCO2KgDelta: delta(baseline.dailyCO2Kg, scenario.dailyCO2Kg),
    monthlyCO2KgDelta: delta(
      baseline.monthlyCO2Kg,
      scenario.monthlyCO2Kg,
    ),
    annualCO2KgDelta: delta(
      baseline.annualCO2Kg,
      scenario.annualCO2Kg,
    ),
    dailyCostDelta: delta(baseline.dailyCost, scenario.dailyCost),
    monthlyCostDelta: delta(baseline.monthlyCost, scenario.monthlyCost),
    annualCostDelta: delta(baseline.annualCost, scenario.annualCost),
    ecoScoreDelta: delta(baseline.ecoScore, scenario.ecoScore),
  };
}

/** Simulates one built-in future without mutating the supplied baseline. */
export function simulateScenario(
  baseline: Readonly<ClassroomConfig>,
  scenarioId: BuiltInScenarioId,
): ScenarioResult {
  const baselineConfiguration: ClassroomConfig = { ...baseline };
  const patch = createScenarioPatch(baselineConfiguration, scenarioId);
  const scenarioConfiguration: ClassroomConfig = {
    ...baselineConfiguration,
    ...patch.configuration,
  };
  const baselineSimulation = simulateClassroomEnergy(baselineConfiguration);
  const scenarioSimulation = simulateClassroomEnergy(scenarioConfiguration);

  return {
    scenario: { ...BUILT_IN_SCENARIOS[scenarioId] },
    baselineConfiguration,
    scenarioConfiguration,
    baselineSimulation,
    scenarioSimulation,
    changes: createChanges(
      baselineConfiguration,
      scenarioConfiguration,
      patch,
    ),
    comparison: compareSimulations(baselineSimulation, scenarioSimulation),
  };
}

/** Simulates built-ins in caller order, or all built-ins in their stable order. */
export function simulateScenarios(
  baseline: Readonly<ClassroomConfig>,
  scenarioIds: readonly BuiltInScenarioId[] = BUILT_IN_SCENARIO_IDS,
): ScenarioResult[] {
  return scenarioIds.map((scenarioId) =>
    simulateScenario(baseline, scenarioId),
  );
}
