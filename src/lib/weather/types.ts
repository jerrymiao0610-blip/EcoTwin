/** Coordinates accepted by weather providers. */
export interface WeatherLocation {
  latitude: number;
  longitude: number;
}

/** Identifies whether a weather value is live or manually supplied. */
export type WeatherSource = "open-meteo" | "manual";

/** Provider-neutral current weather data used by the context layer. */
export interface WeatherReading {
  /** Air temperature in degrees Celsius. */
  temperature: number;
  source: WeatherSource;
  /** ISO 8601 time at which the weather value applies. */
  timestamp: string;
}

/** Boundary for any service capable of supplying current weather. */
export interface WeatherProvider {
  getCurrentWeather(
    location: Readonly<WeatherLocation>,
  ): Promise<WeatherReading>;
}
