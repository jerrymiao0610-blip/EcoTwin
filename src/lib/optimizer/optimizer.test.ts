import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLASSROOM_CONFIG,
  simulateClassroomEnergy,
  type ClassroomConfig,
} from "../simulation";
import { optimizeClassroomEnergy } from "./optimizer";

const optimize = (overrides: Partial<ClassroomConfig> = {}) =>
  optimizeClassroomEnergy({ ...DEFAULT_CLASSROOM_CONFIG, ...overrides });

describe("optimizeClassroomEnergy", () => {
  it("optimizes the default classroom on the bounded usability grid", () => {
    const result = optimize();

    expect(result.optimizedConfiguration).toMatchObject({
      thermostatTemperatureC: 26,
      lightingLevelPercent: 60,
      devicePowerW: 1_200,
    });
    expect(result.changedParameters.map(({ parameter }) => parameter)).toEqual([
      "thermostatTemperatureC",
      "lightingLevelPercent",
      "devicePowerW",
    ]);
    expect(result.savings.dailyEnergyKWh).toBeCloseTo(9.408);
    expect(result.savings.annualEnergyKWh).toBeCloseTo(2_352);
    expect(result.savings.energyPercent).toBeCloseTo(24.2279563);
    expect(result.recommendations).toHaveLength(3);
    expect(result.searchSpaceSize).toBe(455);
  });

  it("leaves an already efficient classroom unchanged", () => {
    const result = optimize({
      outsideTemperatureC: 20.875,
      thermostatTemperatureC: 24,
      lightingLevelPercent: 60,
      devicePowerW: 1_200,
    });

    expect(result.optimizedConfiguration).toEqual(result.baselineConfiguration);
    expect(result.changedParameters).toEqual([]);
    expect(result.savings.dailyEnergyKWh).toBe(0);
    expect(result.savings.energyPercent).toBe(0);
    expect(result.recommendations[0]).toContain("already minimizes");
  });

  it("does not change the thermostat when HVAC is disabled", () => {
    const result = optimize({
      hvacEnabled: false,
      thermostatTemperatureC: 22,
    });

    expect(result.optimizedConfiguration.thermostatTemperatureC).toBe(22);
    expect(result.optimizedSimulation.hvacMode).toBe("off");
    expect(result.changedParameters).not.toContainEqual(
      expect.objectContaining({ parameter: "thermostatTemperatureC" }),
    );
    expect(result.searchSpaceSize).toBe(65);
  });

  it("does not change the lighting level when lighting is disabled", () => {
    const result = optimize({
      lightsEnabled: false,
      lightingLevelPercent: 90,
    });

    expect(result.optimizedConfiguration.lightingLevelPercent).toBe(90);
    expect(result.optimizedSimulation.lightingEnergyKWh).toBe(0);
    expect(result.changedParameters).not.toContainEqual(
      expect.objectContaining({ parameter: "lightingLevelPercent" }),
    );
    expect(result.searchSpaceSize).toBe(91);
  });

  it("does not change device power when devices are disabled", () => {
    const result = optimize({
      devicesEnabled: false,
      devicePowerW: 2_400,
    });

    expect(result.optimizedConfiguration.devicePowerW).toBe(2_400);
    expect(result.optimizedSimulation.deviceEnergyKWh).toBe(0);
    expect(result.changedParameters).not.toContainEqual(
      expect.objectContaining({ parameter: "devicePowerW" }),
    );
    expect(result.searchSpaceSize).toBe(35);
  });

  it("lowers the thermostat in a heating scenario", () => {
    const result = optimize({
      outsideTemperatureC: -10,
      thermostatTemperatureC: 23,
    });

    expect(result.baselineSimulation.hvacMode).toBe("heating");
    expect(result.optimizedSimulation.hvacMode).toBe("heating");
    expect(result.optimizedConfiguration.thermostatTemperatureC).toBe(20);
    expect(result.optimizedSimulation.hvacEnergyKWh).toBeLessThan(
      result.baselineSimulation.hvacEnergyKWh,
    );
    expect(
      result.changedParameters.find(
        ({ parameter }) => parameter === "thermostatTemperatureC",
      )?.reason,
    ).toContain("heating setpoint");
  });

  it("returns exactly the same result on repeated runs", () => {
    const config = {
      ...DEFAULT_CLASSROOM_CONFIG,
      outsideTemperatureC: 29,
      thermostatTemperatureC: 23.5,
      lightingLevelPercent: 75,
      devicePowerW: 1_725,
    };

    expect(optimizeClassroomEnergy(config)).toEqual(
      optimizeClassroomEnergy(config),
    );
  });

  it("preserves every non-controllable input and reports simulator outputs", () => {
    const result = optimize();
    const controllable = new Set([
      "thermostatTemperatureC",
      "lightingLevelPercent",
      "devicePowerW",
    ]);

    for (const key of Object.keys(DEFAULT_CLASSROOM_CONFIG) as Array<
      keyof ClassroomConfig
    >) {
      if (!controllable.has(key)) {
        expect(result.optimizedConfiguration[key]).toBe(
          DEFAULT_CLASSROOM_CONFIG[key],
        );
      }
    }
    expect(result.baselineSimulation).toEqual(
      simulateClassroomEnergy(result.baselineConfiguration),
    );
    expect(result.optimizedSimulation).toEqual(
      simulateClassroomEnergy(result.optimizedConfiguration),
    );
  });
});
