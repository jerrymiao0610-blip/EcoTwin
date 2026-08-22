import type { WeatherLocation, WeatherSource } from "../weather/types";

/** A named real-world location used to obtain environmental context. */
export interface Location extends WeatherLocation {
  name: string;
}

/** The real-world inputs made available to downstream EcoTwin workflows. */
export interface ContextSnapshot {
  location: Location;
  /** Outside air temperature in degrees Celsius. */
  temperature: number;
  source: WeatherSource;
  /** ISO 8601 time at which the temperature value applies. */
  timestamp: string;
  warnings: string[];
}

export interface ContextSnapshotOptions {
  /** User-supplied Celsius value used when live weather is unavailable. */
  manualFallbackTemperature: number;
  /** Injectable clock used to timestamp manual fallback values. */
  now?: () => Date;
}
