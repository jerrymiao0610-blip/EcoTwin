import type {
  WeatherLocation,
  WeatherProvider,
  WeatherReading,
} from "./types";

export const OPEN_METEO_ENDPOINT = "https://api.open-meteo.com/v1/forecast";

export interface OpenMeteoWeatherProviderOptions {
  fetch?: typeof globalThis.fetch;
  endpoint?: string;
}

interface OpenMeteoResponse {
  current?: {
    temperature_2m?: unknown;
    time?: unknown;
  };
}

/** A provider error that can be handled by the context fallback policy. */
export class WeatherProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WeatherProviderError";
  }
}

/** Open-Meteo adapter for provider-neutral current temperature readings. */
export class OpenMeteoWeatherProvider implements WeatherProvider {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly endpoint: string;

  constructor(options: Readonly<OpenMeteoWeatherProviderOptions> = {}) {
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.endpoint = options.endpoint ?? OPEN_METEO_ENDPOINT;
  }

  async getCurrentWeather(
    location: Readonly<WeatherLocation>,
  ): Promise<WeatherReading> {
    assertCoordinates(location);

    const url = new URL(this.endpoint);
    url.searchParams.set("latitude", String(location.latitude));
    url.searchParams.set("longitude", String(location.longitude));
    url.searchParams.set("current", "temperature_2m");
    url.searchParams.set("temperature_unit", "celsius");
    url.searchParams.set("timezone", "UTC");

    const response = await this.fetcher(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new WeatherProviderError(
        `Open-Meteo request failed with status ${response.status}.`,
      );
    }

    const payload = (await response.json()) as OpenMeteoResponse;
    const temperature = payload.current?.temperature_2m;
    const time = payload.current?.time;

    if (typeof temperature !== "number" || !Number.isFinite(temperature)) {
      throw new WeatherProviderError(
        "Open-Meteo returned an invalid current temperature.",
      );
    }

    if (typeof time !== "string") {
      throw new WeatherProviderError(
        "Open-Meteo returned an invalid current timestamp.",
      );
    }

    return {
      temperature,
      source: "open-meteo",
      timestamp: normalizeUtcTimestamp(time),
    };
  }
}

function assertCoordinates(location: Readonly<WeatherLocation>): void {
  if (
    !Number.isFinite(location.latitude) ||
    location.latitude < -90 ||
    location.latitude > 90
  ) {
    throw new WeatherProviderError("Latitude must be between -90 and 90.");
  }

  if (
    !Number.isFinite(location.longitude) ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    throw new WeatherProviderError("Longitude must be between -180 and 180.");
  }
}

function normalizeUtcTimestamp(value: string): string {
  const utcValue = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`;
  const timestamp = new Date(utcValue);

  if (Number.isNaN(timestamp.getTime())) {
    throw new WeatherProviderError(
      "Open-Meteo returned an invalid current timestamp.",
    );
  }

  return timestamp.toISOString();
}
