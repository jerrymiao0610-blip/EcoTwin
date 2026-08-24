import type { ScenarioWorkspaceModel } from "@/lib/workspace/scenarioTypes";
import { AnimatedNumber } from "../AnimatedNumber";
import {
  componentLabel,
  describeImpactChange,
  describeScenarioChange,
} from "./scenarioPresentation";

interface ScenarioEvidenceProps {
  model: Readonly<ScenarioWorkspaceModel>;
}

const parameterLabels: Record<string, string> = {
  outsideTemperatureC: "Outdoor temperature",
  occupants: "Occupancy",
  thermostatTemperatureC: "Thermostat target",
  lightingLevelPercent: "Lighting level",
  devicePowerW: "Device power",
};

export function ScenarioEvidence({ model }: ScenarioEvidenceProps) {
  const assumptions = model.evidence.scenarioAssumptions;

  return (
    <section className="scenario-evidence" aria-labelledby="scenario-evidence-title">
      <header>
        <div>
          <span className="eyebrow">Scenario evidence</span>
          <h2 id="scenario-evidence-title">What changed in the model</h2>
          <p>Traceable outputs from the existing {model.title} scenario—not a new recommendation.</p>
        </div>
        <span className="scenario-source-id">SOURCE · {model.evidence.scenarioDefinition.id}</span>
      </header>

      <div className="scenario-evidence-grid">
        <section aria-labelledby="scenario-changes-title">
          <h3 id="scenario-changes-title">Scenario changes</h3>
          <ul className="scenario-change-list">
            {model.changes.map((change) => (
              <li key={change.parameter}>
                <span>{parameterLabels[change.parameter] ?? change.parameter}</span>
                <strong>{describeScenarioChange(change)}</strong>
                <small>{change.explanation}</small>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="scenario-impact-title">
          <h3 id="scenario-impact-title">Modeled impact</h3>
          <dl className="scenario-impact-list">
            <div><dt>Energy</dt><dd><AnimatedNumber value={model.scenario.energyKWh.daily} /> kWh/day</dd><small>{describeImpactChange(model.impact.energyKWh.daily, "kWh/day")}</small></div>
            <div><dt>CO₂</dt><dd><AnimatedNumber value={model.scenario.co2Kg.daily} /> kg/day</dd><small>{describeImpactChange(model.impact.co2Kg.daily, "kg/day")}</small></div>
            <div><dt>Cost</dt><dd><AnimatedNumber value={model.scenario.cost.daily} maximumFractionDigits={2} prefix="$" />/day</dd><small>{describeImpactChange(model.impact.cost.daily, "$")}</small></div>
          </dl>
        </section>

        <section aria-labelledby="scenario-systems-title">
          <h3 id="scenario-systems-title">System evidence</h3>
          <dl className="scenario-system-list">
            {model.impact.components.map((component) => (
              <div key={component.component}>
                <dt>{componentLabel(component.component)}</dt>
                <dd><AnimatedNumber value={component.energyKWh.candidate} /> kWh/day</dd>
                <small>{describeImpactChange(component.energyKWh, "kWh/day")}</small>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <footer className="scenario-assumptions">
        <span>Model assumptions</span>
        <p>HVAC COP <b>{assumptions.hvacCop}</b> · Thermal load <b>{assumptions.thermalLoadWPerM2PerC} W/m²/°C</b> · Occupant gain <b>{assumptions.occupantHeatGainW} W</b></p>
        <small>{model.warnings.length ? model.warnings.join(" · ") : "No scenario model warnings."}</small>
      </footer>
    </section>
  );
}
