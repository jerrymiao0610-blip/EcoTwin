import type { ImpactChange, ImpactDirection } from "@/lib/impact/types";
import type { ScenarioChange } from "@/lib/scenarios/types";
import { presentImpactDelta } from "../../../lib/workspace/impactPresentation";

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

export function describePercentageChange(change: Readonly<ImpactChange>): string {
  if (change.direction === "neutral") return "No change vs current";
  if (change.percentageChange === null) return "Change from a zero baseline";

  const percentage = presentImpactDelta(change.percentageChange);
  return `${formatNumber(percentage.magnitude)}% ${percentage.comparisonQualifier} than current`;
}

export function describeImpactChange(
  change: Readonly<ImpactChange>,
  unit: string,
): string {
  const presentation = presentImpactDelta(change.difference);
  if (presentation.direction === "neutral") return "No modeled change";

  return `${unit === "$" ? "$" : ""}${formatNumber(presentation.magnitude, unit === "$" ? 2 : 1)}${unit === "$" ? "" : ` ${unit}`} ${
    presentation.direction === "improvement" ? "avoided" : "additional"
  }`;
}

export function describeScenarioChange(change: Readonly<ScenarioChange>): string {
  return `${formatNumber(change.before)} ${change.unit} → ${formatNumber(change.after)} ${change.unit}`;
}

export function directionLabel(direction: ImpactDirection): string {
  if (direction === "improvement") return "Lower impact";
  if (direction === "degradation") return "Higher impact";
  return "No modeled change";
}

export function componentLabel(component: string): string {
  if (component === "hvac") return "HVAC";
  return component.charAt(0).toUpperCase() + component.slice(1);
}
