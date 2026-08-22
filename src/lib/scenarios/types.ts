import type { ClassroomConfig, SimulationResult } from "../simulation";

export type BuiltInScenarioId =
  | "heatwave-tomorrow"
  | "empty-classroom"
  | "eco-mode";

export type ScenarioParameter =
  | "outsideTemperatureC"
  | "occupants"
  | "thermostatTemperatureC"
  | "lightingLevelPercent"
  | "devicePowerW";

export interface ScenarioDefinition {
  id: BuiltInScenarioId;
  name: string;
  description: string;
}

export interface ScenarioChange {
  parameter: ScenarioParameter;
  before: number;
  after: number;
  delta: number;
  unit: "°C" | "people" | "%" | "W";
  explanation: string;
}

/** Signed values: positive means the scenario is higher than the baseline. */
export interface ScenarioComparison {
  dailyEnergyKWhDelta: number;
  monthlyEnergyKWhDelta: number;
  annualEnergyKWhDelta: number;
  dailyEnergyPercentChange: number;
  dailyCO2KgDelta: number;
  monthlyCO2KgDelta: number;
  annualCO2KgDelta: number;
  dailyCostDelta: number;
  monthlyCostDelta: number;
  annualCostDelta: number;
  ecoScoreDelta: number;
}

export interface ScenarioResult {
  scenario: ScenarioDefinition;
  baselineConfiguration: ClassroomConfig;
  scenarioConfiguration: ClassroomConfig;
  baselineSimulation: SimulationResult;
  scenarioSimulation: SimulationResult;
  changes: ScenarioChange[];
  comparison: ScenarioComparison;
}
