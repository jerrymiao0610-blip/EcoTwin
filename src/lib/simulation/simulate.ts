import {
  getSimulationAssumptions,
  SIMULATION_CONSTANTS,
} from "./constants";
import type {
  ClassroomConfig,
  EcoScoreBreakdown,
  HvacMode,
  SimulationResult,
} from "./types";

const nonNegative = (value: number) => Math.max(0, value);
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * Calculates a deterministic, daily classroom energy estimate.
 *
 * HVAC model: the signed thermal load combines envelope heat gain/loss with
 * occupant heat gain. Its sign selects cooling or heating; its magnitude,
 * divided by COP, produces the electrical energy estimate. This is
 * intentionally an explainable teaching model, not certified building-energy
 * modelling.
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

  const envelopeLoadW =
    area *
    SIMULATION_CONSTANTS.thermalLoadWPerM2PerC *
    (config.outsideTemperatureC - config.thermostatTemperatureC);
  const occupantHeatW =
    occupants * SIMULATION_CONSTANTS.occupantHeatGainW;
  const netThermalLoadW = envelopeLoadW + occupantHeatW;
  const hvacMode = getHvacMode(config.hvacEnabled, netThermalLoadW);
  const hvacEnergyKWh = config.hvacEnabled
    ? (Math.abs(netThermalLoadW) * hours) /
      1000 /
      SIMULATION_CONSTANTS.hvacCop
    : 0;

  const dailyEnergyKWh = lightingEnergyKWh + deviceEnergyKWh + hvacEnergyKWh;
  const monthlyEnergyKWh = dailyEnergyKWh * operatingDaysPerMonth;
  const annualEnergyKWh = dailyEnergyKWh * operatingDaysPerYear;
  const carbonIntensity = nonNegative(config.carbonIntensityKgPerKWh);
  const electricityPrice = nonNegative(config.electricityPricePerKWh);
  const dailyCO2Kg = dailyEnergyKWh * carbonIntensity;
  const dailyCost = dailyEnergyKWh * electricityPrice;

  const ecoScoreBreakdown = calculateEcoScoreBreakdown(
    config,
    occupants,
    hvacMode,
  );

  return {
    lightingEnergyKWh,
    deviceEnergyKWh,
    hvacEnergyKWh,
    netThermalLoadW,
    hvacMode,
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

function getHvacMode(hvacEnabled: boolean, netThermalLoadW: number): HvacMode {
  if (!hvacEnabled) return "off";
  if (
    Math.abs(netThermalLoadW) <=
    SIMULATION_CONSTANTS.thermalBalanceToleranceW
  ) {
    return "idle";
  }
  return netThermalLoadW > 0 ? "cooling" : "heating";
}

/** A small, explainable score: lower avoidable energy use means a higher score. */
function calculateEcoScoreBreakdown(
  config: ClassroomConfig,
  occupants: number,
  hvacMode: HvacMode,
): EcoScoreBreakdown {
  const lightingPenalty = config.lightsEnabled
    ? nonNegative(clamp(config.lightingLevelPercent, 0, 100) - 70) * 0.35 +
      nonNegative(config.lightingPowerDensityWPerM2 - 8) * 2
    : 0;

  const thermostatPenalty =
    hvacMode === "cooling"
      ? nonNegative(24 - config.thermostatTemperatureC) * 4
      : hvacMode === "heating"
        ? nonNegative(config.thermostatTemperatureC - 20) * 4
        : 0;

  const powerPerOccupant = config.devicePowerW / Math.max(occupants, 1);
  const devicePenalty = config.devicesEnabled
    ? nonNegative(powerPerOccupant - 75) * 0.12
    : 0;
  const totalPenalty = lightingPenalty + thermostatPenalty + devicePenalty;
  const coolingPenalty = hvacMode === "cooling" ? thermostatPenalty : 0;

  return {
    lightingPenalty,
    thermostatPenalty,
    coolingPenalty,
    devicePenalty,
    totalPenalty,
  };
}
