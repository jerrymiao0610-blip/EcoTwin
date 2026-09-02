import { describe, expect, it } from "vitest";
import { createEnvironmentalSnapshot } from "../environment";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import {
  calculateHumidityAwareHvac,
  DEFAULT_HUMIDITY_AWARE_HVAC_ASSUMPTIONS,
} from ".";

const environment = (overrides: {
  indoorTemperatureC?: number;
  indoorRh?: number;
  outdoorTemperatureC?: number;
  outdoorRh?: number;
  targetTemperatureC?: number;
  targetRh?: number;
} = {}) => createEnvironmentalSnapshot({
  indoorObservation: {
    temperatureC: overrides.indoorTemperatureC ?? 25.8,
    relativeHumidityPercent: overrides.indoorRh ?? 44,
    timestamp: "2026-09-01T04:00:00.000Z",
    source: "edge-node",
  },
  outdoorObservation: {
    temperatureC: overrides.outdoorTemperatureC ?? 32,
    relativeHumidityPercent: overrides.outdoorRh ?? 70,
    pressureKPa: 101.325,
    timestamp: "2026-09-01T04:00:00.000Z",
    source: "open-meteo",
  },
  targets: {
    temperatureC: overrides.targetTemperatureC ?? 24,
    relativeHumidityPercent: overrides.targetRh ?? 50,
  },
});

const calculate = (
  env = environment(),
  config = DEFAULT_CLASSROOM_CONFIG,
) => calculateHumidityAwareHvac({ config, environment: env });

describe("calculateHumidityAwareHvac", () => {
  it("uses separate envelope, ventilation, infiltration, and occupant terms", () => {
    const result = calculate();

    expect(result.envelopeTransmissionLoadW).toBeCloseTo(5_760);
    expect(result.ventilationAirFlowM3PerSecond).toBeCloseTo(0.186);
    expect(result.infiltrationAirFlowM3PerSecond).toBeCloseTo(0.015);
    expect(result.dryAirMassFlowKgPerSecond).toBeCloseTo(0.2412);
    expect(result.outdoorAirSensibleLoadW).toBeCloseTo(1_939.248);
    expect(result.occupantSensibleLoadW).toBe(2_250);
  });

  it("uses cooling-positive signs for cooling, heating, and balanced states", () => {
    const cooling = calculate(environment({ outdoorTemperatureC: 32 }));
    const heating = calculate(
      environment({ indoorTemperatureC: 24, outdoorTemperatureC: 0, outdoorRh: 40 }),
      { ...DEFAULT_CLASSROOM_CONFIG, occupants: 0 },
    );
    const balancedConfig = { ...DEFAULT_CLASSROOM_CONFIG, occupants: 0 };
    const balanced = calculate(
      environment({ indoorTemperatureC: 24, outdoorTemperatureC: 24, outdoorRh: 50 }),
      balancedConfig,
    );

    expect(cooling.netOperatingSensibleLoadW).toBeGreaterThan(0);
    expect(cooling.sensibleCoolingEnergyKWhThermal).toBeGreaterThan(0);
    expect(heating.netOperatingSensibleLoadW).toBeLessThan(0);
    expect(heating.sensibleHeatingEnergyKWhThermal).toBeGreaterThan(0);
    expect(balanced.netOperatingSensibleLoadW).toBeCloseTo(0);
    expect(balanced.sensibleCoolingEnergyKWhThermal).toBe(0);
    expect(balanced.sensibleHeatingEnergyKWhThermal).toBe(0);
  });

  it("uses indoor temperature only for the one-time recovery term", () => {
    expect(calculate(environment({ indoorTemperatureC: 24 })).stateRecoveryEnergyKWhThermal).toBe(0);
    expect(calculate(environment({ indoorTemperatureC: 25.8 })).stateRecoveryEnergyKWhThermal).toBeCloseTo(4.95);
    expect(calculate(environment({ indoorTemperatureC: 22 })).stateRecoveryEnergyKWhThermal).toBeCloseTo(-5.5);
  });

  it("adds humid outdoor air, high indoor RH, and occupant moisture", () => {
    const humid = calculate(environment({ indoorRh: 75, outdoorRh: 85 }));
    const dry = calculate(environment({ indoorRh: 25, outdoorRh: 20 }));

    expect(humid.initialZoneMoistureDifferenceKg).toBeGreaterThan(0);
    expect(humid.outdoorAirMoistureDifferenceKg).toBeGreaterThan(0);
    expect(humid.occupantMoistureGenerationKg).toBeCloseTo(14.4);
    expect(humid.moistureRemovedKg).toBeGreaterThan(0);
    expect(dry.moistureDeficitKg).toBeGreaterThanOrEqual(0);
    expect(dry.latentElectricityKWh).toBeGreaterThanOrEqual(0);
  });

  it("keeps moisture generation unit-consistent between hours and seconds", () => {
    const hourly = calculate();
    const assumptions = {
      ...DEFAULT_HUMIDITY_AWARE_HVAC_ASSUMPTIONS,
      occupantMoistureKgPerPersonHour:
        DEFAULT_HUMIDITY_AWARE_HVAC_ASSUMPTIONS.occupantMoistureKgPerPersonHour,
    };
    const direct = assumptions.occupantMoistureKgPerPersonHour * 30 * 8;
    const converted =
      (assumptions.occupantMoistureKgPerPersonHour / 3_600) * 30 * (8 * 3_600);

    expect(hourly.occupantMoistureGenerationKg).toBeCloseTo(direct);
    expect(hourly.occupantMoistureGenerationKg).toBeCloseTo(converted);
  });

  it("never turns a moisture deficit into negative latent energy savings", () => {
    const result = calculate(
      environment({ indoorRh: 0, outdoorRh: 0 }),
      { ...DEFAULT_CLASSROOM_CONFIG, occupants: 0 },
    );

    expect(result.moistureDeficitKg).toBeGreaterThan(0);
    expect(result.moistureRemovedKg).toBe(0);
    expect(result.latentEnergyKWhThermal).toBe(0);
    expect(result.latentElectricityKWh).toBe(0);
  });

  it("does not net latent dehumidification against heating", () => {
    const result = calculate(
      environment({ indoorTemperatureC: 24, indoorRh: 100, outdoorTemperatureC: 20, outdoorRh: 100 }),
      { ...DEFAULT_CLASSROOM_CONFIG, occupants: 0 },
    );

    expect(result.sensibleHeatingElectricityKWh).toBeGreaterThan(0);
    expect(result.latentElectricityKWh).toBeGreaterThan(0);
    expect(result.totalHvacElectricityKWh).toBeCloseTo(
      result.sensibleHeatingElectricityKWh + result.latentElectricityKWh,
    );
    expect(result.detailedMode).toBe("heating-and-dehumidifying");
  });

  it("reports off and no removal when HVAC is disabled", () => {
    const result = calculate(environment(), {
      ...DEFAULT_CLASSROOM_CONFIG,
      hvacEnabled: false,
    });

    expect(result.detailedMode).toBe("off");
    expect(result.totalHvacElectricityKWh).toBe(0);
    expect(result.moistureRemovedKg).toBe(0);
  });
});
