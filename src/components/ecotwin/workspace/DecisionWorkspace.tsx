import type { WorkspaceModel } from "@/lib/workspace/types";
import { ContextBadge } from "./ContextBadge";
import { ImpactSummary } from "./ImpactSummary";
import { PlanComparison } from "./PlanComparison";
import { RecommendationCard } from "./RecommendationCard";

interface DecisionWorkspaceProps {
  model: Readonly<WorkspaceModel>;
}

const componentLabels: Readonly<
  Record<keyof WorkspaceModel["baseline"]["dailyEnergyByComponent"], string>
> = {
  hvacKWh: "HVAC",
  lightingKWh: "Lighting",
  devicesKWh: "Devices",
};

const formatNumber = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

const formatCapturedAt = (capturedAt: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(capturedAt));

/** Complete Decision Intelligence view backed only by WorkspaceModel. */
export function DecisionWorkspace({ model }: DecisionWorkspaceProps) {
  const snapshot = model.evidence.snapshotMetadata;
  const classroomName = model.classroom.name ?? "Interactive classroom";

  return (
    <section className="decision-workspace" aria-labelledby="decision-workspace-title">
      <header className="workspace-header">
        <div>
          <span className="eyebrow">Decision Intelligence</span>
          <h2 id="decision-workspace-title">
            Turn the current classroom state into an explainable action plan.
          </h2>
          <p>
            A traceable comparison of the current baseline and the best feasible
            configuration found within the model&apos;s operating constraints.
          </p>
        </div>
        <div className="workspace-status">
          <span>{classroomName}</span>
          <strong>{model.recommendations.length}</strong>
          <small>
            {model.recommendations.length === 1
              ? "recommended action"
              : "recommended actions"}
          </small>
        </div>
      </header>

      <PlanComparison model={model} />

      <section className="workspace-context" aria-labelledby="workspace-context-title">
        <div className="workspace-section-heading">
          <span className="workspace-section-number">01</span>
          <div>
            <span className="eyebrow">Real-world context</span>
            <h3 id="workspace-context-title">Conditions behind this decision</h3>
          </div>
        </div>
        <div className="context-badge-grid">
          <ContextBadge
            label="Outdoor air"
            value={`${formatNumber(model.context.outsideTemperatureC)} °C`}
            detail="External condition"
          />
          <ContextBadge
            label="Occupancy"
            value={formatNumber(model.context.occupants, 0)}
            detail="People in classroom"
          />
          <ContextBadge
            label="Daily schedule"
            value={`${formatNumber(model.context.operatingHoursPerDay)} h`}
            detail={`${formatNumber(model.context.operatingDaysPerMonth, 0)} days/month`}
          />
          <ContextBadge
            label="Electricity tariff"
            value={`$${formatNumber(model.context.electricityPricePerKWh, 2)}`}
            detail="Per kWh"
          />
          <ContextBadge
            label="Grid carbon"
            value={`${formatNumber(model.context.carbonIntensityKgPerKWh, 2)} kg`}
            detail="CO₂ per kWh"
          />
        </div>
      </section>

      <div className="workspace-decision-grid">
        <section className="baseline-summary" aria-labelledby="baseline-summary-title">
          <div className="workspace-section-heading">
            <span className="workspace-section-number">02</span>
            <div>
              <span className="eyebrow">Baseline energy</span>
              <h3 id="baseline-summary-title">Current modeled footprint</h3>
            </div>
          </div>

          <div className="baseline-primary">
            <strong>{formatNumber(model.baseline.energyKWh.daily)}</strong>
            <span>kWh / day</span>
            <small>{model.baseline.hvacMode} HVAC mode</small>
          </div>

          <dl className="baseline-periods">
            <div>
              <dt>Monthly</dt>
              <dd>{formatNumber(model.baseline.energyKWh.monthly)} kWh</dd>
            </div>
            <div>
              <dt>Annual</dt>
              <dd>{formatNumber(model.baseline.energyKWh.annual)} kWh</dd>
            </div>
            <div>
              <dt>Efficiency</dt>
              <dd>{formatNumber(model.baseline.ecoScore, 0)} / 100</dd>
            </div>
          </dl>

          <div className="baseline-components">
            <span>Daily system load</span>
            {Object.entries(model.baseline.dailyEnergyByComponent).map(
              ([component, energy]) => (
                <div key={component}>
                  <span>
                    {componentLabels[
                      component as keyof WorkspaceModel["baseline"]["dailyEnergyByComponent"]
                    ]}
                  </span>
                  <strong>{formatNumber(energy, 2)} kWh</strong>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="workspace-recommendations" aria-labelledby="recommendations-title">
          <div className="workspace-section-heading">
            <span className="workspace-section-number">03</span>
            <div>
              <span className="eyebrow">Recommended actions</span>
              <h3 id="recommendations-title">Prioritized, evidence-backed controls</h3>
            </div>
          </div>

          <div className="recommendation-list">
            {model.recommendations.map((recommendation, index) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                sequence={index + 1}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="workspace-section-heading impact-section-heading">
        <span className="workspace-section-number">04</span>
        <div>
          <span className="eyebrow">Impact summary</span>
          <h3>Baseline compared with the recommended plan</h3>
        </div>
      </div>
      <ImpactSummary model={model} />

      <section className="workspace-evidence" aria-labelledby="workspace-evidence-title">
        <div className="workspace-section-heading">
          <span className="workspace-section-number">05</span>
          <div>
            <span className="eyebrow">Provenance &amp; model information</span>
            <h3 id="workspace-evidence-title">How this result was produced</h3>
          </div>
        </div>

        <dl className="workspace-evidence-grid">
          <div>
            <dt>Decision pipeline</dt>
            <dd>Version {model.evidence.pipeline.version}</dd>
            <small>
              {formatNumber(
                model.evidence.pipeline.optimizerSearchSpaceSize,
                0,
              )}{" "}
              feasible configurations evaluated
            </small>
          </div>
          <div>
            <dt>Model assumptions</dt>
            <dd>
              COP {formatNumber(model.evidence.baselineAssumptions.hvacCop, 1)} ·{" "}
              {formatNumber(
                model.evidence.baselineAssumptions.thermalLoadWPerM2PerC,
                0,
              )}{" "}
              W/m²·°C
            </dd>
            <small>
              {formatNumber(
                model.evidence.baselineAssumptions.occupantHeatGainW,
                0,
              )}{" "}
              W occupant heat gain
            </small>
          </div>
          <div>
            <dt>Twin snapshot</dt>
            <dd>
              {snapshot
                ? `${snapshot.provenance.source}${
                    snapshot.provenance.sourceVersion
                      ? ` · ${snapshot.provenance.sourceVersion}`
                      : ""
                  }`
                : "Not attached"}
            </dd>
            <small>
              {snapshot
                ? `${formatCapturedAt(snapshot.capturedAt)} · ${snapshot.contentHash}`
                : "Workspace uses the current interactive configuration"}
            </small>
          </div>
          <div>
            <dt>Decision trace</dt>
            <dd>
              {model.evidence.pipeline.changedParameterCount} controls changed ·{" "}
              {model.evidence.pipeline.recommendationCount} actions
            </dd>
            <small>
              Impact direction: {model.evidence.pipeline.impactDirection}
            </small>
          </div>
        </dl>

        {model.warnings.length > 0 ? (
          <div className="workspace-warnings" role="note">
            <strong>Evidence note</strong>
            <ul>
              {model.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </section>
  );
}
