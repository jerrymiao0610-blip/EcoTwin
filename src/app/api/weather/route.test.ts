import { afterEach, describe, expect, it, vi } from "vitest";
import { WEATHER_FALLBACK_WARNING } from "../../../lib/context/context";
import { POST } from "./route";

describe("POST /api/weather", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns validated Open-Meteo context for the honest reference location", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      current: {
        temperature_2m: 28.4,
        relative_humidity_2m: 72,
        surface_pressure: 1006.4,
        time: "2026-08-24T08:15",
      },
    }), { status: 200 })));

    const response = await POST(jsonRequest({ manualFallbackTemperature: 24 }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(result).toEqual({
      location: {
        name: "Shanghai reference location",
        latitude: 31.2304,
        longitude: 121.4737,
      },
      temperature: 28.4,
      relativeHumidityPercent: 72,
      pressureKPa: 100.64,
      source: "open-meteo",
      timestamp: "2026-08-24T08:15:00.000Z",
      warnings: [],
    });
  });

  it("returns explicit manual context when weather is offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));

    const response = await POST(jsonRequest({ manualFallbackTemperature: 26 }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.source).toBe("manual");
    expect(result.temperature).toBe(26);
    expect(result.warnings).toEqual([WEATHER_FALLBACK_WARNING]);
  });

  it("falls back for malformed provider data and rejects unsafe manual values", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      current: { temperature_2m: 999, time: "not-a-time" },
    }), { status: 200 })));

    const fallbackResponse = await POST(
      jsonRequest({ manualFallbackTemperature: 22 }),
    );
    const fallback = await fallbackResponse.json();
    const rejectedResponse = await POST(
      jsonRequest({ manualFallbackTemperature: 999 }),
    );

    expect(fallback.source).toBe("manual");
    expect(fallback.temperature).toBe(22);
    expect(rejectedResponse.status).toBe(400);
  });
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/weather", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
