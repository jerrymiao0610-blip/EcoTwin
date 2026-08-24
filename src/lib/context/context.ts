import type { WeatherProvider, WeatherReading } from "../weather/types";
import { CLASSROOM_CONFIG_INPUT_RULES } from "../validation/classroomConfig";
import type {
  ContextSnapshot,
  ContextSnapshotOptions,
  Location,
} from "./types";

export const WEATHER_FALLBACK_WARNING =
  "Live weather is unavailable; using the manual fallback temperature.";

/**
 * Resolves provider-neutral real-world context without coupling simulation code
 * to a weather API. Provider failures degrade to an explicit manual value.
 */
export async function createContextSnapshot(
  location: Readonly<Location>,
  weatherProvider: WeatherProvider,
  options: Readonly<ContextSnapshotOptions>,
): Promise<ContextSnapshot> {
  assertFiniteTemperature(
    options.manualFallbackTemperature,
    "Manual fallback temperature",
  );

  try {
    const weather = await weatherProvider.getCurrentWeather(location);
    assertWeatherReading(weather);

    return {
      location: { ...location },
      temperature: weather.temperature,
      source: weather.source,
      timestamp: weather.timestamp,
      warnings: [],
    };
  } catch {
    const timestamp = (options.now ?? (() => new Date()))().toISOString();

    return {
      location: { ...location },
      temperature: options.manualFallbackTemperature,
      source: "manual",
      timestamp,
      warnings: [WEATHER_FALLBACK_WARNING],
    };
  }
}

function assertWeatherReading(weather: Readonly<WeatherReading>): void {
  assertFiniteTemperature(weather.temperature, "Weather provider temperature");

  if (Number.isNaN(Date.parse(weather.timestamp))) {
    throw new TypeError("Weather provider timestamp must be valid ISO 8601.");
  }
}

function assertFiniteTemperature(value: number, label: string): void {
  const rule = CLASSROOM_CONFIG_INPUT_RULES.outsideTemperatureC;
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  if (value < rule.minimum || value > rule.maximum) {
    throw new TypeError(
      `${label} must be from ${rule.minimum} to ${rule.maximum}.`,
    );
  }
}
