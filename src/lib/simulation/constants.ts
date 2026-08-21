import type { SimulationAssumptions } from "./types";

const THERMAL_LOAD_W_PER_M2_PER_C = 12;

/**
 * Deliberately simple, editable assumptions for the educational thermal model.
 * They make an estimate possible, but are not claims about any real building.
 */
export const SIMULATION_CONSTANTS = {
  // Calendar bounds prevent an accidental input from producing implausible scaling.
  maxOperatingDaysPerMonth: 31,
  maxOperatingDaysPerYear: 366,

  // Approximate envelope heat gain/loss for each m² and °C of difference.
  thermalLoadWPerM2PerC: THERMAL_LOAD_W_PER_M2_PER_C,
  // Deprecated API alias retained for consumers of the original cooling model.
  coolingLoadWPerM2PerC: THERMAL_LOAD_W_PER_M2_PER_C,
  // Approximate sensible heat released by one seated classroom occupant.
  occupantHeatGainW: 75,
  // Thermal output divided by HVAC electricity input (a typical illustrative COP).
  hvacCop: 3,
  // Loads at or below this magnitude are treated as effectively balanced.
  thermalBalanceToleranceW: 1,
} as const;

export const ECO_SCORE_FORMULA =
  "Eco Score = clamp(100 − lighting penalty − thermostat penalty − device penalty, 0, 100). " +
  "Penalties increase for lighting above 70%, lighting density above 8 W/m², " +
  "a cooling target below 24°C, a heating target above 20°C, and device power above 75 W per occupant. " +
  "Idle or disabled HVAC has no thermostat penalty. " +
  "Outdoor temperature magnitude is not itself a penalty; it only helps determine HVAC mode and energy use.";

export function getSimulationAssumptions(): SimulationAssumptions {
  return {
    ...SIMULATION_CONSTANTS,
    ecoScoreFormula: ECO_SCORE_FORMULA,
  };
}
