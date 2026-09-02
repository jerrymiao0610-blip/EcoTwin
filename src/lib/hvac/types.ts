import type { ClassroomConfig } from "../simulation";
import type { EnvironmentalSnapshot } from "../environment";

export type HumidityAwareHvacDetailedMode =
  | "cooling"
  | "cooling-and-dehumidifying"
  | "heating"
  | "heating-and-dehumidifying"
  | "dehumidifying"
  | "idle"
  | "off";

export interface HumidityAwareHvacAssumptions {
  /** Simplified envelope transmission only; excludes ventilation/infiltration. */
  readonly envelopeTransmissionWPerM2K: number;
  readonly ventilationLPerSecondPerPerson: number;
  readonly ventilationLPerSecondPerM2: number;
  readonly infiltrationAirChangesPerHour: number;
  readonly ceilingHeightM: number;
  readonly dryAirDensityKgPerM3: number;
  readonly dryAirSpecificHeatJPerKgK: number;
  readonly occupantSensibleHeatW: number;
  /** High-sensitivity educational effective thermal-capacitance assumption. */
  readonly effectiveThermalCapacitanceKJPerM2K: number;
  readonly occupantMoistureKgPerPersonHour: number;
  readonly latentHeatOfVaporizationKJPerKg: number;
  readonly coolingCop: number;
  readonly heatingCop: number;
  readonly thermalBalanceToleranceKWh: number;
  readonly activeHumidificationModeled: false;
}

export interface HumidityAwareHvacResult {
  readonly detailedMode: HumidityAwareHvacDetailedMode;
  readonly envelopeTransmissionLoadW: number;
  readonly outdoorAirSensibleLoadW: number;
  readonly occupantSensibleLoadW: number;
  readonly netOperatingSensibleLoadW: number;
  readonly stateRecoveryEnergyKWhThermal: number;
  readonly sensibleCoolingEnergyKWhThermal: number;
  readonly sensibleHeatingEnergyKWhThermal: number;
  readonly sensibleCoolingElectricityKWh: number;
  readonly sensibleHeatingElectricityKWh: number;
  readonly latentEnergyKWhThermal: number;
  readonly latentElectricityKWh: number;
  readonly totalHvacElectricityKWh: number;
  readonly ventilationAirFlowM3PerSecond: number;
  readonly infiltrationAirFlowM3PerSecond: number;
  readonly dryAirMassFlowKgPerSecond: number;
  readonly indoorHumidityRatioKgPerKgDryAir: number;
  readonly outdoorHumidityRatioKgPerKgDryAir: number;
  readonly targetHumidityRatioKgPerKgDryAir: number;
  readonly zoneDryAirMassKg: number;
  readonly initialZoneMoistureDifferenceKg: number;
  readonly outdoorAirMoistureDifferenceKg: number;
  readonly occupantMoistureGenerationKg: number;
  readonly moistureSurplusKg: number;
  readonly moistureRemovedKg: number;
  readonly moistureDeficitKg: number;
}

export interface HumidityAwareHvacInput {
  readonly config: Readonly<ClassroomConfig>;
  readonly environment: Readonly<EnvironmentalSnapshot>;
  readonly assumptions?: Readonly<HumidityAwareHvacAssumptions>;
}
