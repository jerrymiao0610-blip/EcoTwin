import type {
  CreateTwinSnapshotInput,
  TwinContext,
  TwinDefinition,
  TwinProvenance,
  TwinSnapshot,
  TwinSnapshotMetadata,
  TwinState,
} from "./types";

export const TWIN_SCHEMA_VERSION = "1.0.0";
export const TWIN_HASH_ALGORITHM = "fnv1a32";

/**
 * Creates a detached, deeply frozen classroom snapshot.
 *
 * The content hash deliberately excludes metadata. Two observations with the
 * same physical definition, controls, and context therefore have the same
 * hash even if they were captured at different times or by different sources.
 */
export function createTwinSnapshot(
  input: Readonly<CreateTwinSnapshotInput>,
): TwinSnapshot {
  validateInput(input);

  const definition = freezeDefinition(input.definition);
  const state = freezeState(input.state);
  const context = freezeContext(input.context);
  const provenance = freezeProvenance(input.provenance);
  const contentHash = createContentHash(definition, state, context);
  const metadata: TwinSnapshotMetadata = Object.freeze({
    schemaVersion: TWIN_SCHEMA_VERSION,
    capturedAt: input.capturedAt,
    provenance,
    contentHash,
  });

  return Object.freeze({ definition, state, context, metadata });
}

function freezeDefinition(
  definition: Readonly<TwinDefinition>,
): TwinDefinition {
  return Object.freeze({
    id: definition.id,
    name: definition.name,
    physicalProperties: Object.freeze({
      roomAreaM2: definition.physicalProperties.roomAreaM2,
      lightingPowerDensityWPerM2:
        definition.physicalProperties.lightingPowerDensityWPerM2,
    }),
  });
}

function freezeState(state: Readonly<TwinState>): TwinState {
  return Object.freeze({
    thermostatTemperatureC: state.thermostatTemperatureC,
    lightingLevelPercent: state.lightingLevelPercent,
    devicePowerW: state.devicePowerW,
    hvacEnabled: state.hvacEnabled,
    lightsEnabled: state.lightsEnabled,
    devicesEnabled: state.devicesEnabled,
  });
}

function freezeContext(context: Readonly<TwinContext>): TwinContext {
  return Object.freeze({
    occupants: context.occupants,
    outsideTemperatureC: context.outsideTemperatureC,
    operatingHoursPerDay: context.operatingHoursPerDay,
    operatingDaysPerMonth: context.operatingDaysPerMonth,
    operatingDaysPerYear: context.operatingDaysPerYear,
    electricityPricePerKWh: context.electricityPricePerKWh,
    carbonIntensityKgPerKWh: context.carbonIntensityKgPerKWh,
  });
}

function freezeProvenance(
  provenance: Readonly<TwinProvenance>,
): TwinProvenance {
  return Object.freeze({
    source: provenance.source,
    ...(provenance.sourceVersion === undefined
      ? {}
      : { sourceVersion: provenance.sourceVersion }),
  });
}

function createContentHash(
  definition: Readonly<TwinDefinition>,
  state: Readonly<TwinState>,
  context: Readonly<TwinContext>,
): string {
  const canonicalContent = canonicalize({ definition, state, context });
  let hash = 0x811c9dc5;

  // Hash UTF-8 bytes so the result is stable for non-ASCII classroom names.
  for (const byte of new TextEncoder().encode(canonicalContent)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }

  return `${TWIN_HASH_ALGORITHM}:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const properties = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`);

  return `{${properties.join(",")}}`;
}

function validateInput(input: Readonly<CreateTwinSnapshotInput>): void {
  assertNonEmptyString(input.definition.id, "Twin definition id");
  assertNonEmptyString(input.definition.name, "Twin definition name");
  assertPositive(
    input.definition.physicalProperties.roomAreaM2,
    "Room area",
  );
  assertNonNegative(
    input.definition.physicalProperties.lightingPowerDensityWPerM2,
    "Lighting power density",
  );

  assertFinite(
    input.state.thermostatTemperatureC,
    "Thermostat temperature",
  );
  assertRange(input.state.lightingLevelPercent, 0, 100, "Lighting level");
  assertNonNegative(input.state.devicePowerW, "Device power");
  assertBoolean(input.state.hvacEnabled, "HVAC enabled");
  assertBoolean(input.state.lightsEnabled, "Lights enabled");
  assertBoolean(input.state.devicesEnabled, "Devices enabled");

  assertNonNegativeInteger(input.context.occupants, "Occupants");
  assertFinite(input.context.outsideTemperatureC, "Outside temperature");
  assertRange(input.context.operatingHoursPerDay, 0, 24, "Operating hours");
  assertIntegerRange(
    input.context.operatingDaysPerMonth,
    0,
    31,
    "Operating days per month",
  );
  assertIntegerRange(
    input.context.operatingDaysPerYear,
    0,
    366,
    "Operating days per year",
  );
  assertNonNegative(
    input.context.electricityPricePerKWh,
    "Electricity price",
  );
  assertNonNegative(
    input.context.carbonIntensityKgPerKWh,
    "Carbon intensity",
  );

  if (Number.isNaN(Date.parse(input.capturedAt))) {
    throw new TypeError("Captured time must be valid ISO 8601.");
  }

  assertNonEmptyString(input.provenance.source, "Provenance source");
  if (input.provenance.sourceVersion !== undefined) {
    assertNonEmptyString(
      input.provenance.sourceVersion,
      "Provenance source version",
    );
  }
}

function assertNonEmptyString(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
}

function assertPositive(value: number, label: string): void {
  assertFinite(value, label);
  if (value <= 0) {
    throw new RangeError(`${label} must be greater than zero.`);
  }
}

function assertNonNegative(value: number, label: string): void {
  assertFinite(value, label);
  if (value < 0) {
    throw new RangeError(`${label} cannot be negative.`);
  }
}

function assertRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  assertFinite(value, label);
  if (value < minimum || value > maximum) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  assertNonNegative(value, label);
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be an integer.`);
  }
}

function assertIntegerRange(
  value: number,
  minimum: number,
  maximum: number,
  label: string,
): void {
  assertRange(value, minimum, maximum, label);
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be an integer.`);
  }
}

function assertBoolean(value: boolean, label: string): void {
  if (typeof value !== "boolean") {
    throw new TypeError(`${label} must be a boolean.`);
  }
}
