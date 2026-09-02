import { humidityRatioKgPerKgDryAir } from "../psychrometrics";
import type {
  HumidityAwareHvacAssumptions,
  HumidityAwareHvacDetailedMode,
  HumidityAwareHvacInput,
  HumidityAwareHvacResult,
} from "./types";

export const DEFAULT_HUMIDITY_AWARE_HVAC_ASSUMPTIONS: HumidityAwareHvacAssumptions =
  Object.freeze({
    envelopeTransmissionWPerM2K: 12,
    ventilationLPerSecondPerPerson: 5,
    ventilationLPerSecondPerM2: 0.6,
    infiltrationAirChangesPerHour: 0.3,
    ceilingHeightM: 3,
    dryAirDensityKgPerM3: 1.2,
    dryAirSpecificHeatJPerKgK: 1_005,
    occupantSensibleHeatW: 75,
    effectiveThermalCapacitanceKJPerM2K: 165,
    occupantMoistureKgPerPersonHour: 0.06,
    latentHeatOfVaporizationKJPerKg: 2_450,
    coolingCop: 3,
    heatingCop: 3,
    thermalBalanceToleranceKWh: 1e-9,
    activeHumidificationModeled: false,
  });

/**
 * Pure educational HVAC calculation with cooling-positive sensible loads.
 * Envelope transmission, outdoor air, indoor recovery, and latent loads remain
 * explicit so ventilation is not counted inside the 12 W/(m²·K) coefficient.
 */
export function calculateHumidityAwareHvac(
  input: Readonly<HumidityAwareHvacInput>,
): HumidityAwareHvacResult {
  const { config, environment } = input;
  const assumptions = input.assumptions ?? DEFAULT_HUMIDITY_AWARE_HVAC_ASSUMPTIONS;
  assertAssumptions(assumptions);

  const area = nonNegative(config.roomAreaM2);
  const occupants = nonNegative(config.occupants);
  const operatingHours = nonNegative(config.operatingHoursPerDay);
  const volumeM3 = area * assumptions.ceilingHeightM;
  const targetTemperature = environment.targets.temperatureC;
  const outdoorTemperature = environment.outdoorObservation.temperatureC;
  const indoorTemperature = environment.indoorObservation.temperatureC;
  const pressureKPa = environment.outdoorObservation.pressureKPa;

  const envelopeTransmissionLoadW =
    assumptions.envelopeTransmissionWPerM2K *
    area *
    (outdoorTemperature - targetTemperature);
  const ventilationAirFlowM3PerSecond =
    (assumptions.ventilationLPerSecondPerPerson * occupants +
      assumptions.ventilationLPerSecondPerM2 * area) /
    1_000;
  const infiltrationAirFlowM3PerSecond =
    (assumptions.infiltrationAirChangesPerHour * volumeM3) / 3_600;
  const dryAirMassFlowKgPerSecond =
    assumptions.dryAirDensityKgPerM3 *
    (ventilationAirFlowM3PerSecond + infiltrationAirFlowM3PerSecond);
  const outdoorAirSensibleLoadW =
    dryAirMassFlowKgPerSecond *
    assumptions.dryAirSpecificHeatJPerKgK *
    (outdoorTemperature - targetTemperature);
  const occupantSensibleLoadW =
    assumptions.occupantSensibleHeatW * occupants;
  const netOperatingSensibleLoadW =
    envelopeTransmissionLoadW +
    outdoorAirSensibleLoadW +
    occupantSensibleLoadW;
  const operatingSensibleEnergyKWh =
    (netOperatingSensibleLoadW * operatingHours) / 1_000;
  const stateRecoveryEnergyKWhThermal =
    (assumptions.effectiveThermalCapacitanceKJPerM2K *
      area *
      (indoorTemperature - targetTemperature)) /
    3_600;
  const netSensibleEnergyKWh =
    operatingSensibleEnergyKWh + stateRecoveryEnergyKWhThermal;
  const sensibleCoolingEnergyKWhThermal = Math.max(0, netSensibleEnergyKWh);
  const sensibleHeatingEnergyKWhThermal = Math.max(0, -netSensibleEnergyKWh);

  const indoorHumidityRatioKgPerKgDryAir = humidityRatioKgPerKgDryAir(
    indoorTemperature,
    environment.indoorObservation.relativeHumidityPercent,
    pressureKPa,
  );
  const outdoorHumidityRatioKgPerKgDryAir = humidityRatioKgPerKgDryAir(
    outdoorTemperature,
    environment.outdoorObservation.relativeHumidityPercent,
    pressureKPa,
  );
  const targetHumidityRatioKgPerKgDryAir = humidityRatioKgPerKgDryAir(
    targetTemperature,
    environment.targets.relativeHumidityPercent,
    pressureKPa,
  );
  const zoneDryAirMassKg =
    (assumptions.dryAirDensityKgPerM3 * volumeM3) /
    (1 + indoorHumidityRatioKgPerKgDryAir);
  const initialZoneMoistureDifferenceKg =
    zoneDryAirMassKg *
    (indoorHumidityRatioKgPerKgDryAir - targetHumidityRatioKgPerKgDryAir);
  const operatingSeconds = operatingHours * 3_600;
  const outdoorAirMoistureDifferenceKg =
    dryAirMassFlowKgPerSecond *
    (outdoorHumidityRatioKgPerKgDryAir - targetHumidityRatioKgPerKgDryAir) *
    operatingSeconds;
  // The generation rate remains kg/person-hour and is multiplied only by hours.
  const occupantMoistureGenerationKg =
    assumptions.occupantMoistureKgPerPersonHour * occupants * operatingHours;
  const moistureSurplusKg =
    initialZoneMoistureDifferenceKg +
    outdoorAirMoistureDifferenceKg +
    occupantMoistureGenerationKg;
  const removableMoistureKg = Math.max(0, moistureSurplusKg);
  const moistureDeficitKg = Math.max(0, -moistureSurplusKg);
  const moistureRemovedKg = config.hvacEnabled ? removableMoistureKg : 0;
  const latentEnergyKWhThermal =
    (moistureRemovedKg * assumptions.latentHeatOfVaporizationKJPerKg) / 3_600;

  const sensibleCoolingElectricityKWh = config.hvacEnabled
    ? sensibleCoolingEnergyKWhThermal / assumptions.coolingCop
    : 0;
  const sensibleHeatingElectricityKWh = config.hvacEnabled
    ? sensibleHeatingEnergyKWhThermal / assumptions.heatingCop
    : 0;
  const latentElectricityKWh = config.hvacEnabled
    ? latentEnergyKWhThermal / assumptions.coolingCop
    : 0;
  const totalHvacElectricityKWh =
    sensibleCoolingElectricityKWh +
    sensibleHeatingElectricityKWh +
    latentElectricityKWh;
  const detailedMode = getDetailedMode(
    config.hvacEnabled,
    sensibleCoolingEnergyKWhThermal,
    sensibleHeatingEnergyKWhThermal,
    latentEnergyKWhThermal,
    assumptions.thermalBalanceToleranceKWh,
  );

  return Object.freeze({
    detailedMode,
    envelopeTransmissionLoadW,
    outdoorAirSensibleLoadW,
    occupantSensibleLoadW,
    netOperatingSensibleLoadW,
    stateRecoveryEnergyKWhThermal,
    sensibleCoolingEnergyKWhThermal,
    sensibleHeatingEnergyKWhThermal,
    sensibleCoolingElectricityKWh,
    sensibleHeatingElectricityKWh,
    latentEnergyKWhThermal,
    latentElectricityKWh,
    totalHvacElectricityKWh,
    ventilationAirFlowM3PerSecond,
    infiltrationAirFlowM3PerSecond,
    dryAirMassFlowKgPerSecond,
    indoorHumidityRatioKgPerKgDryAir,
    outdoorHumidityRatioKgPerKgDryAir,
    targetHumidityRatioKgPerKgDryAir,
    zoneDryAirMassKg,
    initialZoneMoistureDifferenceKg,
    outdoorAirMoistureDifferenceKg,
    occupantMoistureGenerationKg,
    moistureSurplusKg,
    moistureRemovedKg,
    moistureDeficitKg,
  });
}

function getDetailedMode(
  enabled: boolean,
  coolingKWh: number,
  heatingKWh: number,
  latentKWh: number,
  tolerance: number,
): HumidityAwareHvacDetailedMode {
  if (!enabled) return "off";
  const cooling = coolingKWh > tolerance;
  const heating = heatingKWh > tolerance;
  const dehumidifying = latentKWh > tolerance;
  if (cooling && dehumidifying) return "cooling-and-dehumidifying";
  if (heating && dehumidifying) return "heating-and-dehumidifying";
  if (cooling) return "cooling";
  if (heating) return "heating";
  if (dehumidifying) return "dehumidifying";
  return "idle";
}

function assertAssumptions(
  assumptions: Readonly<HumidityAwareHvacAssumptions>,
): void {
  for (const [key, value] of Object.entries(assumptions)) {
    if (key === "activeHumidificationModeled") continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new RangeError(`HVAC assumption ${key} must be non-negative and finite.`);
    }
  }
  if (assumptions.coolingCop <= 0 || assumptions.heatingCop <= 0) {
    throw new RangeError("HVAC COP assumptions must be positive.");
  }
}

const nonNegative = (value: number) => Math.max(0, value);
