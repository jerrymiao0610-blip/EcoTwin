import type { WorkspaceModel } from "@/lib/workspace/types";
import { presentImpactDelta } from "@/lib/workspace/impactPresentation";

interface DecisionSnapshotProps {
  model: Readonly<WorkspaceModel>;
}

const format = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

const annualLabels = {
  improvement: {
    energy: "Energy saved / year",
    emissions: "Emissions avoided / year",
    cost: "Cost saved / year",
  },
  degradation: {
    energy: "Additional energy / year",
    emissions: "Additional emissions / year",
    cost: "Additional cost / year",
  },
  neutral: {
    energy: "Annual energy change",
    emissions: "Annual emissions change",
    cost: "Annual cost change",
  },
} as const;

const formatPercentageComparison = (
  percentageChange: number | null,
  baselineLabel: string,
) => {
  if (percentageChange === null) return "Change from a zero baseline";

  const presentation = presentImpactDelta(percentageChange);
  if (presentation.direction === "neutral") {
    return `No change vs ${baselineLabel}`;
  }

  return `${format(presentation.magnitude)}% ${presentation.comparisonQualifier} vs ${baselineLabel}`;
};

export function DecisionSnapshot({ model }: DecisionSnapshotProps) {
  const dailyImpact = model.impact.energyKWh.daily;
  const dailyPresentation = presentImpactDelta(dailyImpact.difference);
  const isImprovement = model.impact.direction === "improvement";
  const annualEnergy = presentImpactDelta(model.impact.energyKWh.annual.difference);
  const annualEmissions = presentImpactDelta(model.impact.co2Kg.annual.difference);
  const annualCost = presentImpactDelta(model.impact.cost.annual.difference);
  const leadingRecommendation = model.recommendations[0];

  const dailyLabel = dailyPresentation.direction === "improvement"
    ? "Modeled energy saved"
    : dailyPresentation.direction === "degradation"
      ? "Additional modeled energy"
      : "Modeled energy change";

  return (
    <section className="decision-snapshot" aria-labelledby="decision-snapshot-title">
      <header>
        <div>
          <span className="eyebrow">Decision snapshot</span>
          <h2 id="decision-snapshot-title">Recommended plan</h2>
        </div>
        <span className={`snapshot-direction direction-${model.impact.direction}`}>
          {model.impact.direction === "neutral" ? "No modeled change" : isImprovement ? "Lower impact" : "Higher impact"}
        </span>
      </header>

      <div className="snapshot-delta">
        <span>{dailyLabel}</span>
        <strong>
          {format(dailyPresentation.magnitude)}{" "}
          <small>
            kWh/day{dailyPresentation.valueQualifier ? ` ${dailyPresentation.valueQualifier}` : ""}
          </small>
        </strong>
        <em>{formatPercentageComparison(dailyImpact.percentageChange, "current")}</em>
      </div>

      <div className="snapshot-energy-pair" aria-label="Current and optimized modeled energy">
        <div><span>Current</span><strong>{format(model.baseline.energyKWh.daily)}</strong><small>kWh/day</small></div>
        <i aria-hidden="true">→</i>
        <div><span>EcoTwin plan</span><strong>{format(model.optimized.energyKWh.daily)}</strong><small>kWh/day</small></div>
      </div>

      <div className="snapshot-recommendation">
        <span>{model.recommendations.length} {model.recommendations.length === 1 ? "recommendation" : "recommendations"}</span>
        <strong>{leadingRecommendation?.action ?? "Maintain current controls"}</strong>
      </div>

      <dl className="snapshot-annual-impact">
        <div><dt>{annualLabels[annualEnergy.direction].energy}</dt><dd>{format(annualEnergy.magnitude)} kWh</dd></div>
        <div><dt>{annualLabels[annualEmissions.direction].emissions}</dt><dd>{format(annualEmissions.magnitude)} kg CO₂</dd></div>
        <div><dt>{annualLabels[annualCost.direction].cost}</dt><dd>${format(annualCost.magnitude, 2)}</dd></div>
      </dl>
    </section>
  );
}
