"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_CLASSROOM_CONFIG, simulateClassroomEnergy, type ClassroomConfig } from "@/lib/simulation";
import { ClassroomControls } from "./ClassroomControls";
import { ClassroomTwin } from "./ClassroomTwin";
import { EnergyBreakdown, type BreakdownCategory } from "./EnergyBreakdown";
import { ExplanationPanel } from "./ExplanationPanel";
import { MetricCard } from "./MetricCard";
import { PeriodSelector, type Period } from "./PeriodSelector";

const values = { daily: { energy: "dailyEnergyKWh", carbon: "dailyCO2Kg", cost: "dailyCost", label: "per day" }, monthly: { energy: "monthlyEnergyKWh", carbon: "monthlyCO2Kg", cost: "monthlyCost", label: "per month" }, annual: { energy: "annualEnergyKWh", carbon: "annualCO2Kg", cost: "annualCost", label: "per year" } } as const;
const format = (number: number, decimals = 1) => new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(number);
type FeedbackKey = keyof ClassroomConfig | "period" | "reset" | null;

const breakdownInputs: Record<BreakdownCategory, (keyof ClassroomConfig)[]> = {
  HVAC: ["roomAreaM2", "occupants", "outsideTemperatureC", "thermostatTemperatureC", "operatingHoursPerDay", "hvacEnabled"],
  Devices: ["operatingHoursPerDay", "devicePowerW", "devicesEnabled"],
  Lighting: ["roomAreaM2", "operatingHoursPerDay", "lightingLevelPercent", "lightingPowerDensityWPerM2", "lightsEnabled"],
};

const scoreInputs: (keyof ClassroomConfig)[] = ["occupants", "thermostatTemperatureC", "lightingLevelPercent", "lightingPowerDensityWPerM2", "devicePowerW", "hvacEnabled", "lightsEnabled", "devicesEnabled"];

export function EcoTwinDashboard() {
  const [config, setConfig] = useState<ClassroomConfig>(DEFAULT_CLASSROOM_CONFIG);
  const [period, setPeriod] = useState<Period>("daily");
  const [feedback, setFeedback] = useState<{ key: FeedbackKey; token: number }>({ key: null, token: 0 });
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const result = simulateClassroomEnergy(config);
  const current = values[period];
  const triggerFeedback = (key: Exclude<FeedbackKey, null>) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback((previous) => ({ key, token: previous.token + 1 }));
    feedbackTimer.current = setTimeout(() => setFeedback((previous) => ({ ...previous, key: null })), 560);
  };
  const update = <K extends keyof ClassroomConfig>(key: K, value: ClassroomConfig[K]) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
    triggerFeedback(key);
  };
  const updatePeriod = (nextPeriod: Period) => {
    setPeriod(nextPeriod);
    triggerFeedback("period");
  };
  const reset = () => {
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
        <div className="brand"><span className="brand-mark" aria-hidden="true">◒</span><span>EcoTwin</span></div>
        <div className="header-copy"><span className="eyebrow">Climate-Aware Campus Energy Digital Twin</span><p>Explore how everyday classroom decisions affect energy use, emissions, and operating cost.</p></div>
        <span className="education-badge">Educational energy model</span>
      </header>

      <div className="impact-heading">
        <div><span className="eyebrow">Configure → see impact</span><h1>Every classroom setting leaves an energy footprint.</h1></div>
        <PeriodSelector period={period} onChange={updatePeriod} />
      </div>

      <section className="metrics-grid" aria-label="Core impact metrics">
        <MetricCard key={`energy-${coreMetricsChanged ? feedback.token : 0}`} label="MODELED ENERGY" value={format(result[current.energy])} unit="kWh" detail={current.label} tone="energy" classification="Primary output" feedback={coreMetricsChanged} />
        <section className="derived-metrics" aria-labelledby="derived-metrics-title">
          <div className="derived-metrics-heading"><span id="derived-metrics-title">Derived consequences</span><small>Calculated from modeled energy</small></div>
          <div className="derived-metrics-row">
            <MetricCard key={`carbon-${coreMetricsChanged ? feedback.token : 0}`} label="CO₂" value={format(result[current.carbon])} unit="kg" detail={current.label} tone="carbon" feedback={coreMetricsChanged} />
            <MetricCard key={`cost-${coreMetricsChanged ? feedback.token : 0}`} label="COST" value={`$${format(result[current.cost], 2)}`} unit="USD" detail={current.label} tone="cost" feedback={coreMetricsChanged} />
          </div>
        </section>
        <MetricCard key={`score-${scoreChanged ? feedback.token : 0}`} label="EFFICIENCY" value={format(result.ecoScore, 0)} unit="/ 100" detail="Supporting indicator" tone="score" classification="Heuristic" feedback={scoreChanged} />
      </section>

      <div className="simulation-route" aria-label="Configure classroom inputs, observe the live classroom twin, then understand modeled energy, carbon, and cost">
        <span className="route-stage"><b>01</b><span><small>Configure</small>Classroom inputs</span></span>
        <span className="route-link" aria-hidden="true">updates live <i>→</i></span>
        <span className="route-stage"><b>02</b><span><small>Observe</small>Classroom twin</span></span>
        <span className="route-link" aria-hidden="true">produces <i>→</i></span>
        <span className="route-stage"><b>03</b><span><small>Understand</small>Energy → CO₂ + cost</span></span>
      </div>

      <div className="dashboard-grid">
        <ClassroomControls config={config} onChange={update} onReset={reset} />
        <div className="twin-system">
          <ClassroomTwin config={config} result={result} highlightedItems={highlightedItems} feedbackKey={feedback.key} feedbackToken={feedback.token} />
          <EnergyBreakdown result={result} highlightedItems={highlightedItems} feedbackToken={feedback.token} />
        </div>
      </div>
      <ExplanationPanel result={result} />
      <footer>EcoTwin results are modelled estimates for classroom decision-making.</footer>
    </main>
  );
}
