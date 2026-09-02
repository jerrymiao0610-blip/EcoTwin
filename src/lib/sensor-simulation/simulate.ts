import type { EnvironmentalSnapshot } from "../environment";
import {
  calculateHumidityAwareHvac,
  DEFAULT_HUMIDITY_AWARE_HVAC_ASSUMPTIONS,
  type HumidityAwareHvacAssumptions,
} from "../hvac";
import {
  SIMULATION_CONSTANTS,
  simulateClassroomEnergy,
  type ClassroomConfig,
} from "../simulation";
import type { SensorInformedSimulationResult } from "./types";

export const SENSOR_MODEL_WARNINGS = Object.freeze([
  "Sensor-informed results are educational modeled estimates, not utility-meter measurements or certified building performance.",
  "DHT11 placement and calibration are not independently verified.",
  "Monthly and yearly results extrapolate the current environmental conditions.",
  "The 165 kJ/(m²·K) effective thermal capacitance is a high-sensitivity educational assumption.",
]);

/** Additive sensor path; the legacy simulation remains the lighting/device source. */
export function simulateSensorInformedClassroomEnergy(
  config: Readonly<ClassroomConfig>,
  environment: Readonly<EnvironmentalSnapshot>,
  assumptions: Readonly<HumidityAwareHvacAssumptions> =
    DEFAULT_HUMIDITY_AWARE_HVAC_ASSUMPTIONS,
  additionalWarnings: readonly string[] = [],
): SensorInformedSimulationResult {
  const legacy = simulateClassroomEnergy(config);
  const hvac = calculateHumidityAwareHvac({ config, environment, assumptions });
  const dailyEnergyKWh =
    legacy.lightingEnergyKWh +
    legacy.deviceEnergyKWh +
    hvac.totalHvacElectricityKWh;
  const operatingDaysPerMonth = clamp(
    nonNegative(config.operatingDaysPerMonth),
    0,
    SIMULATION_CONSTANTS.maxOperatingDaysPerMonth,
  );
  const operatingDaysPerYear = clamp(
    nonNegative(config.operatingDaysPerYear),
    0,
    SIMULATION_CONSTANTS.maxOperatingDaysPerYear,
  );
  const monthlyEnergyKWh = dailyEnergyKWh * operatingDaysPerMonth;
  const annualEnergyKWh = dailyEnergyKWh * operatingDaysPerYear;
  const carbonIntensity = nonNegative(config.carbonIntensityKgPerKWh);
  const price = nonNegative(config.electricityPricePerKWh);
  const dailyCO2Kg = dailyEnergyKWh * carbonIntensity;
  const dailyCost = dailyEnergyKWh * price;

  return deepFreeze({
    modelKind: "sensor-informed-v1" as const,
    label: "Sensor-informed modeled estimate" as const,
    environment: {
      indoorObservation: { ...environment.indoorObservation },
      outdoorObservation: { ...environment.outdoorObservation },
      targets: { ...environment.targets },
    },
    hvac: { ...hvac },
    sensibleHvacElectricityKWh:
      hvac.sensibleCoolingElectricityKWh +
      hvac.sensibleHeatingElectricityKWh,
    latentHvacElectricityKWh: hvac.latentElectricityKWh,
    totalHvacElectricityKWh: hvac.totalHvacElectricityKWh,
    lightingEnergyKWh: legacy.lightingEnergyKWh,
    deviceEnergyKWh: legacy.deviceEnergyKWh,
    dailyEnergyKWh,
    monthlyEnergyKWh,
    annualEnergyKWh,
    dailyCO2Kg,
    monthlyCO2Kg: dailyCO2Kg * operatingDaysPerMonth,
    annualCO2Kg: dailyCO2Kg * operatingDaysPerYear,
    dailyCost,
    monthlyCost: dailyCost * operatingDaysPerMonth,
    annualCost: dailyCost * operatingDaysPerYear,
    warnings: [...SENSOR_MODEL_WARNINGS, ...additionalWarnings],
    assumptions: {
      hvac: { ...assumptions },
      classification: "educational-modeled-estimate" as const,
      certifiedBuildingPerformance: false as const,
      monthlyAndAnnualValuesExtrapolateCurrentConditions: true as const,
    },
  });
}

const nonNegative = (value: number) => Math.max(0, value);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}
