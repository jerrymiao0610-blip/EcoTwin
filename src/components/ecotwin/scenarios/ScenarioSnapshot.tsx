import type { ScenarioWorkspaceModel } from "@/lib/workspace/scenarioTypes";
import { AnimatedNumber } from "../AnimatedNumber";
import {
  componentLabel,
  describeImpactChange,
  describePercentageChange,
  describeScenarioChange,
  directionLabel,
} from "./scenarioPresentation";

interface ScenarioSnapshotProps {
  model: Readonly<ScenarioWorkspaceModel>;
}

const parameterLabels: Record<string, string> = {
  outsideTemperatureC: "Outdoor context",
  occupants: "Occupancy",
  thermostatTemperatureC: "Room target",
  lightingLevelPercent: "Lighting level",
  devicePowerW: "Device power",
};

export function ScenarioSnapshot({ model }: ScenarioSnapshotProps) {
  const energyImpact = model.impact.energyKWh.daily;
  const primaryChange = model.changes[0];
  const majorContributor = model.impact.majorContributors[0];

  return (
    <section className="decision-snapshot scenario-snapshot" aria-labelledby="scenario-snapshot-title">
      <header>
        <div>
          <span className="eyebrow">What-if snapshot</span>
          <h2 id="scenario-snapshot-title">{model.title}</h2>
        </div>
        <span className={`snapshot-direction direction-${model.direction}`}>
          {directionLabel(model.direction)}
        </span>
      </header>

      <p className="scenario-description">{model.description}</p>

      <div className="snapshot-delta">
        <span>{model.energyDelta.outcomeText}</span>
        {model.direction === "neutral" ? (
          <strong className="scenario-neutral-result">No modeled change</strong>
        ) : (
          <strong>
            <AnimatedNumber value={model.energyDelta.magnitude} />{" "}
            <small>kWh/day {model.energyDelta.valueQualifier}</small>
          </strong>
        )}
        <em>{describePercentageChange(energyImpact)}</em>
      </div>

      <div className="snapshot-energy-pair" aria-label="Current and what-if modeled energy">
        <div><span>Current</span><strong><AnimatedNumber value={model.baseline.energyKWh.daily} /></strong><small>kWh/day</small></div>
        <i aria-hidden="true">→</i>
        <div><span>What-if</span><strong><AnimatedNumber value={model.scenario.energyKWh.daily} /></strong><small>kWh/day</small></div>
      </div>

      <div className="scenario-context-change">
        <span>{primaryChange ? parameterLabels[primaryChange.parameter] ?? "Context change" : "Context change"}</span>
        <strong>{primaryChange ? describeScenarioChange(primaryChange) : "Controls unchanged"}</strong>
        {majorContributor ? (
          <small>
            Major system change · {componentLabel(majorContributor.component)} {describeImpactChange(majorContributor.energyKWh, "kWh/day")}
          </small>
        ) : null}
      </div>

      <dl className="snapshot-annual-impact scenario-impact-strip">
        <div><dt>Impact class</dt><dd>{model.direction}</dd></div>
        <div><dt>CO₂ / day</dt><dd>{describeImpactChange(model.impact.co2Kg.daily, "kg")}</dd></div>
        <div><dt>Cost / day</dt><dd>{describeImpactChange(model.impact.cost.daily, "$")}</dd></div>
      </dl>
    </section>
  );
}
