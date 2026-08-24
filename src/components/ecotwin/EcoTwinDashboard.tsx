"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runDecisionPipeline } from "@/lib/decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG, type ClassroomConfig } from "@/lib/simulation";
import { buildScenarioWorkspaceModels } from "@/lib/workspace/buildScenarioWorkspace";
import { buildWorkspace } from "@/lib/workspace/buildWorkspace";
import { ClassroomControls } from "./ClassroomControls";
import { ClassroomTwin } from "./ClassroomTwin";
import { DecisionSnapshot } from "./DecisionSnapshot";
import { EnergyBreakdown, type BreakdownCategory } from "./EnergyBreakdown";
import { ExplanationPanel } from "./ExplanationPanel";
import { MetricCard } from "./MetricCard";
import { PeriodSelector, type Period } from "./PeriodSelector";
import { ScenarioEvidence } from "./scenarios/ScenarioEvidence";
import { ScenarioSelector, type ScenarioSelectionId } from "./scenarios/ScenarioSelector";
import { ScenarioSnapshot } from "./scenarios/ScenarioSnapshot";
import { TwinJourneyRail } from "./TwinJourneyRail";
import { DecisionWorkspace } from "./workspace/DecisionWorkspace";

const periodLabels = { daily: "per day", monthly: "per month", annual: "per year" } as const;
type FeedbackKey = keyof ClassroomConfig | "period" | "reset" | "scenario" | null;

const breakdownInputs: Record<BreakdownCategory, (keyof ClassroomConfig)[]> = {
  HVAC: ["roomAreaM2", "occupants", "outsideTemperatureC", "thermostatTemperatureC", "operatingHoursPerDay", "hvacEnabled"],
  Devices: ["operatingHoursPerDay", "devicePowerW", "devicesEnabled"],
  Lighting: ["roomAreaM2", "operatingHoursPerDay", "lightingLevelPercent", "lightingPowerDensityWPerM2", "lightsEnabled"],
};

const scoreInputs: (keyof ClassroomConfig)[] = ["roomAreaM2", "occupants", "outsideTemperatureC", "thermostatTemperatureC", "lightingLevelPercent", "lightingPowerDensityWPerM2", "devicePowerW", "hvacEnabled", "lightsEnabled", "devicesEnabled"];

export function EcoTwinDashboard() {
  const [config, setConfig] = useState<ClassroomConfig>(DEFAULT_CLASSROOM_CONFIG);
  const [period, setPeriod] = useState<Period>("daily");
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioSelectionId>("current");
  const [feedback, setFeedback] = useState<{ key: FeedbackKey; token: number }>({ key: null, token: 0 });
  const [causalFocus, setCausalFocus] = useState<BreakdownCategory | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { result, workspace } = useMemo(() => {
    const decision = runDecisionPipeline(config);

    return {
      result: decision.baselineSimulation,
      workspace: buildWorkspace(decision),
    };
  }, [config]);
  const scenarioModels = useMemo(() => buildScenarioWorkspaceModels(config), [config]);
  const activeScenario = selectedScenarioId === "current"
    ? null
    : scenarioModels.find((model) => model.id === selectedScenarioId) ?? null;
  const activeSummary = activeScenario?.scenario ?? workspace.baseline;
  const activeConfig = activeSummary.configuration;
  const activeTwinResult = {
    dailyEnergyKWh: activeSummary.energyKWh.daily,
    hvacEnergyKWh: activeSummary.dailyEnergyByComponent.hvacKWh,
    lightingEnergyKWh: activeSummary.dailyEnergyByComponent.lightingKWh,
    deviceEnergyKWh: activeSummary.dailyEnergyByComponent.devicesKWh,
    hvacMode: activeSummary.hvacMode,
  };
  const triggerFeedback = (key: Exclude<FeedbackKey, null>) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback((previous) => ({ key, token: previous.token + 1 }));
    feedbackTimer.current = setTimeout(() => setFeedback((previous) => ({ ...previous, key: null })), 560);
  };
  const update = <K extends keyof ClassroomConfig>(key: K, value: ClassroomConfig[K]) => {
    setCausalFocus(null);
    setConfig((previous) => ({ ...previous, [key]: value }));
    triggerFeedback(key);
  };
  const updatePeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
    triggerFeedback("period");
  };
  const selectScenario = (nextScenarioId: ScenarioSelectionId) => {
    setCausalFocus(null);
    setSelectedScenarioId(nextScenarioId);
    triggerFeedback("scenario");
  };
  const reset = () => {
    setCausalFocus(null);
    setConfig(DEFAULT_CLASSROOM_CONFIG);
    triggerFeedback("reset");
  };

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const periodSpecificKey = period === "monthly" ? "operatingDaysPerMonth" : period === "annual" ? "operatingDaysPerYear" : null;
  const coreMetricsChanged = feedback.key === "period" || feedback.key === "reset" || feedback.key === "scenario" || (periodSpecificKey !== null && feedback.key === periodSpecificKey) || (feedback.key !== null && feedback.key !== "operatingDaysPerMonth" && feedback.key !== "operatingDaysPerYear");
  const scoreChanged = feedback.key === "reset" || feedback.key === "scenario" || (feedback.key !== null && feedback.key !== "period" && scoreInputs.includes(feedback.key));
  const scenarioHighlightedItems = activeScenario && feedback.key === "scenario"
    ? activeScenario.impact.components
        .filter((component) => component.energyKWh.difference !== 0)
        .map((component) => component.component === "hvac" ? "HVAC" : component.component === "lighting" ? "Lighting" : "Devices") as BreakdownCategory[]
    : [];
  const highlightedItems = feedback.key === "reset"
    ? (Object.keys(breakdownInputs) as BreakdownCategory[])
    : feedback.key === "scenario"
      ? scenarioHighlightedItems
    : feedback.key && feedback.key !== "period"
      ? (Object.entries(breakdownInputs).filter(([, keys]) => keys.includes(feedback.key as keyof ClassroomConfig)).map(([label]) => label) as BreakdownCategory[])
      : [];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true">◒</span><h1>EcoTwin</h1></div>
        <div className="header-copy"><span className="eyebrow">Explainable energy decision twin</span><p>See the classroom, simulate its footprint, and turn modeled evidence into a practical plan.</p></div>
        <span className="education-badge">Educational energy model</span>
      </header>

      <TwinJourneyRail />

      <section className="mission-stage" aria-label="Classroom digital twin mission view">
        <ScenarioSelector baseline={config} models={scenarioModels} selectedId={selectedScenarioId} onChange={selectScenario} />
        <div className="twin-system">
          <ClassroomTwin config={activeConfig} result={activeTwinResult} highlightedItems={highlightedItems} causalFocus={activeScenario ? null : causalFocus} feedbackKey={feedback.key} feedbackToken={feedback.token} scenarioTitle={activeScenario?.title ?? null} />
        </div>
        {activeScenario ? <ScenarioSnapshot model={activeScenario} /> : <DecisionSnapshot model={workspace} />}
      </section>

      {activeScenario ? <ScenarioEvidence model={activeScenario} /> : null}

      <section className="simulation-instruments" aria-labelledby="simulation-instruments-title">
        <header className="instrument-header">
          <div><span className="eyebrow">{activeScenario ? `${activeScenario.title} instruments` : "Simulation instruments"}</span><h2 id="simulation-instruments-title">Modeled footprint</h2></div>
          <PeriodSelector period={period} onChange={updatePeriod} />
        </header>
        <div className="metrics-grid" aria-label="Core impact metrics">
          <MetricCard label="MODELED ENERGY" value={activeSummary.energyKWh[period]} unit="kWh" detail={periodLabels[period]} tone="energy" classification="Primary output" feedback={coreMetricsChanged} />
          <section className="derived-metrics" aria-labelledby="derived-metrics-title">
            <div className="derived-metrics-heading"><span id="derived-metrics-title">Derived consequences</span><small>Calculated from modeled energy</small></div>
            <div className="derived-metrics-row">
              <MetricCard label="CO₂" value={activeSummary.co2Kg[period]} unit="kg" detail={periodLabels[period]} tone="carbon" feedback={coreMetricsChanged} />
              <MetricCard label="COST" value={activeSummary.cost[period]} maximumFractionDigits={2} prefix="$" unit="USD" detail={periodLabels[period]} tone="cost" feedback={coreMetricsChanged} />
            </div>
          </section>
          <MetricCard label="EFFICIENCY" value={activeSummary.ecoScore} maximumFractionDigits={0} unit="/ 100" detail="Supporting indicator" tone="score" classification="Heuristic" feedback={scoreChanged} />
        </div>
        <EnergyBreakdown result={activeTwinResult} highlightedItems={highlightedItems} feedbackToken={feedback.token} />
      </section>

      <ClassroomControls config={config} onChange={update} onReset={reset} contextNote={activeScenario ? `Editing the unchanged Current baseline; ${activeScenario.title} updates from these inputs.` : undefined} />
      {activeScenario ? null : <ExplanationPanel result={result} />}
      {activeScenario ? null : <DecisionWorkspace model={workspace} onTwinFocusChange={setCausalFocus} />}
      <footer>EcoTwin results are modeled estimates for classroom decision-making.</footer>
    </main>
  );
}
