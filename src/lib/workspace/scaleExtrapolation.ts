import type { ImpactChange } from "../impact/types";

/** Approximate annual CO₂ absorbed by one mature tree (public forestry estimate). */
export const TREE_CO2_KG_PER_YEAR = 21;

export const MIN_SCALE_ROOMS = 1;
export const MAX_SCALE_ROOMS = 10_000;
export const SCALE_SLIDER_MAX = 1_000;
export const SCALE_ROOM_PRESETS = [10, 50, 100, 500, 1_000] as const;

/** One-space annual avoided impact, supplied from a scenario comparison. */
export interface ScaleImpactSource {
  energyKWh: Readonly<ImpactChange>;
  co2Kg: Readonly<ImpactChange>;
  cost: Readonly<ImpactChange>;
}

export interface ScaleExtrapolationResult {
  rooms: number;
  /** Signed scaled delta. Negative means avoided/saved; positive means added. */
  annualEnergyKWhDelta: number;
  annualCO2KgDelta: number;
  annualCostDelta: number;
  treeEquivalent: number;
  hasAvoidedCO2: boolean;
}

/**
 * Pure presentation extrapolation: multiplies a single-space annual avoided
 * impact by a number of identical spaces. No simulation or optimization is
 * repeated here; the scaled numbers are explicitly illustrative.
 */
export function extrapolateScale(
  annual: Readonly<ScaleImpactSource>,
  rooms: number,
): ScaleExtrapolationResult {
  const numeric = Number.isFinite(rooms) ? rooms : MIN_SCALE_ROOMS;
  const safeRooms = Math.min(
    MAX_SCALE_ROOMS,
    Math.max(MIN_SCALE_ROOMS, Math.floor(numeric)),
  );

  const annualEnergyKWhDelta = annual.energyKWh.difference * safeRooms;
  const annualCO2KgDelta = annual.co2Kg.difference * safeRooms;
  const annualCostDelta = annual.cost.difference * safeRooms;
  const avoidedCO2Kg = Math.max(0, -annualCO2KgDelta);

  return {
    rooms: safeRooms,
    annualEnergyKWhDelta,
    annualCO2KgDelta,
    annualCostDelta,
    treeEquivalent: avoidedCO2Kg / TREE_CO2_KG_PER_YEAR,
    hasAvoidedCO2: avoidedCO2Kg > 0,
  };
}
