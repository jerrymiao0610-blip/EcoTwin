import { CLASSROOM_CONFIG_INPUT_RULES } from "../validation/classroomConfig";
import type { ContextSnapshot, Location } from "./types";

export interface WeatherContextApiRequest {
  manualFallbackTemperature: number;
}

export const WEATHER_CLIENT_FALLBACK_WARNING =
  "The weather request could not be completed; the manual outdoor temperature remains active.";

export class WeatherContextApiError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "WeatherContextApiError";
  }
}

export function parseWeatherContextApiRequest(
  input: unknown,
): WeatherContextApiRequest {
  const value = requireRecord(input, "Weather request");
  requireExactKeys(value, ["manualFallbackTemperature"]);
  assertInputTemperature(
    value.manualFallbackTemperature,
    "manualFallbackTemperature",
  );
  return {
    manualFallbackTemperature: value.manualFallbackTemperature as number,
  };
}

/** Validates the network response again before it can update dashboard state. */
export function parseWeatherContextApiResponse(input: unknown): ContextSnapshot {
  const value = requireRecord(input, "Weather response");
  requireExactKeys(value, [
    "location",
    "temperature",
    "source",
    "timestamp",
    "warnings",
  ]);
  const location = parseLocation(value.location);
  assertInputTemperature(value.temperature, "temperature");
  if (value.source !== "open-meteo" && value.source !== "manual") {
    throw new WeatherContextApiError("Weather response source is invalid.");
  }
  if (
    typeof value.timestamp !== "string" ||
    Number.isNaN(Date.parse(value.timestamp))
  ) {
    throw new WeatherContextApiError("Weather response timestamp is invalid.");
  }
  if (
    !Array.isArray(value.warnings) ||
    value.warnings.some((warning) => typeof warning !== "string")
  ) {
    throw new WeatherContextApiError("Weather response warnings are invalid.");
  }

  return {
    location,
    temperature: value.temperature as number,
    source: value.source,
    timestamp: value.timestamp,
    warnings: [...value.warnings],
  };
}

export function createClientManualContext(
  location: Readonly<Location>,
  manualTemperature: number,
  now: () => Date = () => new Date(),
): ContextSnapshot {
  assertInputTemperature(manualTemperature, "manual temperature");
  return {
    location: { ...location },
    temperature: manualTemperature,
    source: "manual",
    timestamp: now().toISOString(),
    warnings: [WEATHER_CLIENT_FALLBACK_WARNING],
  };
}

function parseLocation(input: unknown): Location {
  const value = requireRecord(input, "Weather response location");
  requireExactKeys(value, ["name", "latitude", "longitude"]);
  if (typeof value.name !== "string" || value.name.trim() === "") {
    throw new WeatherContextApiError("Weather response location name is invalid.");
  }
  if (
    typeof value.latitude !== "number" ||
    !Number.isFinite(value.latitude) ||
    value.latitude < -90 ||
    value.latitude > 90
  ) {
    throw new WeatherContextApiError("Weather response latitude is invalid.");
  }
  if (
    typeof value.longitude !== "number" ||
    !Number.isFinite(value.longitude) ||
    value.longitude < -180 ||
    value.longitude > 180
  ) {
    throw new WeatherContextApiError("Weather response longitude is invalid.");
  }
  return {
    name: value.name,
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

function assertInputTemperature(value: unknown, label: string): void {
  const rule = CLASSROOM_CONFIG_INPUT_RULES.outsideTemperatureC;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < rule.minimum ||
    value > rule.maximum
  ) {
    throw new WeatherContextApiError(
      `${label} must be a finite temperature from ${rule.minimum} to ${rule.maximum}.`,
    );
  }
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new WeatherContextApiError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function requireExactKeys(
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): void {
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new WeatherContextApiError("Weather payload contains unsupported fields.");
  }
}
