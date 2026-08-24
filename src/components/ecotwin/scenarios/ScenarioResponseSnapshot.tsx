import type { ScenarioResponseModel } from "@/lib/workspace/scenarioResponseTypes";
import { AnimatedNumber } from "../AnimatedNumber";
import { describeImpactChange } from "./scenarioPresentation";

interface ScenarioResponseSnapshotProps {
  model: Readonly<ScenarioResponseModel>;
}

/** Compact plan snapshot. The optimized controls are never presented as twin state. */
export function ScenarioResponseSnapshot({ model }: ScenarioResponseSnapshotProps) {
  const leadingRecommendation = model.recommendations[0];
  const isNeutral = model.status === "already-at-modeled-plan";

  return (
    <section className={`scenario-response-snapshot ${isNeutral ? "is-neutral" : ""}`} aria-labelledby="scenario-response-title">
      <header>
        <div>
          <span className="eyebrow">EcoTwin response · plan output</span>
          <h2 id="scenario-response-title">{model.scenarioTitle} response</h2>
        </div>
        <div className="response-plan-label">
          <span>Plan</span>
          <small>Not current twin state</small>
        </div>
      </header>

      <div className="response-snapshot-primary">
        <span>Optimized response energy</span>
        <strong><AnimatedNumber value={model.optimizedResponse.energyKWh.daily} /> <small>kWh/day</small></strong>
        <em>{isNeutral ? model.energyDelta.outcomeText : model.energyDelta.amountText}</em>
      </div>

      <dl className="response-snapshot-metrics">
        <div>
          <dt>Improvement</dt>
          <dd>{model.energyDelta.percentageMagnitude === null ? "Not available" : `${model.energyDelta.percentageMagnitude.toFixed(1)}%`}</dd>
          <small>{isNeutral ? "No change" : model.energyDelta.comparisonText}</small>
        </div>
        <div>
          <dt>CO₂ impact / day</dt>
          <dd>{describeImpactChange(model.impact.co2Kg.daily, "kg")}</dd>
          <small>Scenario without response → plan</small>
        </div>
        <div>
          <dt>Cost impact / day</dt>
          <dd>{describeImpactChange(model.impact.cost.daily, "$")}</dd>
          <small>Scenario without response → plan</small>
        </div>
        <div>
          <dt>Response status</dt>
          <dd>{model.statusText}</dd>
          <small>{model.recommendations.length} {model.recommendations.length === 1 ? "action" : "actions"}</small>
        </div>
      </dl>

      <div className="response-leading-action">
        <span>Leading action</span>
        <strong>{leadingRecommendation?.action ?? "No modeled action supplied"}</strong>
      </div>
    </section>
  );
}
