import type { ClassroomConfig } from "./types";

/** Demo-only values. Keeping these outside the engine makes calculations reusable. */
export const DEFAULT_CLASSROOM_CONFIG: ClassroomConfig = {
  roomAreaM2: 60,
  occupants: 30,
  outsideTemperatureC: 32,
  thermostatTemperatureC: 24,
  operatingHoursPerDay: 8,
  operatingDaysPerMonth: 22,
  operatingDaysPerYear: 250,

  lightingLevelPercent: 80,
  lightingPowerDensityWPerM2: 8,
  devicePowerW: 1_800,

  electricityPricePerKWh: 0.15,
  carbonIntensityKgPerKWh: 0.45,

  hvacEnabled: true,
  lightsEnabled: true,
  devicesEnabled: true,
};
