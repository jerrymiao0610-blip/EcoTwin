import type { EnvironmentalSnapshot } from "../environment";
import type {
  HumidityAwareHvacAssumptions,
  HumidityAwareHvacResult,
} from "../hvac";

export interface SensorInformedSimulationAssumptions {
  readonly hvac: HumidityAwareHvacAssumptions;
  readonly classification: "educational-modeled-estimate";
  readonly certifiedBuildingPerformance: false;
  readonly monthlyAndAnnualValuesExtrapolateCurrentConditions: true;
}

export interface SensorInformedSimulationResult {
  readonly modelKind: "sensor-informed-v1";
  readonly label: "Sensor-informed modeled estimate";
  readonly environment: EnvironmentalSnapshot;
  readonly hvac: HumidityAwareHvacResult;
  readonly sensibleHvacElectricityKWh: number;
  readonly latentHvacElectricityKWh: number;
  readonly totalHvacElectricityKWh: number;
  readonly lightingEnergyKWh: number;
  readonly deviceEnergyKWh: number;
  readonly dailyEnergyKWh: number;
  readonly monthlyEnergyKWh: number;
  readonly annualEnergyKWh: number;
  readonly dailyCO2Kg: number;
  readonly monthlyCO2Kg: number;
  readonly annualCO2Kg: number;
  readonly dailyCost: number;
  readonly monthlyCost: number;
  readonly annualCost: number;
  readonly warnings: readonly string[];
  readonly assumptions: SensorInformedSimulationAssumptions;
}
