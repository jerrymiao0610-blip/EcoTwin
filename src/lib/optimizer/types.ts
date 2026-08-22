import type { ClassroomConfig, SimulationResult } from "../simulation";

export type ControllableParameter =
  | "thermostatTemperatureC"
  | "lightingLevelPercent"
  | "devicePowerW";

export interface NumericGridConstraint {
  minimum: number;
  maximum: number;
  step: number;
}

export interface PerOccupantGridConstraint {
  minimumPerOccupant: number;
  maximumPerOccupant: number;
  stepPerOccupant: number;
}

/** Explicit classroom-service bounds used by the deterministic search. */
export interface OptimizerConstraints {
  thermostatTemperatureC: NumericGridConstraint;
  lightingLevelPercent: NumericGridConstraint;
  devicePowerW: PerOccupantGridConstraint;
}

export interface ParameterChange {
  parameter: ControllableParameter;
  before: number;
  after: number;
  delta: number;
  unit: "°C" | "%" | "W";
  reason: string;
}

export interface OptimizationSavings {
  dailyEnergyKWh: number;
  monthlyEnergyKWh: number;
  annualEnergyKWh: number;
  energyPercent: number;
  dailyCO2Kg: number;
  monthlyCO2Kg: number;
  annualCO2Kg: number;
  dailyCost: number;
  monthlyCost: number;
  annualCost: number;
}

export interface OptimizationResult {
  baselineConfiguration: ClassroomConfig;
  optimizedConfiguration: ClassroomConfig;
  baselineSimulation: SimulationResult;
  optimizedSimulation: SimulationResult;
  changedParameters: ParameterChange[];
  savings: OptimizationSavings;
  recommendations: string[];
  /** Number of feasible grid combinations evaluated by the optimizer. */
  searchSpaceSize: number;
}

export interface OptimizerSearchSpace {
  thermostatTemperatureC: number[];
  lightingLevelPercent: number[];
  devicePowerW: number[];
}
