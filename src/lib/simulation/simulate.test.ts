import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLASSROOM_CONFIG,
  simulateClassroomEnergy,
  type ClassroomConfig,
} from ".";

const simulate = (overrides: Partial<ClassroomConfig> = {}) =>
  simulateClassroomEnergy({ ...DEFAULT_CLASSROOM_CONFIG, ...overrides });

describe("simulateClassroomEnergy", () => {
  it("preserves the default summer classroom HVAC result and reports cooling", () => {
    const result = simulate();

    expect(result.netThermalLoadW).toBeCloseTo(8_010);
    expect(result.hvacEnergyKWh).toBeCloseTo(21.36);
    expect(result.hvacMode).toBe("cooling");
    expect(result.assumptions.coolingLoadWPerM2PerC).toBe(
      result.assumptions.thermalLoadWPerM2PerC,
    );
  });

  it("returns zero energy when every system is disabled", () => {
    const result = simulate({
      hvacEnabled: false,
      lightsEnabled: false,
      devicesEnabled: false,
    });

    expect(result.lightingEnergyKWh).toBeCloseTo(0);
    expect(result.deviceEnergyKWh).toBeCloseTo(0);
    expect(result.hvacEnergyKWh).toBeCloseTo(0);
    expect(result.hvacMode).toBe("off");
    expect(result.dailyEnergyKWh).toBeCloseTo(0);
  });

  it("reports heating and distinct loads for meaningfully different winter conditions", () => {
    const colder = simulate({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 16,
    });
    const warmer = simulate({
      outsideTemperatureC: -4,
      thermostatTemperatureC: 18,
    });

    expect(colder.hvacMode).toBe("heating");
    expect(warmer.hvacMode).toBe("heating");
    expect(colder.hvacEnergyKWh).toBeCloseTo(43.92);
    expect(warmer.hvacEnergyKWh).toBeCloseTo(36.24);
    expect(colder.hvacEnergyKWh).toBeGreaterThan(warmer.hvacEnergyKWh);
  });

  it("reports idle when occupant heat balances the envelope load", () => {
    const result = simulate({
      outsideTemperatureC: 20.875,
      thermostatTemperatureC: 24,
    });

    expect(result.netThermalLoadW).toBeCloseTo(0);
    expect(result.hvacEnergyKWh).toBeCloseTo(0);
    expect(result.hvacMode).toBe("idle");
  });

  it("reports off and consumes no HVAC electricity when HVAC is disabled", () => {
    const result = simulate({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 16,
      hvacEnabled: false,
    });

    expect(result.netThermalLoadW).toBeLessThan(0);
    expect(result.hvacEnergyKWh).toBe(0);
    expect(result.hvacMode).toBe("off");
  });

  it("uses more lighting energy at a higher lighting level", () => {
    const dimmed = simulate({ lightingLevelPercent: 40 });
    const bright = simulate({ lightingLevelPercent: 90 });

    expect(bright.lightingEnergyKWh).toBeGreaterThan(dimmed.lightingEnergyKWh);
  });

  it("uses more total energy with more operating hours", () => {
    const shortDay = simulate({ operatingHoursPerDay: 4 });
    const longDay = simulate({ operatingHoursPerDay: 9 });

    expect(longDay.dailyEnergyKWh).toBeGreaterThan(shortDay.dailyEnergyKWh);
  });

  it("uses the configured operating days for monthly energy, CO2, and cost", () => {
    const result = simulate({ operatingDaysPerMonth: 18 });

    expect(result.monthlyEnergyKWh).toBeCloseTo(result.dailyEnergyKWh * 18);
    expect(result.monthlyCO2Kg).toBeCloseTo(result.dailyCO2Kg * 18);
    expect(result.monthlyCost).toBeCloseTo(result.dailyCost * 18);
  });

  it("uses the configured operating days for annual energy, CO2, and cost", () => {
    const result = simulate({ operatingDaysPerYear: 210 });

    expect(result.annualEnergyKWh).toBeCloseTo(result.dailyEnergyKWh * 210);
    expect(result.annualCO2Kg).toBeCloseTo(result.dailyCO2Kg * 210);
    expect(result.annualCost).toBeCloseTo(result.dailyCost * 210);
  });

  it("uses more HVAC energy when the thermostat is lowered on a hot day", () => {
    const warmerTarget = simulate({
      outsideTemperatureC: 32,
      thermostatTemperatureC: 25,
    });
    const coolerTarget = simulate({
      outsideTemperatureC: 32,
      thermostatTemperatureC: 21,
    });

    expect(coolerTarget.hvacEnergyKWh).toBeGreaterThan(
      warmerTarget.hvacEnergyKWh,
    );
  });

  it("uses more heating energy when the thermostat is raised on a cold day", () => {
    const lowerTarget = simulate({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 16,
    });
    const higherTarget = simulate({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 20,
    });

    expect(lowerTarget.hvacMode).toBe("heating");
    expect(higherTarget.hvacMode).toBe("heating");
    expect(higherTarget.hvacEnergyKWh).toBeGreaterThan(
      lowerTarget.hvacEnergyKWh,
    );
  });

  it("uses more HVAC energy when outdoor weather is hotter", () => {
    const mildDay = simulate({
      outsideTemperatureC: 28,
      thermostatTemperatureC: 24,
    });
    const hotDay = simulate({
      outsideTemperatureC: 34,
      thermostatTemperatureC: 24,
    });

    expect(hotDay.hvacEnergyKWh).toBeGreaterThan(mildDay.hvacEnergyKWh);
  });

  it("does not reduce Eco Score solely because outdoor weather is hotter", () => {
    const mildDay = simulate({ outsideTemperatureC: 28 });
    const hotDay = simulate({ outsideTemperatureC: 38 });

    expect(hotDay.ecoScore).toBe(mildDay.ecoScore);
  });

  it("does not reduce Eco Score solely because winter weather is colder", () => {
    const coldDay = simulate({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 22,
    });
    const colderDay = simulate({
      outsideTemperatureC: -20,
      thermostatTemperatureC: 22,
    });

    expect(coldDay.hvacMode).toBe("heating");
    expect(colderDay.hvacMode).toBe("heating");
    expect(colderDay.ecoScore).toBe(coldDay.ecoScore);
  });

  it("reduces Eco Score for a thermostat below the reasonable cooling setting", () => {
    const reasonableTarget = simulate({ thermostatTemperatureC: 24 });
    const lowTarget = simulate({ thermostatTemperatureC: 21 });

    expect(lowTarget.ecoScore).toBeLessThan(reasonableTarget.ecoScore);
  });

  it("reduces Eco Score for a thermostat above the reasonable heating setting", () => {
    const reasonableTarget = simulate({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 20,
    });
    const highTarget = simulate({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 23,
    });

    expect(reasonableTarget.hvacMode).toBe("heating");
    expect(highTarget.hvacMode).toBe("heating");
    expect(highTarget.ecoScore).toBeLessThan(reasonableTarget.ecoScore);
    expect(highTarget.ecoScoreBreakdown.coolingPenalty).toBe(0);
  });

  it("applies no thermostat penalty while HVAC is idle or off", () => {
    const idle = simulate({
      outsideTemperatureC: 20.875,
      thermostatTemperatureC: 24,
    });
    const off = simulate({ thermostatTemperatureC: 18, hvacEnabled: false });

    expect(idle.ecoScoreBreakdown.thermostatPenalty).toBe(0);
    expect(off.ecoScoreBreakdown.thermostatPenalty).toBe(0);
  });

  it("keeps the existing lighting and device calculations unchanged", () => {
    const result = simulate();

    expect(result.lightingEnergyKWh).toBeCloseTo(3.072);
    expect(result.deviceEnergyKWh).toBeCloseTo(14.4);
  });

  it("gives a more efficient configuration a higher Eco Score", () => {
    const wasteful = simulate({
      lightingLevelPercent: 100,
      lightingPowerDensityWPerM2: 12,
      devicePowerW: 4_000,
      outsideTemperatureC: 32,
      thermostatTemperatureC: 20,
    });
    const efficient = simulate({
      lightingLevelPercent: 60,
      lightingPowerDensityWPerM2: 6,
      devicePowerW: 900,
      outsideTemperatureC: 32,
      thermostatTemperatureC: 26,
    });

    expect(efficient.ecoScore).toBeGreaterThan(wasteful.ecoScore);
  });

  it("never returns negative energy, emissions, or cost outputs", () => {
    const result = simulate({
      roomAreaM2: -60,
      occupants: -30,
      operatingHoursPerDay: -8,
      lightingPowerDensityWPerM2: -8,
      devicePowerW: -1_800,
      carbonIntensityKgPerKWh: -0.45,
      electricityPricePerKWh: -0.15,
    });

    const outputs = [
      result.lightingEnergyKWh,
      result.deviceEnergyKWh,
      result.hvacEnergyKWh,
      result.dailyEnergyKWh,
      result.monthlyEnergyKWh,
      result.annualEnergyKWh,
      result.dailyCO2Kg,
      result.monthlyCO2Kg,
      result.annualCO2Kg,
      result.dailyCost,
      result.monthlyCost,
      result.annualCost,
    ];

    outputs.forEach((value) => expect(value).toBeGreaterThanOrEqual(0));
  });

  it("makes daily energy equal the sum of its component energies", () => {
    const result = simulate();

    expect(result.dailyEnergyKWh).toBeCloseTo(
      result.lightingEnergyKWh +
        result.deviceEnergyKWh +
        result.hvacEnergyKWh,
    );
  });
});
