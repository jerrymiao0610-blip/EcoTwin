import type { TwinSystemFocus } from "../ClassroomTwin";
import type { ScenarioResponseModel } from "@/lib/workspace/scenarioResponseTypes";
import { AnimatedNumber } from "../AnimatedNumber";
import { RecommendationCard } from "../workspace/RecommendationCard";
import {
  componentLabel,
  describeImpactChange,
} from "./scenarioPresentation";

interface ScenarioResponseEvidenceProps {
  model: Readonly<ScenarioResponseModel>;
  onTwinFocusChange?: (system: TwinSystemFocus | null) => void;
}

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

const responseParameterLabels: Readonly<Record<string, string>> = {
  thermostatTemperatureC: "Thermostat",
  lightingLevelPercent: "Lighting level",
  devicePowerW: "Device allowance",
};

/** Complete trace for the scenario-specific DecisionPackage presentation model. */
export function ScenarioResponseEvidence({
  model,
  onTwinFocusChange,
}: ScenarioResponseEvidenceProps) {
  const source = model.evidence.sourceScenario;
  const responseChanges = model.recommendations.flatMap((recommendation) =>
    recommendation.parameterChange ? [recommendation.parameterChange] : [],
  );

  return (
    <section className="scenario-response-evidence" aria-labelledby="scenario-response-evidence-title">
      <header>
        <div>
          <span className="eyebrow">Detailed response evidence</span>
          <h2 id="scenario-response-evidence-title">How the scenario-specific plan was produced</h2>
          <p>{model.comparisonBasis.label}. Every action below comes from the scenario-specific decision package.</p>
        </div>
        <span className="scenario-source-id">SOURCE · {source.scenarioDefinition.id}</span>
      </header>

      <div className="response-evidence-grid">
        <section aria-labelledby="response-comparison-title">
          <h3 id="response-comparison-title">Scenario baseline → response</h3>
          <div className="response-evidence-comparison">
            <div>
              <span>Scenario without response</span>
              <strong><AnimatedNumber value={model.scenarioBaseline.energyKWh.daily} /> <small>kWh/day</small></strong>
            </div>
            <i aria-hidden="true">→</i>
            <div>
              <span>EcoTwin response</span>
              <strong><AnimatedNumber value={model.optimizedResponse.energyKWh.daily} /> <small>kWh/day</small></strong>
            </div>
          </div>
          <ul className="response-change-list">
            {responseChanges.length ? responseChanges.map((change) => (
              <li key={change.parameter}>
                <span>{responseParameterLabels[change.parameter] ?? change.parameter}</span>
                <strong>{formatNumber(change.before)} {change.unit} → {formatNumber(change.after)} {change.unit}</strong>
              </li>
            )) : (
              <li><span>Plan controls</span><strong>Unchanged</strong></li>
            )}
          </ul>
        </section>

        <section aria-labelledby="response-impact-title">
          <h3 id="response-impact-title">Modeled impact</h3>
          <dl className="response-impact-list">
            <div><dt>Daily energy</dt><dd>{describeImpactChange(model.impact.energyKWh.daily, "kWh")}</dd></div>
            <div><dt>Daily CO₂</dt><dd>{describeImpactChange(model.impact.co2Kg.daily, "kg")}</dd></div>
            <div><dt>Daily cost</dt><dd>{describeImpactChange(model.impact.cost.daily, "$")}</dd></div>
            <div><dt>Annual energy</dt><dd>{describeImpactChange(model.annualImpact.energyKWh, "kWh")}</dd></div>
            <div><dt>Annual CO₂</dt><dd>{describeImpactChange(model.annualImpact.co2Kg, "kg")}</dd></div>
            <div><dt>Annual cost</dt><dd>{describeImpactChange(model.annualImpact.cost, "$")}</dd></div>
          </dl>
        </section>

        <section aria-labelledby="response-components-title">
          <h3 id="response-components-title">Component contribution</h3>
          <dl className="response-component-list">
            {model.impact.components.map((component) => (
              <div key={component.component}>
                <dt>{componentLabel(component.component)}</dt>
                <dd>{describeImpactChange(component.energyKWh, "kWh/day")}</dd>
                <small>{formatNumber(component.contributionPercent, 0)}% of gross component change</small>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="response-trace-title">
          <h3 id="response-trace-title">Optimizer trace</h3>
          <dl className="response-trace-list">
            <div><dt>Pipeline</dt><dd>Version {model.evidence.pipeline.version}</dd></div>
            <div><dt>Search evidence</dt><dd>{formatNumber(model.evidence.pipeline.optimizerSearchSpaceSize, 0)} feasible configurations</dd></div>
            <div><dt>Changed controls</dt><dd>{model.evidence.pipeline.changedParameterCount}</dd></div>
            <div><dt>Recommendations</dt><dd>{model.evidence.pipeline.recommendationCount}</dd></div>
          </dl>
        </section>
      </div>

      <section className="response-recommendations" aria-labelledby="response-recommendations-title">
        <div className="workspace-section-heading">
          <span className="workspace-section-number">05</span>
          <div>
            <span className="eyebrow">Scenario-specific recommendations</span>
            <h3 id="response-recommendations-title">Actions for {model.scenarioTitle}</h3>
          </div>
        </div>
        <div className="recommendation-list">
          {model.recommendations.map((recommendation, index) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              sequence={index + 1}
              focusable
              onTwinFocusChange={onTwinFocusChange}
            />
          ))}
        </div>
      </section>

      <footer className="response-evidence-footer">
        <div>
          <span>Model assumptions</span>
          <p>
            Scenario baseline: HVAC COP <b>{model.evidence.baselineAssumptions.hvacCop}</b> · Thermal load <b>{model.evidence.baselineAssumptions.thermalLoadWPerM2PerC} W/m²/°C</b> · Occupant gain <b>{model.evidence.baselineAssumptions.occupantHeatGainW} W</b>
          </p>
          <small>Optimized response uses the same deterministic simulation assumptions.</small>
        </div>
        <div className="response-warning" role="note">
          <strong>Evidence note</strong>
          <span>{model.warnings.length ? model.warnings.join(" · ") : "No scenario response warnings."}</span>
        </div>
      </footer>
    </section>
  );
}
