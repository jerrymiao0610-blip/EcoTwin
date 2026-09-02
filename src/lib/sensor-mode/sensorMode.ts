import {
  createEnvironmentalSnapshot,
  type EnvironmentalSnapshot,
} from "../environment";
import type { ContextSnapshot } from "../context/types";
import type {
  EdgeNodeConnectionStatus,
  EdgeNodeFreshness,
  EdgeNodeTelemetry,
} from "../hardware/types";
import type { ClassroomConfig } from "../simulation";

export const STANDARD_PRESSURE_KPA = 101.325;
export const DEFAULT_TARGET_RELATIVE_HUMIDITY_PERCENT = 50;
export const PRESSURE_FALLBACK_WARNING =
  "Surface pressure is unavailable; using the explicit standard-pressure assumption of 101.325 kPa.";
export const MISSING_OUTDOOR_HUMIDITY_WARNING =
  "Outdoor relative humidity is unavailable. Load Open-Meteo context or enter manual outdoor RH before using sensor-informed mode.";

export class MissingOutdoorHumidityError extends Error {
  constructor() {
    super(MISSING_OUTDOOR_HUMIDITY_WARNING);
    this.name = "MissingOutdoorHumidityError";
  }
}

export interface SensorEnvironmentBuildInput {
  readonly config: Readonly<ClassroomConfig>;
  readonly telemetry: Readonly<EdgeNodeTelemetry>;
  readonly weatherContext: Readonly<ContextSnapshot> | null;
  readonly manualOutdoorRelativeHumidityPercent: number | null;
  readonly now?: () => Date;
}

export interface SensorEnvironmentBuildResult {
  readonly snapshot: EnvironmentalSnapshot;
  readonly warnings: readonly string[];
}

export function buildSensorEnvironmentalSnapshot(
  input: Readonly<SensorEnvironmentBuildInput>,
): SensorEnvironmentBuildResult {
  const contextRh = input.weatherContext?.relativeHumidityPercent;
  const outdoorRh = contextRh ?? input.manualOutdoorRelativeHumidityPercent;
  if (outdoorRh === null || outdoorRh === undefined) {
    throw new MissingOutdoorHumidityError();
  }
  // A context is used as one provenance-consistent observation only when it
  // includes RH. Otherwise the manual temperature/RH pair is used together.
  const useWeatherContext = contextRh !== undefined;
  const pressureKPa = useWeatherContext
    ? input.weatherContext?.pressureKPa ?? STANDARD_PRESSURE_KPA
    : STANDARD_PRESSURE_KPA;
  const warnings = !useWeatherContext || input.weatherContext?.pressureKPa === undefined
    ? [PRESSURE_FALLBACK_WARNING]
    : [];
  const now = input.now ?? (() => new Date());

  return Object.freeze({
    snapshot: createEnvironmentalSnapshot({
      indoorObservation: {
        temperatureC: input.telemetry.temperatureC,
        relativeHumidityPercent: input.telemetry.humidityPercent,
        timestamp: new Date(input.telemetry.receivedAtMs).toISOString(),
        source: "edge-node",
      },
      outdoorObservation: {
        temperatureC:
          useWeatherContext
            ? input.weatherContext?.temperature ?? input.config.outsideTemperatureC
            : input.config.outsideTemperatureC,
        relativeHumidityPercent: outdoorRh,
        pressureKPa,
        timestamp: useWeatherContext
          ? input.weatherContext?.timestamp ?? now().toISOString()
          : now().toISOString(),
        source: useWeatherContext
          ? input.weatherContext?.source ?? "manual"
          : "manual",
      },
      targets: {
        temperatureC: input.config.thermostatTemperatureC,
        relativeHumidityPercent: DEFAULT_TARGET_RELATIVE_HUMIDITY_PERCENT,
      },
    }),
    warnings: Object.freeze(warnings),
  });
}

export function canActivateSensorMode(
  status: EdgeNodeConnectionStatus,
  freshness: EdgeNodeFreshness | null,
  telemetry: EdgeNodeTelemetry | null,
): boolean {
  return status === "connected" && freshness === "live" && telemetry !== null;
}

export function shouldRecomputeSensorEstimate(
  previous: Readonly<EdgeNodeTelemetry> | null,
  next: Readonly<EdgeNodeTelemetry>,
  previousComputedAtMs: number | null,
  nowMs: number,
): boolean {
  if (previous === null || previousComputedAtMs === null) return true;
  if (nowMs - previousComputedAtMs < 5_000) return false;
  return (
    Math.abs(next.temperatureC - previous.temperatureC) >= 0.2 ||
    Math.abs(next.humidityPercent - previous.humidityPercent) >= 1
  );
}

export type SensorModeHealth = "live" | "stale" | "fallback-to-manual";

export function getActiveSensorModeHealth(
  status: EdgeNodeConnectionStatus,
  freshness: EdgeNodeFreshness | null,
): SensorModeHealth {
  if (status !== "connected") return "fallback-to-manual";
  return freshness === "live" ? "live" : "stale";
}
