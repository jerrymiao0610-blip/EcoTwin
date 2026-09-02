import { describe, expect, it } from "vitest";
import {
  humidityRatioKgPerKgDryAir,
  saturationVaporPressureKPa,
  vaporPressureKPa,
} from ".";

describe("psychrometrics", () => {
  it("matches reference values around standard indoor conditions", () => {
    expect(saturationVaporPressureKPa(20)).toBeCloseTo(2.333, 3);
    expect(vaporPressureKPa(20, 50)).toBeCloseTo(1.1665, 3);
    expect(humidityRatioKgPerKgDryAir(20, 50, 101.325)).toBeCloseTo(0.00725, 4);
  });

  it("produces a humidity ratio that increases with RH and temperature", () => {
    const dry = humidityRatioKgPerKgDryAir(25, 30, 101.325);
    const humid = humidityRatioKgPerKgDryAir(25, 70, 101.325);
    const warmer = humidityRatioKgPerKgDryAir(30, 70, 101.325);

    expect(humid).toBeGreaterThan(dry);
    expect(warmer).toBeGreaterThan(humid);
  });

  it("rejects impossible psychrometric pressure states without clamping", () => {
    expect(() => humidityRatioKgPerKgDryAir(100, 100, 50)).toThrow(
      "Vapor pressure must be lower than total pressure.",
    );
  });
});
