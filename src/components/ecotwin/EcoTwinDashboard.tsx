"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { runDecisionPipeline } from "@/lib/decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG, type ClassroomConfig } from "@/lib/simulation";
import { buildWorkspace } from "@/lib/workspace/buildWorkspace";
import { ClassroomControls } from "./ClassroomControls";
import { ClassroomTwin } from "./ClassroomTwin";
import { DecisionSnapshot } from "./DecisionSnapshot";
import { EnergyBreakdown, type BreakdownCategory } from "./EnergyBreakdown";
import { ExplanationPanel } from "./ExplanationPanel";
import { MetricCard } from "./MetricCard";
import { PeriodSelector, type Period } from "./PeriodSelector";
import { RealWorldSummary } from "./RealWorldSummary";
import { TwinJourneyRail } from "./TwinJourneyRail";
import { DecisionWorkspace } from "./workspace/DecisionWorkspace";

const values = { daily: { energy: "dailyEnergyKWh", carbon: "dailyCO2Kg", cost: "dailyCost", label: "per day" }, monthly: { energy: "monthlyEnergyKWh", carbon: "monthlyCO2Kg", cost: "monthlyCost", label: "per month" }, annual: { energy: "annualEnergyKWh", carbon: "annualCO2Kg", cost: "annualCost", label: "per year" } } as const;
type FeedbackKey = keyof ClassroomConfig | "period" | "reset" | null;

const breakdownInputs: Record<BreakdownCategory, (keyof ClassroomConfig)[]> = {
  HVAC: ["roomAreaM2", "occupants", "outsideTemperatureC", "thermostatTemperatureC", "operatingHoursPerDay", "hvacEnabled"],
  Devices: ["operatingHoursPerDay", "devicePowerW", "devicesEnabled"],
  Lighting: ["roomAreaM2", "operatingHoursPerDay", "lightingLevelPercent", "lightingPowerDensityWPerM2", "lightsEnabled"],
};

const scoreInputs: (keyof ClassroomConfig)[] = ["roomAreaM2", "occupants", "outsideTemperatureC", "thermostatTemperatureC", "lightingLevelPercent", "lightingPowerDensityWPerM2", "devicePowerW", "hvacEnabled", "lightsEnabled", "devicesEnabled"];

export function EcoTwinDashboard() {
  const [config, setConfig] = useState<ClassroomConfig>(DEFAULT_CLASSROOM_CONFIG);
  const [period, setPeriod] = useState<Period>("daily");
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
  const current = values[period];
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
  const reset = () => {
    setCausalFocus(null);
    setConfig(DEFAULT_CLASSROOM_CONFIG);
    triggerFeedback("reset");
  };

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  const periodSpecificKey = period === "monthly" ? "operatingDaysPerMonth" : period === "annual" ? "operatingDaysPerYear" : null;
  const coreMetricsChanged = feedback.key === "period" || feedback.key === "reset" || (periodSpecificKey !== null && feedback.key === periodSpecificKey) || (feedback.key !== null && feedback.key !== "operatingDaysPerMonth" && feedback.key !== "operatingDaysPerYear");
  const scoreChanged = feedback.key === "reset" || (feedback.key !== null && feedback.key !== "period" && scoreInputs.includes(feedback.key));
  const highlightedItems = feedback.key === "reset"
    ? (Object.keys(breakdownInputs) as BreakdownCategory[])
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
        <RealWorldSummary config={config} result={result} />
        <div className="twin-system">
          <ClassroomTwin config={config} result={result} highlightedItems={highlightedItems} causalFocus={causalFocus} feedbackKey={feedback.key} feedbackToken={feedback.token} />
        </div>
        <DecisionSnapshot model={workspace} />
      </section>

      <section className="simulation-instruments" aria-labelledby="simulation-instruments-title">
        <header className="instrument-header">
          <div><span className="eyebrow">Simulation instruments</span><h2 id="simulation-instruments-title">Modeled footprint</h2></div>
          <PeriodSelector period={period} onChange={updatePeriod} />
        </header>
        <div className="metrics-grid" aria-label="Core impact metrics">
          <MetricCard label="MODELED ENERGY" value={result[current.energy]} unit="kWh" detail={current.label} tone="energy" classification="Primary output" feedback={coreMetricsChanged} />
          <section className="derived-metrics" aria-labelledby="derived-metrics-title">
            <div className="derived-metrics-heading"><span id="derived-metrics-title">Derived consequences</span><small>Calculated from modeled energy</small></div>
            <div className="derived-metrics-row">
              <MetricCard label="CO₂" value={result[current.carbon]} unit="kg" detail={current.label} tone="carbon" feedback={coreMetricsChanged} />
              <MetricCard label="COST" value={result[current.cost]} maximumFractionDigits={2} prefix="$" unit="USD" detail={current.label} tone="cost" feedback={coreMetricsChanged} />
            </div>
          </section>
          <MetricCard label="EFFICIENCY" value={result.ecoScore} maximumFractionDigits={0} unit="/ 100" detail="Supporting indicator" tone="score" classification="Heuristic" feedback={scoreChanged} />
        </div>
        <EnergyBreakdown result={result} highlightedItems={highlightedItems} feedbackToken={feedback.token} />
      </section>

      <ClassroomControls config={config} onChange={update} onReset={reset} />
      <ExplanationPanel result={result} />
      <DecisionWorkspace model={workspace} onTwinFocusChange={setCausalFocus} />
      <footer>EcoTwin results are modeled estimates for classroom decision-making.</footer>
    </main>
  );
}
