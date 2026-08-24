import type { WorkspaceModel } from "@/lib/workspace/types";
import { presentImpactDelta } from "@/lib/workspace/impactPresentation";
import type { TwinSystemFocus } from "../ClassroomTwin";

type Recommendation = WorkspaceModel["recommendations"][number];

interface RecommendationCardProps {
  recommendation: Readonly<Recommendation>;
  sequence: number;
  focusable?: boolean;
  onTwinFocusChange?: (system: TwinSystemFocus | null) => void;
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

const twinTargets: Readonly<
  Record<NonNullable<Recommendation["parameterChange"]>["parameter"], TwinSystemFocus>
> = {
  thermostatTemperatureC: "HVAC",
  lightingLevelPercent: "Lighting",
  devicePowerW: "Devices",
};

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

/** Presents one recommendation exactly as supplied by WorkspaceModel. */
export function RecommendationCard({
  recommendation,
  sequence,
  focusable = false,
  onTwinFocusChange,
}: RecommendationCardProps) {
  const change = recommendation.parameterChange;
  const twinTarget = change ? twinTargets[change.parameter] : null;
  const componentEnergy = presentImpactDelta(
    recommendation.evidence.componentDailyEnergyChangeKWh,
  );
  const componentEnergyLabel = componentEnergy.direction === "improvement"
    ? "Daily component energy saved"
    : componentEnergy.direction === "degradation"
      ? "Additional daily component energy"
      : "Daily component energy change";

  return (
    <article
      className={`recommendation-card priority-${recommendation.priority}`}
      data-twin-target={twinTarget?.toLowerCase()}
      tabIndex={focusable || twinTarget ? 0 : undefined}
      onPointerEnter={() => onTwinFocusChange?.(twinTarget)}
      onPointerLeave={(event) => {
        if (!event.currentTarget.matches(":focus-within")) onTwinFocusChange?.(null);
      }}
      onFocus={() => onTwinFocusChange?.(twinTarget)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) onTwinFocusChange?.(null);
      }}
    >
      <div className="recommendation-topline">
        <span className="recommendation-sequence">
          {String(sequence).padStart(2, "0")}
        </span>
        <span className="recommendation-meta">
          {twinTarget ? (
            <span className="recommendation-twin-target">
              <i aria-hidden="true" /> Twin focus · {twinTarget}
            </span>
          ) : null}
          <span className="recommendation-priority">
            {priorityLabels[recommendation.priority]}
          </span>
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

      <div className="recommendation-impact">
        <small>{componentEnergyLabel}</small>
        <strong>{formatNumber(componentEnergy.magnitude, 2)} kWh</strong>
      </div>

      <p>{recommendation.explanation}</p>

      <div className="recommendation-evidence">
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
