import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createEnvironmentalSnapshot } from "../../../lib/environment";
import { DEFAULT_CLASSROOM_CONFIG } from "../../../lib/simulation";
import { simulateSensorInformedClassroomEnergy } from "../../../lib/sensor-simulation";
import { MetricCard } from "../MetricCard";
import { PeriodSelector } from "../PeriodSelector";
import { SensorInformedEstimate } from "./SensorInformedEstimate";

const result = simulateSensorInformedClassroomEnergy(
  DEFAULT_CLASSROOM_CONFIG,
  createEnvironmentalSnapshot({
    indoorObservation: {
      temperatureC: 25.8,
      relativeHumidityPercent: 44,
      timestamp: "2026-09-01T04:00:00.000Z",
      source: "edge-node",
    },
    outdoorObservation: {
      temperatureC: 32,
      relativeHumidityPercent: 70,
      pressureKPa: 100.8,
      timestamp: "2026-09-01T04:00:00.000Z",
      source: "open-meteo",
    },
    targets: { temperatureC: 24, relativeHumidityPercent: 50 },
  }),
);

describe("SensorInformedEstimate", () => {
  const renderEstimate = (overrides?: Partial<{
    active: boolean;
    stale: boolean;
    warning: string | null;
  }>) => renderToStaticMarkup(
    <SensorInformedEstimate
      result={result}
      active={overrides?.active ?? true}
      stale={overrides?.stale ?? false}
      warning={overrides?.warning ?? null}
      operatingHoursPerDay={DEFAULT_CLASSROOM_CONFIG.operatingHoursPerDay}
      operatingDaysPerMonth={DEFAULT_CLASSROOM_CONFIG.operatingDaysPerMonth}
      operatingDaysPerYear={DEFAULT_CLASSROOM_CONFIG.operatingDaysPerYear}
    />,
  );

  it("labels the daily result as a current-condition sensor-informed estimate", () => {
    const html = renderEstimate();

    expect(html).toContain("SENSOR-INFORMED MODELED ESTIMATE");
    expect(html).toContain(
      "Current-condition 8-hour scenario using the measured indoor observation and current outdoor environmental context.",
    );
    expect(html).toContain("SENSOR-INFORMED MODE · ACTIVE");
    expect(html).toContain("MEASURED INDOOR OBSERVATION · EDGE NODE");
    expect(html).toContain("25.8°C");
    expect(html).toContain("44% RH");
    expect(html).toContain("OUTDOOR ENVIRONMENTAL CONTEXT · OPEN-METEO");
    expect(html).toContain("TARGET");
    expect(html).toContain("50% RH");
    expect(html).toContain("Latent / dehumidification");
    expect(html).toContain("Modeled moisture removal");
    expect(html).toContain("not a utility-meter reading");
    expect(html).toContain("not utility-meter measurements");
  });

  it("moves monthly and annual values into illustrative extrapolation", () => {
    const html = renderEstimate();

    expect(html).toContain("ILLUSTRATIVE EXTRAPOLATION");
    expect(html).toContain("Same-condition extrapolation · 22 operating days");
    expect(html).toContain("Same-condition extrapolation · 250 operating days");
    expect(html).toContain(result.monthlyEnergyKWh.toFixed(2));
    expect(html).toContain(result.annualEnergyKWh.toFixed(2));
    expect(html).toContain(
      "Assumes the same outdoor conditions and starting indoor state recur on every modeled operating day.",
    );
    expect(html).toContain(
      "These values are scenario extrapolations, not weather-normalized forecasts.",
    );
  });

  it("shows state-recovery, humidity, and educational airflow assumptions", () => {
    const html = renderEstimate();

    expect(html).toContain("Initial indoor state recovery");
    expect(html).toContain(
      "This term represents the modeled energy required to move the currently measured indoor temperature toward the thermostat target once during the daily scenario.",
    );
    expect(html).toContain(
      "Monthly and annual extrapolations assume the same starting indoor state recurs on every operating day.",
    );
    expect(html).toContain(
      "Under humid outdoor conditions, ventilation can dominate dehumidification load even when indoor relative humidity is currently near target.",
    );
    expect(html).toContain("Educational ventilation modeling assumptions");
    expect(html).toContain("5 L/s-person");
    expect(html).toContain("0.6 L/s-m²");
    expect(html).toContain("0.3 ACH infiltration");
    expect(html).toContain("Continuous over the modeled operating period");
    expect(html).toContain("not measured airflow values or code-compliance claims");
  });

  it("does not use prohibited consumption claims or present extrapolations as forecasts", () => {
    const html = renderEstimate();

    expect(html).not.toMatch(/actual consumption/i);
    expect(html).not.toMatch(/real energy consumption/i);
    expect(html).not.toMatch(/predicted utility usage/i);
    expect(html).not.toMatch(/measured HVAC load/i);
    expect(html).not.toMatch(/exact energy use/i);
    expect(html).not.toMatch(/monthly forecast|annual forecast|forecast consumption/i);
  });

  it("renders presentation without changing any physical result", () => {
    const numericalResultBeforeRender = {
      dailyEnergyKWh: result.dailyEnergyKWh,
      monthlyEnergyKWh: result.monthlyEnergyKWh,
      annualEnergyKWh: result.annualEnergyKWh,
      stateRecoveryEnergyKWhThermal: result.hvac.stateRecoveryEnergyKWhThermal,
      latentHvacElectricityKWh: result.latentHvacElectricityKWh,
      moistureRemovedKg: result.hvac.moistureRemovedKg,
    };

    renderEstimate();

    expect({
      dailyEnergyKWh: result.dailyEnergyKWh,
      monthlyEnergyKWh: result.monthlyEnergyKWh,
      annualEnergyKWh: result.annualEnergyKWh,
      stateRecoveryEnergyKWhThermal: result.hvac.stateRecoveryEnergyKWhThermal,
      latentHvacElectricityKWh: result.latentHvacElectricityKWh,
      moistureRemovedKg: result.hvac.moistureRemovedKg,
    }).toEqual(numericalResultBeforeRender);
  });

  it("keeps the legacy/manual dashboard presentation unchanged", () => {
    const html = renderToStaticMarkup(
      <>
        <PeriodSelector period="daily" onChange={() => undefined} />
        <MetricCard
          label="MODELED ENERGY"
          value={38.832}
          unit="kWh"
          detail="per day"
          tone="energy"
          classification="Primary output"
        />
      </>,
    );

    expect(html).toContain("MODELED ENERGY");
    expect(html).toContain("Primary output");
    expect(html).toContain("per day");
    expect(html).toContain("Energy, carbon, and cost period");
    expect(html).not.toContain("ILLUSTRATIVE EXTRAPOLATION");
  });

  it("retains the prior estimate and marks stale data", () => {
    const html = renderEstimate({ stale: true });

    expect(html).toContain("SENSOR DATA STALE");
    expect(html).toContain("Last estimate retained");
    expect(html).toContain(result.dailyEnergyKWh.toFixed(2));
  });

  it("labels disconnect fallback without presenting the prior estimate as active", () => {
    const html = renderEstimate({
      active: false,
      warning: "Edge Node disconnected.",
    });

    expect(html).toContain("SENSOR-INFORMED MODE · MANUAL FALLBACK");
    expect(html).toContain("Edge Node disconnected.");
  });
});
