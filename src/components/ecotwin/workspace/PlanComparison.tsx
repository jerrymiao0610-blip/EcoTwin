"use client";

import { useEffect, useMemo, useRef } from "react";
import type { WorkspaceModel } from "@/lib/workspace/types";
import { presentImpactDelta } from "@/lib/workspace/impactPresentation";
import { AnimatedNumber } from "../AnimatedNumber";

interface PlanComparisonProps {
  model: Readonly<WorkspaceModel>;
}

const format = (value: number, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(value);

const stateLabel = (enabled: boolean, value: string) => enabled ? value : "Off";

export function PlanComparison({ model }: PlanComparisonProps) {
  const sequenceFrame = useRef<number | null>(null);
  const comparisonGrid = useRef<HTMLDivElement>(null);
  const current = model.baseline.configuration;
  const plan = model.optimized.configuration;
  const dailyEnergy = presentImpactDelta(model.impact.energyKWh.daily.difference);
  const deltaLabel = dailyEnergy.direction === "improvement"
    ? "Energy saved"
    : dailyEnergy.direction === "degradation"
      ? "Additional energy"
      : "Energy change";
  const comparisonSignature = useMemo(
    () => JSON.stringify({
      current,
      plan,
      baseline: model.baseline.energyKWh.daily,
      optimized: model.optimized.energyKWh.daily,
      delta: model.impact.energyKWh.daily.difference,
    }),
    [current, model.baseline.energyKWh.daily, model.impact.energyKWh.daily.difference, model.optimized.energyKWh.daily, plan],
  );

  useEffect(() => {
    const grid = comparisonGrid.current;
    if (!grid) return;

    grid.classList.remove("is-sequencing");
    if (sequenceFrame.current !== null) cancelAnimationFrame(sequenceFrame.current);
    sequenceFrame.current = requestAnimationFrame(() => grid.classList.add("is-sequencing"));

    return () => {
      if (sequenceFrame.current !== null) cancelAnimationFrame(sequenceFrame.current);
      grid.classList.remove("is-sequencing");
    };
  }, [comparisonSignature]);

  return (
    <section className="plan-comparison" aria-labelledby="plan-comparison-title">
      <header>
        <span className="eyebrow">Current vs EcoTwin plan</span>
        <h3 id="plan-comparison-title">The decision, side by side</h3>
      </header>

      <div ref={comparisonGrid} className="plan-comparison-grid">
        <article className="plan-column current-plan">
          <span>Current state</span>
          <strong><AnimatedNumber value={model.baseline.energyKWh.daily} /> <small>kWh/day</small></strong>
          <dl>
            <div><dt>Thermostat</dt><dd>{stateLabel(current.hvacEnabled, `${format(current.thermostatTemperatureC)} °C`)}</dd></div>
            <div><dt>Lighting</dt><dd>{stateLabel(current.lightsEnabled, `${format(current.lightingLevelPercent, 0)}%`)}</dd></div>
            <div><dt>Devices</dt><dd>{stateLabel(current.devicesEnabled, `${format(current.devicePowerW, 0)} W`)}</dd></div>
          </dl>
        </article>

        <div
          className={`plan-delta direction-${dailyEnergy.direction}`}
          aria-label={`${deltaLabel}: ${format(dailyEnergy.magnitude)} kilowatt-hours per day`}
        >
          <span>{deltaLabel}</span>
          <strong><AnimatedNumber value={dailyEnergy.magnitude} /></strong>
          <small>kWh/day</small>
          <i aria-hidden="true">→</i>
        </div>

        <article className="plan-column ecotwin-plan">
          <span>EcoTwin plan</span>
          <strong><AnimatedNumber value={model.optimized.energyKWh.daily} /> <small>kWh/day</small></strong>
          <dl>
            <div><dt>Thermostat</dt><dd>{stateLabel(plan.hvacEnabled, `${format(plan.thermostatTemperatureC)} °C`)}</dd></div>
            <div><dt>Lighting</dt><dd>{stateLabel(plan.lightsEnabled, `${format(plan.lightingLevelPercent, 0)}%`)}</dd></div>
            <div><dt>Devices</dt><dd>{stateLabel(plan.devicesEnabled, `${format(plan.devicePowerW, 0)} W`)}</dd></div>
          </dl>
        </article>
      </div>
    </section>
  );
}
