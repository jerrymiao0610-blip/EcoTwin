import type { SimulationAssumptions } from "./types";

/**
 * Deliberately simple, editable assumptions for the educational cooling model.
 * They make an estimate possible, but are not claims about any real building.
 */
export const SIMULATION_CONSTANTS = {
  daysPerMonth: 30,
  daysPerYear: 365,

  // Approximate thermal cooling load for each m² and °C above the thermostat.
  coolingLoadWPerM2PerC: 12,
  // Approximate sensible heat released by one seated classroom occupant.
  occupantHeatGainW: 75,
  // Cooling output divided by HVAC electricity input (a typical illustrative COP).
  hvacCop: 3,
} as const;

export const ECO_SCORE_FORMULA =
  "Eco Score = clamp(100 − lighting penalty − cooling penalty − device penalty, 0, 100). " +
  "Penalties increase for lighting above 70%, lighting density above 8 W/m², " +
  "HVAC cooling more than 4°C below outdoors or below 24°C, and device power above 75 W per occupant.";

export function getSimulationAssumptions(): SimulationAssumptions {
  return {
    ...SIMULATION_CONSTANTS,
    ecoScoreFormula: ECO_SCORE_FORMULA,
  };
}
