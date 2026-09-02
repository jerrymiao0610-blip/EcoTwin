export type IndoorEnvironmentSource = "edge-node";
export type OutdoorEnvironmentSource = "open-meteo" | "manual";

export interface IndoorObservation {
  readonly temperatureC: number;
  readonly relativeHumidityPercent: number;
  readonly timestamp: string;
  readonly source: IndoorEnvironmentSource;
}

export interface OutdoorObservation {
  readonly temperatureC: number;
  readonly relativeHumidityPercent: number;
  readonly pressureKPa: number;
  readonly timestamp: string;
  readonly source: OutdoorEnvironmentSource;
}

export interface EnvironmentalTargets {
  readonly temperatureC: number;
  readonly relativeHumidityPercent: number;
}

/** Immutable, provenance-preserving inputs for the sensor-informed model. */
export interface EnvironmentalSnapshot {
  readonly indoorObservation: IndoorObservation;
  readonly outdoorObservation: OutdoorObservation;
  readonly targets: EnvironmentalTargets;
}
