import { describe, expect, it } from "vitest";
import { createEnvironmentalSnapshot } from "../environment";
import {
  DEFAULT_CLASSROOM_CONFIG,
  simulateClassroomEnergy,
} from "../simulation";
import { simulateSensorInformedClassroomEnergy } from ".";

const environment = createEnvironmentalSnapshot({
  indoorObservation: {
    temperatureC: 25.8,
    relativeHumidityPercent: 44,
    timestamp: "2026-09-01T04:00:00.000Z",
    source: "edge-node",
  },
  outdoorObservation: {
    temperatureC: 32,
    relativeHumidityPercent: 70,
    pressureKPa: 101.325,
    timestamp: "2026-09-01T04:00:00.000Z",
    source: "open-meteo",
  },
  targets: { temperatureC: 24, relativeHumidityPercent: 50 },
});

describe("simulateSensorInformedClassroomEnergy", () => {
  it("returns a clearly labeled, immutable sensor-informed v1 estimate", () => {
    const result = simulateSensorInformedClassroomEnergy(
      DEFAULT_CLASSROOM_CONFIG,
      environment,
    );

    expect(result.modelKind).toBe("sensor-informed-v1");
    expect(result.label).toBe("Sensor-informed modeled estimate");
    expect(result.warnings.join(" ")).toContain("not utility-meter measurements");
    expect(result.assumptions.certifiedBuildingPerformance).toBe(false);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.environment.indoorObservation)).toBe(true);
  });

  it("reuses the exact legacy lighting and device calculations", () => {
    const legacy = simulateClassroomEnergy(DEFAULT_CLASSROOM_CONFIG);
    const sensor = simulateSensorInformedClassroomEnergy(
      DEFAULT_CLASSROOM_CONFIG,
      environment,
    );

    expect(sensor.lightingEnergyKWh).toBe(legacy.lightingEnergyKWh);
    expect(sensor.deviceEnergyKWh).toBe(legacy.deviceEnergyKWh);
    expect(sensor.totalHvacElectricityKWh).toBe(
      sensor.sensibleHvacElectricityKWh + sensor.latentHvacElectricityKWh,
    );
    expect(sensor.dailyEnergyKWh).toBe(
      sensor.lightingEnergyKWh +
      sensor.deviceEnergyKWh +
      sensor.totalHvacElectricityKWh,
    );
  });

  it("scales modeled energy, CO2, and cost consistently", () => {
    const result = simulateSensorInformedClassroomEnergy(
      DEFAULT_CLASSROOM_CONFIG,
      environment,
    );

    expect(result.monthlyEnergyKWh).toBeCloseTo(result.dailyEnergyKWh * 22);
    expect(result.annualEnergyKWh).toBeCloseTo(result.dailyEnergyKWh * 250);
    expect(result.dailyCO2Kg).toBeCloseTo(result.dailyEnergyKWh * 0.45);
    expect(result.dailyCost).toBeCloseTo(result.dailyEnergyKWh * 0.15);
  });

  it("does not alter the legacy default result", () => {
    const before = simulateClassroomEnergy(DEFAULT_CLASSROOM_CONFIG);
    simulateSensorInformedClassroomEnergy(DEFAULT_CLASSROOM_CONFIG, environment);
    const after = simulateClassroomEnergy(DEFAULT_CLASSROOM_CONFIG);

    expect(after).toEqual(before);
    expect(after.netThermalLoadW).toBe(8_010);
    expect(after.hvacEnergyKWh).toBe(21.36);
    expect(after.dailyEnergyKWh).toBe(38.832);
    expect(after.ecoScore).toBe(96.5);
  });
});
