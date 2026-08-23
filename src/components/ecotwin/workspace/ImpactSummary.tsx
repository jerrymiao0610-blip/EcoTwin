import type { WorkspaceModel } from "@/lib/workspace/types";

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

const formatSigned = (value: number, maximumFractionDigits = 1) => {
  if (value === 0) return formatNumber(0, maximumFractionDigits);
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatNumber(Math.abs(value), maximumFractionDigits)}`;
};

function ImpactMetric({
  label,
  impact,
  unit,
  maximumFractionDigits = 1,
}: {
  label: string;
  impact: Readonly<AnnualImpact>;
  unit: string;
  maximumFractionDigits?: number;
}) {
  return (
    <div className="impact-summary-metric">
      <span>{label}</span>
      <strong>
        {formatSigned(impact.difference, maximumFractionDigits)} {unit}
      </strong>
      <small>
        {impact.percentageChange === null
          ? "Change from a zero baseline"
          : `${formatSigned(impact.percentageChange, 1)}% vs baseline`}
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
          label="Annual energy"
          impact={model.impact.energyKWh.annual}
          unit="kWh"
        />
        <ImpactMetric
          label="Annual emissions"
          impact={model.impact.co2Kg.annual}
          unit="kg CO₂"
        />
        <ImpactMetric
          label="Annual cost"
          impact={model.impact.cost.annual}
          unit="USD"
          maximumFractionDigits={2}
        />
      </div>
    </section>
  );
}
