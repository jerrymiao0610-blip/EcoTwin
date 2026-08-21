"use client";

import { useState } from "react";
import { DEFAULT_CLASSROOM_CONFIG, simulateClassroomEnergy, type ClassroomConfig } from "@/lib/simulation";
import { ClassroomControls } from "./ClassroomControls";
import { ClassroomTwin } from "./ClassroomTwin";
import { EnergyBreakdown } from "./EnergyBreakdown";
import { ExplanationPanel } from "./ExplanationPanel";
import { MetricCard } from "./MetricCard";
import { PeriodSelector, type Period } from "./PeriodSelector";

const values = { daily: { energy: "dailyEnergyKWh", carbon: "dailyCO2Kg", cost: "dailyCost", label: "per day" }, monthly: { energy: "monthlyEnergyKWh", carbon: "monthlyCO2Kg", cost: "monthlyCost", label: "per month" }, annual: { energy: "annualEnergyKWh", carbon: "annualCO2Kg", cost: "annualCost", label: "per year" } } as const;
const format = (number: number, decimals = 1) => new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(number);

export function EcoTwinDashboard() {
  const [config, setConfig] = useState<ClassroomConfig>(DEFAULT_CLASSROOM_CONFIG);
  const [period, setPeriod] = useState<Period>("daily");
  const result = simulateClassroomEnergy(config);
  const current = values[period];
  const update = <K extends keyof ClassroomConfig>(key: K, value: ClassroomConfig[K]) => setConfig((previous) => ({ ...previous, [key]: value }));
  return <main className="dashboard-shell"><header className="dashboard-header"><div className="brand"><span className="brand-mark">◒</span><span>EcoTwin</span></div><div className="header-copy"><span className="eyebrow">Climate-Aware Campus Energy Digital Twin</span><p>Explore how everyday classroom decisions affect energy use, emissions, and operating cost.</p></div><span className="education-badge">Educational energy model</span></header>
    <div className="impact-heading"><div><span className="eyebrow">Configure → see impact</span><h1>Every classroom setting leaves an energy footprint.</h1></div><PeriodSelector period={period} onChange={setPeriod} /></div>
    <section className="metrics-grid" aria-label="Core impact metrics"><MetricCard label="ENERGY" value={format(result[current.energy])} unit="kWh" detail={current.label} tone="energy" /><MetricCard label="CO₂" value={format(result[current.carbon])} unit="kg" detail={current.label} tone="carbon" /><MetricCard label="COST" value={`$${format(result[current.cost], 2)}`} unit="USD" detail={current.label} tone="cost" /><MetricCard label="ECO SCORE" value={format(result.ecoScore, 0)} unit="/100" detail="user-controllable efficiency" tone="score" /></section>
    <div className="impact-flow" aria-label="Classroom settings lead to energy use, carbon emissions, and cost"><span>CLASSROOM SETTINGS</span><i>→</i><span>ENERGY USE</span><i>→</i><span>CO₂ + COST</span></div>
    <div className="dashboard-grid"><ClassroomControls config={config} onChange={update} onReset={() => setConfig(DEFAULT_CLASSROOM_CONFIG)} /><div className="visual-column"><ClassroomTwin config={config} /><EnergyBreakdown result={result} /></div></div><ExplanationPanel result={result} /><footer>EcoTwin results are modelled estimates for classroom decision-making.</footer>
  </main>;
}
