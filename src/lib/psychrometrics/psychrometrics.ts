/** Saturation vapor pressure in kPa using the Magnus approximation. */
export function saturationVaporPressureKPa(temperatureC: number): number {
  assertFinite(temperatureC, "Temperature");
  if (temperatureC <= -243.04) {
    throw new RangeError("Temperature is outside the valid equation domain.");
  }
  return 0.61094 * Math.exp((17.625 * temperatureC) / (temperatureC + 243.04));
}

/** Partial vapor pressure in kPa. */
export function vaporPressureKPa(
  temperatureC: number,
  relativeHumidityPercent: number,
): number {
  if (
    !Number.isFinite(relativeHumidityPercent) ||
    relativeHumidityPercent < 0 ||
    relativeHumidityPercent > 100
  ) {
    throw new RangeError("Relative humidity must be from 0 to 100 percent.");
  }
  return (relativeHumidityPercent / 100) * saturationVaporPressureKPa(temperatureC);
}

/** Humidity ratio in kg water per kg dry air. */
export function humidityRatioKgPerKgDryAir(
  temperatureC: number,
  relativeHumidityPercent: number,
  pressureKPa: number,
): number {
  assertFinite(pressureKPa, "Pressure");
  if (pressureKPa <= 0) {
    throw new RangeError("Pressure must be positive.");
  }
  const vaporPressure = vaporPressureKPa(
    temperatureC,
    relativeHumidityPercent,
  );
  if (vaporPressure >= pressureKPa) {
    throw new RangeError(
      "Vapor pressure must be lower than total pressure.",
    );
  }
  return (0.621945 * vaporPressure) / (pressureKPa - vaporPressure);
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite.`);
  }
}
