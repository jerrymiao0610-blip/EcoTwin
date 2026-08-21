import {
  getSimulationAssumptions,
  SIMULATION_CONSTANTS,
} from "./constants";
import type {
  ClassroomConfig,
  EcoScoreBreakdown,
  SimulationResult,
} from "./types";

const nonNegative = (value: number) => Math.max(0, value);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * Calculates a deterministic, daily classroom energy estimate.
 *
 * HVAC model: thermal cooling demand is the sum of outdoor-temperature load
 * and occupant heat gain. Dividing this thermal demand by COP produces the
 * electrical energy estimate. This is intentionally an explainable teaching
 * model, not certified building-energy modelling.
 */
export function simulateClassroomEnergy(
  config: ClassroomConfig,
): SimulationResult {
  const area = nonNegative(config.roomAreaM2);
  const occupants = nonNegative(config.occupants);
  const hours = nonNegative(config.operatingHoursPerDay);
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
  const lightingLevel = clamp(config.lightingLevelPercent, 0, 100) / 100;

  const lightingEnergyKWh = config.lightsEnabled
    ? (area * nonNegative(config.lightingPowerDensityWPerM2) * lightingLevel * hours) / 1000
    : 0;

  const deviceEnergyKWh = config.devicesEnabled
    ? (nonNegative(config.devicePowerW) * hours) / 1000
    : 0;

  // Outdoor cooling only applies when it is warmer outside than the target.
  const outdoorTemperatureDifference = nonNegative(
    config.outsideTemperatureC - config.thermostatTemperatureC,
  );
  const outdoorCoolingDemandKWh =
    (outdoorTemperatureDifference *
      area *
      SIMULATION_CONSTANTS.coolingLoadWPerM2PerC *
      hours) /
    1000;
  const occupantCoolingDemandKWh =
    (occupants * SIMULATION_CONSTANTS.occupantHeatGainW * hours) / 1000;
  const hvacEnergyKWh = config.hvacEnabled
    ? (outdoorCoolingDemandKWh + occupantCoolingDemandKWh) /
      SIMULATION_CONSTANTS.hvacCop
    : 0;

  const dailyEnergyKWh = lightingEnergyKWh + deviceEnergyKWh + hvacEnergyKWh;
  const monthlyEnergyKWh = dailyEnergyKWh * operatingDaysPerMonth;
  const annualEnergyKWh = dailyEnergyKWh * operatingDaysPerYear;
  const carbonIntensity = nonNegative(config.carbonIntensityKgPerKWh);
  const electricityPrice = nonNegative(config.electricityPricePerKWh);
  const dailyCO2Kg = dailyEnergyKWh * carbonIntensity;
  const dailyCost = dailyEnergyKWh * electricityPrice;

  const ecoScoreBreakdown = calculateEcoScoreBreakdown(config, occupants);

  return {
    lightingEnergyKWh,
    deviceEnergyKWh,
    hvacEnergyKWh,
    dailyEnergyKWh,
    monthlyEnergyKWh,
    annualEnergyKWh,
    dailyCO2Kg,
    monthlyCO2Kg: dailyCO2Kg * operatingDaysPerMonth,
    annualCO2Kg: dailyCO2Kg * operatingDaysPerYear,
    dailyCost,
    monthlyCost: dailyCost * operatingDaysPerMonth,
    annualCost: dailyCost * operatingDaysPerYear,
    ecoScore: clamp(100 - ecoScoreBreakdown.totalPenalty, 0, 100),
    ecoScoreBreakdown,
    assumptions: getSimulationAssumptions(),
  };
}

/** A small, explainable score: lower avoidable energy use means a higher score. */
function calculateEcoScoreBreakdown(
  config: ClassroomConfig,
  occupants: number,
): EcoScoreBreakdown {
  const lightingPenalty = config.lightsEnabled
    ? nonNegative(clamp(config.lightingLevelPercent, 0, 100) - 70) * 0.35 +
      nonNegative(config.lightingPowerDensityWPerM2 - 8) * 2
    : 0;

  const coolingPenalty = config.hvacEnabled
    ? nonNegative(24 - config.thermostatTemperatureC) * 4
    : 0;

  const powerPerOccupant = config.devicePowerW / Math.max(occupants, 1);
  const devicePenalty = config.devicesEnabled
    ? nonNegative(powerPerOccupant - 75) * 0.12
    : 0;
  const totalPenalty = lightingPenalty + coolingPenalty + devicePenalty;

  return { lightingPenalty, coolingPenalty, devicePenalty, totalPenalty };
}
