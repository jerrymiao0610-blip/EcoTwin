import { describe, expect, it, vi } from "vitest";
import { OpenMeteoWeatherProvider } from "../weather/openMeteo";
import type { WeatherProvider } from "../weather/types";
import {
  createContextSnapshot,
  WEATHER_FALLBACK_WARNING,
} from "./context";
import type { Location } from "./types";

const SHANGHAI: Location = {
  name: "Shanghai",
  latitude: 31.2304,
  longitude: 121.4737,
};

describe("createContextSnapshot", () => {
  it("creates a snapshot from a weather provider", async () => {
    const provider: WeatherProvider = {
      async getCurrentWeather() {
        return {
          temperature: 28.5,
          relativeHumidityPercent: 67,
          pressureKPa: 100.7,
          source: "open-meteo",
          timestamp: "2026-08-22T09:00:00.000Z",
        };
      },
    };

    const snapshot = await createContextSnapshot(SHANGHAI, provider, {
      manualFallbackTemperature: 24,
    });

    expect(snapshot).toEqual({
      location: SHANGHAI,
      temperature: 28.5,
      relativeHumidityPercent: 67,
      pressureKPa: 100.7,
      source: "open-meteo",
      timestamp: "2026-08-22T09:00:00.000Z",
      warnings: [],
    });
    expect(snapshot.location).not.toBe(SHANGHAI);
  });

  it("uses deterministic manual weather when the API provider fails", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Service unavailable", { status: 503 }));
    const provider = new OpenMeteoWeatherProvider({ fetch: fetcher });
    const fixedTime = new Date("2026-08-22T10:30:00.000Z");

    const snapshot = await createContextSnapshot(SHANGHAI, provider, {
      manualFallbackTemperature: 26,
      now: () => fixedTime,
    });

    expect(snapshot).toEqual({
      location: SHANGHAI,
      temperature: 26,
      source: "manual",
      timestamp: "2026-08-22T10:30:00.000Z",
      warnings: [WEATHER_FALLBACK_WARNING],
    });
  });

  it("falls back when a provider returns unusable data", async () => {
    const provider: WeatherProvider = {
      async getCurrentWeather() {
        return {
          temperature: Number.NaN,
          source: "open-meteo",
          timestamp: "not-a-time",
        };
      },
    };

    const snapshot = await createContextSnapshot(SHANGHAI, provider, {
      manualFallbackTemperature: 22,
      now: () => new Date("2026-08-22T12:00:00.000Z"),
    });

    expect(snapshot.source).toBe("manual");
    expect(snapshot.temperature).toBe(22);
    expect(snapshot.warnings).toEqual([WEATHER_FALLBACK_WARNING]);
  });

  it("rejects a non-finite manual fallback configuration", async () => {
    const provider: WeatherProvider = {
      async getCurrentWeather() {
        throw new Error("offline");
      },
    };

    await expect(
      createContextSnapshot(SHANGHAI, provider, {
        manualFallbackTemperature: Number.POSITIVE_INFINITY,
      }),
    ).rejects.toThrow("Manual fallback temperature must be a finite number.");
  });
});
