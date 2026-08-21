/**
 * Inputs for EcoTwin's educational classroom-energy estimate.
 *
 * Values represent a typical operating day. They are not a substitute for
 * measured utility data or professional building-energy modelling.
 */
export interface ClassroomConfig {
  roomAreaM2: number;
  occupants: number;

  outsideTemperatureC: number;
  thermostatTemperatureC: number;
  operatingHoursPerDay: number;
  /** Expected classroom operating days, constrained to a calendar-month range. */
  operatingDaysPerMonth: number;
  /** Expected classroom operating days, constrained to a calendar-year range. */
  operatingDaysPerYear: number;

  /** 0–100, where 100 means the lighting system is used at full output. */
  lightingLevelPercent: number;
  lightingPowerDensityWPerM2: number;
  devicePowerW: number;

  electricityPricePerKWh: number;
  carbonIntensityKgPerKWh: number;

  hvacEnabled: boolean;
  lightsEnabled: boolean;
  devicesEnabled: boolean;
}

export interface EcoScoreBreakdown {
  /** Score starts at 100; each value is a transparent penalty in score points. */
  lightingPenalty: number;
  coolingPenalty: number;
  devicePenalty: number;
  totalPenalty: number;
}

export interface SimulationAssumptions {
  maxOperatingDaysPerMonth: number;
  maxOperatingDaysPerYear: number;
  coolingLoadWPerM2PerC: number;
  occupantHeatGainW: number;
  hvacCop: number;
  ecoScoreFormula: string;
}

export interface SimulationResult {
  lightingEnergyKWh: number;
  deviceEnergyKWh: number;
  hvacEnergyKWh: number;

  dailyEnergyKWh: number;
  monthlyEnergyKWh: number;
  annualEnergyKWh: number;

  dailyCO2Kg: number;
  monthlyCO2Kg: number;
  annualCO2Kg: number;

  dailyCost: number;
  monthlyCost: number;
  annualCost: number;

  /** An educational 0–100 indicator, not a sustainability certification. */
  ecoScore: number;
  ecoScoreBreakdown: EcoScoreBreakdown;
  assumptions: SimulationAssumptions;
}
