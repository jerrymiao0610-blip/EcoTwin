import type { ScenarioResponseModel } from "@/lib/workspace/scenarioResponseTypes";
import type { ScenarioWorkspaceModel } from "@/lib/workspace/scenarioTypes";
import { AnimatedNumber } from "../AnimatedNumber";
import {
  describePercentageChange,
  describeScenarioChange,
} from "./scenarioPresentation";

interface ScenarioDecisionFlowProps {
  scenario: Readonly<ScenarioWorkspaceModel>;
  response: Readonly<ScenarioResponseModel>;
}

const parameterLabels: Readonly<Record<string, string>> = {
  outsideTemperatureC: "Outdoor temperature",
  occupants: "Occupancy",
  thermostatTemperatureC: "Thermostat target",
  lightingLevelPercent: "Lighting level",
  devicePowerW: "Device power",
};

function responseBasisLabel(model: Readonly<ScenarioResponseModel>) {
  return `vs unmitigated ${model.scenarioTitle.toLowerCase()}`;
}

/** Primary Current → What-if → Response narrative using existing models only. */
export function ScenarioDecisionFlow({
  scenario,
  response,
}: ScenarioDecisionFlowProps) {
  const primaryChange = scenario.changes[0];
  const leadingRecommendation = response.recommendations[0];
  const isNeutral = response.status === "already-at-modeled-plan";

  return (
    <section
      className="scenario-decision-flow"
      aria-labelledby="scenario-decision-flow-title"
      aria-live="polite"
    >
      <header>
        <div>
          <span className="eyebrow">Decision path</span>
          <h2 id="scenario-decision-flow-title">Future condition to response</h2>
        </div>
        <span className={`response-status status-${response.status}`}>
          {response.statusText}
        </span>
      </header>

      <ol className="decision-flow-stages">
        <li className="decision-flow-stage stage-current">
          <div className="flow-stage-heading">
            <span>01</span>
            <div><small>Current</small><strong>Modeled baseline</strong></div>
          </div>
          <div className="flow-stage-reading">
            <strong><AnimatedNumber value={scenario.baseline.energyKWh.daily} /></strong>
            <span>kWh/day</span>
          </div>
          {primaryChange ? (
            <p>
              {parameterLabels[primaryChange.parameter] ?? primaryChange.parameter}: {primaryChange.before} {primaryChange.unit}
            </p>
          ) : null}
        </li>

        <li className="decision-flow-stage stage-what-if">
          <div className="flow-stage-heading">
            <span>02</span>
            <div><small>What-if future</small><strong>{scenario.title}</strong></div>
          </div>
          <div className="flow-stage-reading">
            <strong><AnimatedNumber value={scenario.scenario.energyKWh.daily} /></strong>
            <span>kWh/day</span>
          </div>
          <p>{primaryChange ? describeScenarioChange(primaryChange) : "Modeled context unchanged"}</p>
          <em>{describePercentageChange(scenario.impact.energyKWh.daily)}</em>
        </li>

        <li className={`decision-flow-stage stage-response ${isNeutral ? "is-neutral" : ""}`}>
          <div className="flow-stage-heading">
            <span>03</span>
            <div><small>EcoTwin response</small><strong>{isNeutral ? "Modeled plan retained" : "Recommended plan"}</strong></div>
          </div>

          {isNeutral ? (
            <div className="response-neutral-state">
              <strong>Already at modeled plan</strong>
              <p>No further modeled improvement found under the current optimization constraints.</p>
            </div>
          ) : (
            <>
              <div className="flow-stage-reading response-reading">
                <strong><AnimatedNumber value={response.optimizedResponse.energyKWh.daily} /></strong>
                <span>kWh/day</span>
              </div>
              <p className="response-outcome">{response.energyDelta.amountText}</p>
              <em>{responseBasisLabel(response)}</em>
            </>
          )}

          <div className="flow-leading-action">
            <span>{response.recommendations.length} {response.recommendations.length === 1 ? "recommendation" : "recommendations"}</span>
            <strong>{leadingRecommendation?.action ?? "No modeled action supplied"}</strong>
          </div>
        </li>
      </ol>

      <footer>
        <span aria-hidden="true">WHAT-IF</span>
        <i aria-hidden="true">→</i>
        <strong>RESPONSE</strong>
        <small>{response.comparisonBasis.label}</small>
      </footer>
    </section>
  );
}
