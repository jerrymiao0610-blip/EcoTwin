import type { WorkspaceModel } from "@/lib/workspace/types";
import { presentImpactDelta } from "@/lib/workspace/impactPresentation";
import { AnimatedNumber } from "../AnimatedNumber";

interface ImpactSummaryProps {
  model: Readonly<WorkspaceModel>;
}

type AnnualImpact = WorkspaceModel["impact"]["energyKWh"]["annual"];

const directionCopy: Readonly<
  Record<WorkspaceModel["impact"]["direction"], { label: string; title: string }>
> = {
  improvement: {
    label: "Modeled improvement",
    title: "The recommended plan lowers the classroom footprint.",
  },
  degradation: {
    label: "Modeled increase",
    title: "The constrained plan raises the classroom footprint.",
  },
  neutral: {
    label: "No modeled change",
    title: "The current settings are already the best feasible plan.",
  },
};

const componentLabels: Readonly<
  Record<WorkspaceModel["impact"]["components"][number]["component"], string>
> = {
  hvac: "HVAC",
  lighting: "Lighting",
  devices: "Devices",
};

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

function ImpactMetric({
  labels,
  impact,
  unit,
  currency = false,
  maximumFractionDigits = 1,
}: {
  labels: Readonly<Record<WorkspaceModel["impact"]["direction"], string>>;
  impact: Readonly<AnnualImpact>;
  unit: string;
  currency?: boolean;
  maximumFractionDigits?: number;
}) {
  const presentation = presentImpactDelta(impact.difference);
  return (
    <div className={`impact-summary-metric direction-${presentation.direction}`}>
      <span>{labels[presentation.direction]}</span>
      <strong>
        <AnimatedNumber
          value={presentation.magnitude}
          maximumFractionDigits={maximumFractionDigits}
          prefix={currency ? "$" : ""}
        />{unit ? ` ${unit}` : ""}
      </strong>
      <small>
        {impact.percentageChange === null
          ? "Change from a zero baseline"
          : presentation.direction === "neutral"
            ? "No change vs baseline"
            : `${formatNumber(Math.abs(impact.percentageChange), 1)}% ${presentation.comparisonQualifier} vs baseline`}
      </small>
    </div>
  );
}

/** Shows comparison outputs already calculated by the impact layer. */
export function ImpactSummary({ model }: ImpactSummaryProps) {
  const direction = directionCopy[model.impact.direction];

  return (
    <section className="impact-summary" aria-labelledby="impact-summary-title">
      <div className="impact-summary-copy">
        <span className={`impact-direction direction-${model.impact.direction}`}>
          {direction.label}
        </span>
        <h3 id="impact-summary-title">{direction.title}</h3>
        <p>
          Daily modeled energy moves from{" "}
          <strong>{formatNumber(model.baseline.energyKWh.daily)} kWh</strong> to{" "}
          <strong>{formatNumber(model.optimized.energyKWh.daily)} kWh</strong>.
        </p>

        {model.impact.majorContributors.length > 0 ? (
          <div className="impact-contributors">
            <span>Major contributors</span>
            <div>
              {model.impact.majorContributors.map((contributor) => (
                <span key={contributor.component}>
                  {componentLabels[contributor.component]}{" "}
                  <strong>{formatNumber(contributor.contributionPercent, 0)}%</strong>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="impact-summary-metrics" aria-label="Annual modeled impact">
        <ImpactMetric
          labels={{
            improvement: "Energy saved / year",
            degradation: "Additional energy / year",
            neutral: "Annual energy change",
          }}
          impact={model.impact.energyKWh.annual}
          unit="kWh"
        />
        <ImpactMetric
          labels={{
            improvement: "Emissions avoided / year",
            degradation: "Additional emissions / year",
            neutral: "Annual emissions change",
          }}
          impact={model.impact.co2Kg.annual}
          unit="kg CO₂"
        />
        <ImpactMetric
          labels={{
            improvement: "Cost saved / year",
            degradation: "Additional cost / year",
            neutral: "Annual cost change",
          }}
          impact={model.impact.cost.annual}
          unit=""
          currency
          maximumFractionDigits={2}
        />
      </div>
    </section>
  );
}
