import type { SimulationResult } from "../simulation";
import type {
  ComponentImpact,
  ImpactChange,
  ImpactComponent,
  ImpactDirection,
  ImpactReport,
  PeriodImpact,
} from "./types";

export const MAJOR_CONTRIBUTOR_THRESHOLD_PERCENT = 25;

function classifyDirection(difference: number): ImpactDirection {
  if (difference < 0) return "improvement";
  if (difference > 0) return "degradation";
  return "neutral";
}

function compareValues(baseline: number, candidate: number): ImpactChange {
  const difference = candidate - baseline;

  return {
    baseline,
    candidate,
    difference,
    percentageChange:
      baseline === 0
        ? candidate === 0
          ? 0
          : null
        : (difference / baseline) * 100,
    direction: classifyDirection(difference),
  };
}

function comparePeriods(
  baseline: readonly [number, number, number],
  candidate: readonly [number, number, number],
): PeriodImpact {
  return {
    daily: compareValues(baseline[0], candidate[0]),
    monthly: compareValues(baseline[1], candidate[1]),
    annual: compareValues(baseline[2], candidate[2]),
  };
}

interface ComponentDefinition {
  component: ImpactComponent;
  baseline: number;
  candidate: number;
}

function compareComponents(
  baseline: Readonly<SimulationResult>,
  candidate: Readonly<SimulationResult>,
): ComponentImpact[] {
  const definitions: ComponentDefinition[] = [
    {
      component: "hvac",
      baseline: baseline.hvacEnergyKWh,
      candidate: candidate.hvacEnergyKWh,
    },
    {
      component: "lighting",
      baseline: baseline.lightingEnergyKWh,
      candidate: candidate.lightingEnergyKWh,
    },
    {
      component: "devices",
      baseline: baseline.deviceEnergyKWh,
      candidate: candidate.deviceEnergyKWh,
    },
  ];
  const changes = definitions.map(({ component, baseline, candidate }) => ({
    component,
    energyKWh: compareValues(baseline, candidate),
  }));
  const grossChange = changes.reduce(
    (total, change) => total + Math.abs(change.energyKWh.difference),
    0,
  );

  return changes.map((change) => ({
    ...change,
    contributionPercent:
      grossChange === 0
        ? 0
        : (Math.abs(change.energyKWh.difference) / grossChange) * 100,
  }));
}

function identifyMajorContributors(
  components: readonly ComponentImpact[],
): ComponentImpact[] {
  return components
    .filter(
      ({ energyKWh, contributionPercent }) =>
        energyKWh.direction !== "neutral" &&
        contributionPercent >= MAJOR_CONTRIBUTOR_THRESHOLD_PERCENT,
    )
    .sort(
      (left, right) =>
        Math.abs(right.energyKWh.difference) -
        Math.abs(left.energyKWh.difference),
    );
}

/**
 * Compares any baseline and candidate SimulationResult, including optimizer
 * and scenario outputs. All calculations are differences, percentages, and
 * rankings over simulator outputs; no physical quantity is recalculated.
 */
export function compareSimulationResults(
  baseline: Readonly<SimulationResult>,
  candidate: Readonly<SimulationResult>,
): ImpactReport {
  const energyKWh = comparePeriods(
    [
      baseline.dailyEnergyKWh,
      baseline.monthlyEnergyKWh,
      baseline.annualEnergyKWh,
    ],
    [
      candidate.dailyEnergyKWh,
      candidate.monthlyEnergyKWh,
      candidate.annualEnergyKWh,
    ],
  );
  const components = compareComponents(baseline, candidate);

  return {
    direction: energyKWh.daily.direction,
    energyKWh,
    co2Kg: comparePeriods(
      [baseline.dailyCO2Kg, baseline.monthlyCO2Kg, baseline.annualCO2Kg],
      [candidate.dailyCO2Kg, candidate.monthlyCO2Kg, candidate.annualCO2Kg],
    ),
    cost: comparePeriods(
      [baseline.dailyCost, baseline.monthlyCost, baseline.annualCost],
      [candidate.dailyCost, candidate.monthlyCost, candidate.annualCost],
    ),
    components,
    majorContributors: identifyMajorContributors(components),
  };
}

export type {
  ComponentImpact,
  ImpactChange,
  ImpactComponent,
  ImpactDirection,
  ImpactReport,
  PeriodImpact,
} from "./types";
