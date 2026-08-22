export type ImpactDirection = "improvement" | "degradation" | "neutral";

export type ImpactComponent = "hvac" | "lighting" | "devices";

/**
 * A signed comparison where difference is always candidate minus baseline.
 * A null percentage means the baseline was zero and the percentage change is
 * therefore undefined (unless both values are zero, which is reported as 0%).
 */
export interface ImpactChange {
  baseline: number;
  candidate: number;
  difference: number;
  percentageChange: number | null;
  direction: ImpactDirection;
}

export interface PeriodImpact {
  daily: ImpactChange;
  monthly: ImpactChange;
  annual: ImpactChange;
}

export interface ComponentImpact {
  component: ImpactComponent;
  /** Daily component energy, matching the component outputs of SimulationResult. */
  energyKWh: ImpactChange;
  /** Share of the sum of absolute component changes. */
  contributionPercent: number;
}

export interface ImpactReport {
  /** Overall direction follows the daily total-energy comparison. */
  direction: ImpactDirection;
  energyKWh: PeriodImpact;
  co2Kg: PeriodImpact;
  cost: PeriodImpact;
  /** Stable display order: HVAC, lighting, then devices. */
  components: ComponentImpact[];
  /** Changed components contributing at least 25% of gross component change. */
  majorContributors: ComponentImpact[];
}
