import type { WorkspaceModel } from "@/lib/workspace/types";
import { presentImpactDelta } from "@/lib/workspace/impactPresentation";

type Recommendation = WorkspaceModel["recommendations"][number];

interface RecommendationCardProps {
  recommendation: Readonly<Recommendation>;
  sequence: number;
}

const priorityLabels: Readonly<Record<Recommendation["priority"], string>> = {
  high: "High impact",
  medium: "Medium impact",
  low: "Supporting action",
  none: "Maintain",
};

const parameterLabels: Readonly<
  Record<NonNullable<Recommendation["parameterChange"]>["parameter"], string>
> = {
  thermostatTemperatureC: "Thermostat",
  lightingLevelPercent: "Lighting level",
  devicePowerW: "Device allowance",
};

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

/** Presents one recommendation exactly as supplied by WorkspaceModel. */
export function RecommendationCard({
  recommendation,
  sequence,
}: RecommendationCardProps) {
  const change = recommendation.parameterChange;
  const componentEnergy = presentImpactDelta(
    recommendation.evidence.componentDailyEnergyChangeKWh,
  );
  const componentEnergyLabel = componentEnergy.direction === "improvement"
    ? "Daily component energy saved"
    : componentEnergy.direction === "degradation"
      ? "Additional daily component energy"
      : "Daily component energy change";

  return (
    <article className={`recommendation-card priority-${recommendation.priority}`}>
      <div className="recommendation-topline">
        <span className="recommendation-sequence">
          {String(sequence).padStart(2, "0")}
        </span>
        <span className="recommendation-priority">
          {priorityLabels[recommendation.priority]}
        </span>
      </div>

      <h4>{recommendation.action}</h4>

      {change ? (
        <div className="recommendation-change" aria-label={`${parameterLabels[change.parameter]} setting change`}>
          <span>{parameterLabels[change.parameter]}</span>
          <strong>
            {formatNumber(change.before)} {change.unit}
            <i aria-hidden="true">→</i>
            {formatNumber(change.after)} {change.unit}
          </strong>
        </div>
      ) : null}

      <p>{recommendation.explanation}</p>

      <div className="recommendation-evidence">
        <span>
          <small>{componentEnergyLabel}</small>
          <strong>
            {formatNumber(componentEnergy.magnitude, 2)} kWh
          </strong>
        </span>
        <span>
          <small>Share of gross change</small>
          <strong>
            {formatNumber(
              recommendation.evidence.componentContributionPercent,
              0,
            )}
            %
          </strong>
        </span>
      </div>
    </article>
  );
}
