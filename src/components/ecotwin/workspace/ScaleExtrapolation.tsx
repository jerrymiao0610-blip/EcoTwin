"use client";

import { useMemo, useState } from "react";
import {
  SCALE_ROOM_PRESETS,
  SCALE_SLIDER_MAX,
  type ScaleImpactSource,
  extrapolateScale,
} from "@/lib/workspace/scaleExtrapolation";
import type { BuiltInScenarioId } from "@/lib/scenarios/types";

interface ScaleExtrapolationProps {
  annualImpact: Readonly<ScaleImpactSource>;
  scenarioId: BuiltInScenarioId;
}

const integerFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const tonnesFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

export function ScaleExtrapolation({
  annualImpact,
  scenarioId,
}: ScaleExtrapolationProps) {
  const [rooms, setRooms] = useState(50);
  const emphasizeCost = scenarioId === "eco-mode";
  const result = useMemo(
    () => extrapolateScale(annualImpact, rooms),
    [annualImpact, rooms],
  );
  const saving = result.annualEnergyKWhDelta < 0;
  const energyLabel = saving ? "kWh saved / year" : "kWh added / year";
  const co2Label = saving
    ? "tonnes CO₂ avoided / year"
    : "tonnes CO₂ added / year";
  const costLabel = saving ? "saved / year" : "added / year";

  return (
    <section
      className="scale-extrapolation"
      aria-labelledby="scale-extrapolation-title"
    >
      <header className="scale-extrapolation-header">
        <span className="eyebrow">Impact at scale</span>
        <h2 id="scale-extrapolation-title">
          If every space followed this plan
        </h2>
        <p>
          Illustrative extrapolation — assumes every space matches this
          configuration and operating schedule. Not measured building data.
        </p>
      </header>

      <div className="scale-controls">
        <input
          type="range"
          min={1}
          max={SCALE_SLIDER_MAX}
          step={1}
          value={rooms}
          onChange={(event) => setRooms(Number(event.target.value))}
          aria-label="Number of spaces"
        />
        <div className="scale-presets">
          {SCALE_ROOM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              className={rooms === preset ? "active" : ""}
              onClick={() => setRooms(preset)}
            >
              {integerFormat.format(preset)}
            </button>
          ))}
        </div>
      </div>

      <output
        className={`scale-readout${saving ? "" : " scale-added"}`}
        key={scenarioId}
        aria-live="polite"
      >
        <div className="scale-metric">
          <span className="scale-value">
            {integerFormat.format(result.rooms)}
          </span>
          <span className="scale-label">spaces</span>
        </div>
        <div className="scale-metric">
          <span className="scale-value">
            {integerFormat.format(Math.abs(result.annualEnergyKWhDelta))}
          </span>
          <span className="scale-label">{energyLabel}</span>
        </div>
        <div className="scale-metric">
          <span className="scale-value">
            {tonnesFormat.format(Math.abs(result.annualCO2KgDelta) / 1000)}
          </span>
          <span className="scale-label">{co2Label}</span>
        </div>
        <div
          className={`scale-metric scale-metric-cost${emphasizeCost ? " eco-savings-emphasized" : ""}`}
        >
          <span className="scale-value">
            ${integerFormat.format(Math.abs(result.annualCostDelta))}
          </span>
          <span className="scale-label">{costLabel}</span>
        </div>
        <div className="scale-metric">
          <span className="scale-value">
            {result.hasAvoidedCO2
              ? `≈${integerFormat.format(result.treeEquivalent)}`
              : "—"}
          </span>
          <span className="scale-label">trees / year</span>
        </div>
      </output>
    </section>
  );
}
