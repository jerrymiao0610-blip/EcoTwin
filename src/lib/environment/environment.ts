import type { EnvironmentalSnapshot } from "./types";

export function createEnvironmentalSnapshot(
  input: Readonly<EnvironmentalSnapshot>,
): EnvironmentalSnapshot {
  assertTemperature(input.indoorObservation.temperatureC, "Indoor temperature");
  assertRelativeHumidity(
    input.indoorObservation.relativeHumidityPercent,
    "Indoor relative humidity",
  );
  assertTimestamp(input.indoorObservation.timestamp, "Indoor timestamp");
  assertTemperature(input.outdoorObservation.temperatureC, "Outdoor temperature");
  assertRelativeHumidity(
    input.outdoorObservation.relativeHumidityPercent,
    "Outdoor relative humidity",
  );
  assertPositiveFinite(input.outdoorObservation.pressureKPa, "Outdoor pressure");
  assertTimestamp(input.outdoorObservation.timestamp, "Outdoor timestamp");
  assertTemperature(input.targets.temperatureC, "Target temperature");
  assertRelativeHumidity(
    input.targets.relativeHumidityPercent,
    "Target relative humidity",
  );

  return Object.freeze({
    indoorObservation: Object.freeze({ ...input.indoorObservation }),
    outdoorObservation: Object.freeze({ ...input.outdoorObservation }),
    targets: Object.freeze({ ...input.targets }),
  });
}

function assertTemperature(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite.`);
  }
}

function assertRelativeHumidity(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${label} must be from 0 to 100 percent.`);
  }
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite value.`);
  }
}

function assertTimestamp(value: string, label: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${label} must be valid ISO 8601.`);
  }
}
