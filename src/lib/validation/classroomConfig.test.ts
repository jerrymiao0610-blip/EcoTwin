import { describe, expect, it } from "vitest";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import {
  assertValidClassroomConfig,
  normalizeClassroomConfigEdit,
  parseClassroomConfigInput,
} from "./classroomConfig";

describe("classroom configuration boundary", () => {
  it("preserves every normal default value", () => {
    expect(parseClassroomConfigInput(DEFAULT_CLASSROOM_CONFIG)).toEqual(
      DEFAULT_CLASSROOM_CONFIG,
    );
    expect(() => assertValidClassroomConfig(DEFAULT_CLASSROOM_CONFIG)).not.toThrow();
  });

  it("keeps trusted pipeline validation compatible with the Twin domain", () => {
    expect(() => assertValidClassroomConfig({
      ...DEFAULT_CLASSROOM_CONFIG,
      roomAreaM2: 5,
      occupants: 101,
      outsideTemperatureC: 61,
      thermostatTemperatureC: 31,
      operatingHoursPerDay: 20,
      operatingDaysPerMonth: 31,
      operatingDaysPerYear: 30,
      lightingPowerDensityWPerM2: 26,
      devicePowerW: 6_001,
      electricityPricePerKWh: 11,
      carbonIntensityKgPerKWh: 11,
    })).not.toThrow();
  });

  it.each([
    [Number.NaN, DEFAULT_CLASSROOM_CONFIG.roomAreaM2],
    [Number.POSITIVE_INFINITY, DEFAULT_CLASSROOM_CONFIG.roomAreaM2],
  ])("rejects non-finite dashboard edits without changing state", (candidate, expected) => {
    const result = normalizeClassroomConfigEdit(
      DEFAULT_CLASSROOM_CONFIG,
      "roomAreaM2",
      candidate,
    );

    expect(result.roomAreaM2).toBe(expected);
  });

  it("clamps extreme and negative edits at one boundary", () => {
    const extremeWeather = normalizeClassroomConfigEdit(
      DEFAULT_CLASSROOM_CONFIG,
      "outsideTemperatureC",
      999,
    );
    const negativePower = normalizeClassroomConfigEdit(
      DEFAULT_CLASSROOM_CONFIG,
      "devicePowerW",
      -500,
    );

    expect(extremeWeather.outsideTemperatureC).toBe(60);
    expect(negativePower.devicePowerW).toBe(0);
  });

  it("normalizes integer fields and keeps monthly/annual days coherent", () => {
    const rounded = normalizeClassroomConfigEdit(
      DEFAULT_CLASSROOM_CONFIG,
      "occupants",
      12.6,
    );
    const loweredAnnual = normalizeClassroomConfigEdit(
      DEFAULT_CLASSROOM_CONFIG,
      "operatingDaysPerYear",
      5,
    );

    expect(rounded.occupants).toBe(13);
    expect(loweredAnnual.operatingDaysPerMonth).toBe(5);
    expect(loweredAnnual.operatingDaysPerYear).toBe(5);
  });

  it("strictly rejects malformed API inputs and inconsistent scaling", () => {
    expect(() =>
      parseClassroomConfigInput({
        ...DEFAULT_CLASSROOM_CONFIG,
        outsideTemperatureC: 999,
      }),
    ).toThrow("finite number");
    expect(() =>
      parseClassroomConfigInput({
        ...DEFAULT_CLASSROOM_CONFIG,
        operatingDaysPerMonth: 22,
        operatingDaysPerYear: 5,
      }),
    ).toThrow("monthly days exceed annual days");
    expect(() =>
      parseClassroomConfigInput({
        ...DEFAULT_CLASSROOM_CONFIG,
        occupants: 2.5,
      }),
    ).toThrow("integer");
  });
});
