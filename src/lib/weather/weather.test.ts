import { describe, expect, it, vi } from "vitest";
import {
  OpenMeteoWeatherProvider,
  WeatherProviderError,
} from "./openMeteo";

describe("OpenMeteoWeatherProvider", () => {
  it("maps the current Open-Meteo temperature to a weather reading", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: {
            temperature_2m: 27.4,
            relative_humidity_2m: 63,
            surface_pressure: 1008.6,
            time: "2026-08-22T08:15",
          },
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenMeteoWeatherProvider({ fetch: fetcher });

    const weather = await provider.getCurrentWeather({
      latitude: 31.2304,
      longitude: 121.4737,
    });

    expect(weather).toEqual({
      temperature: 27.4,
      relativeHumidityPercent: 63,
      pressureKPa: 100.86,
      source: "open-meteo",
      timestamp: "2026-08-22T08:15:00.000Z",
    });
    expect(fetcher).toHaveBeenCalledOnce();

    const requestUrl = new URL(String(fetcher.mock.calls[0][0]));
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      "https://api.open-meteo.com/v1/forecast",
    );
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      latitude: "31.2304",
      longitude: "121.4737",
      current: "temperature_2m,relative_humidity_2m,surface_pressure",
      temperature_unit: "celsius",
      timezone: "UTC",
    });
  });

  it("keeps legacy temperature available when RH and pressure are unavailable", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        current: { temperature_2m: 21.5, time: "2026-08-22T08:15" },
      }), { status: 200 }),
    );
    const provider = new OpenMeteoWeatherProvider({ fetch: fetcher });

    const weather = await provider.getCurrentWeather({ latitude: 0, longitude: 0 });

    expect(weather.temperature).toBe(21.5);
    expect(weather.relativeHumidityPercent).toBeUndefined();
    expect(weather.pressureKPa).toBeUndefined();
  });

  it("rejects failed API responses for the context layer to handle", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("Service unavailable", { status: 503 }));
    const provider = new OpenMeteoWeatherProvider({ fetch: fetcher });

    await expect(
      provider.getCurrentWeather({ latitude: 51.5072, longitude: -0.1276 }),
    ).rejects.toThrow(
      new WeatherProviderError(
        "Open-Meteo request failed with status 503.",
      ),
    );
  });

  it("rejects malformed API data instead of leaking invalid context", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          current: {
            temperature_2m: "warm",
            time: "2026-08-22T08:15",
          },
        }),
        { status: 200 },
      ),
    );
    const provider = new OpenMeteoWeatherProvider({ fetch: fetcher });

    await expect(
      provider.getCurrentWeather({ latitude: 0, longitude: 0 }),
    ).rejects.toThrow("Open-Meteo returned an invalid current temperature.");
  });

  it("validates coordinates before making a request", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const provider = new OpenMeteoWeatherProvider({ fetch: fetcher });

    await expect(
      provider.getCurrentWeather({ latitude: 91, longitude: 0 }),
    ).rejects.toThrow("Latitude must be between -90 and 90.");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
