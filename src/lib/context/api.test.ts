import { describe, expect, it } from "vitest";
import { DEFAULT_WEATHER_LOCATION } from "./defaults";
import {
  createClientManualContext,
  parseWeatherContextApiResponse,
  WEATHER_CLIENT_FALLBACK_WARNING,
} from "./api";

describe("weather client boundary", () => {
  it("accepts a complete context snapshot", () => {
    expect(parseWeatherContextApiResponse({
      location: DEFAULT_WEATHER_LOCATION,
      temperature: 27.5,
      relativeHumidityPercent: 61,
      pressureKPa: 100.91,
      source: "open-meteo",
      timestamp: "2026-08-24T08:15:00.000Z",
      warnings: [],
    })).toMatchObject({
      temperature: 27.5,
      relativeHumidityPercent: 61,
      pressureKPa: 100.91,
      source: "open-meteo",
    });
  });

  it("rejects invalid optional humidity and pressure fields", () => {
    const base = {
      location: DEFAULT_WEATHER_LOCATION,
      temperature: 27.5,
      source: "open-meteo",
      timestamp: "2026-08-24T08:15:00.000Z",
      warnings: [],
    };

    expect(() => parseWeatherContextApiResponse({
      ...base,
      relativeHumidityPercent: 101,
    })).toThrow("relativeHumidityPercent");
    expect(() => parseWeatherContextApiResponse({
      ...base,
      pressureKPa: 0,
    })).toThrow("pressureKPa");
  });

  it("rejects malformed network data before it can update the model", () => {
    expect(() => parseWeatherContextApiResponse({
      location: DEFAULT_WEATHER_LOCATION,
      temperature: 999,
      source: "open-meteo",
      timestamp: "not-a-time",
      warnings: [],
    })).toThrow("finite temperature");
  });

  it("creates an explicit client-side manual fallback", () => {
    const fallback = createClientManualContext(
      DEFAULT_WEATHER_LOCATION,
      24,
      () => new Date("2026-08-24T09:00:00.000Z"),
    );

    expect(fallback).toEqual({
      location: DEFAULT_WEATHER_LOCATION,
      temperature: 24,
      source: "manual",
      timestamp: "2026-08-24T09:00:00.000Z",
      warnings: [WEATHER_CLIENT_FALLBACK_WARNING],
    });
  });
});
