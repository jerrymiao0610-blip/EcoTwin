import type { ClassroomConfig } from "../simulation";

export type ClassroomConfigNumberKey = Exclude<
  keyof ClassroomConfig,
  "hvacEnabled" | "lightsEnabled" | "devicesEnabled"
>;

interface NumberRule {
  readonly minimum?: number;
  readonly maximum?: number;
  readonly exclusiveMinimum?: boolean;
  readonly integer?: boolean;
}

/**
 * Values a person may enter in the dashboard or explanation API. Keeping these
 * rules outside React prevents HTML attributes from becoming the only guard.
 */
export const CLASSROOM_CONFIG_INPUT_RULES = {
  roomAreaM2: { minimum: 10, maximum: 250 },
  occupants: { minimum: 0, maximum: 100, integer: true },
  outsideTemperatureC: { minimum: -60, maximum: 60 },
  thermostatTemperatureC: { minimum: 16, maximum: 30 },
  operatingHoursPerDay: { minimum: 0, maximum: 16 },
  operatingDaysPerMonth: { minimum: 0, maximum: 31, integer: true },
  operatingDaysPerYear: { minimum: 0, maximum: 366, integer: true },
  lightingLevelPercent: { minimum: 0, maximum: 100 },
  lightingPowerDensityWPerM2: { minimum: 0, maximum: 25 },
  devicePowerW: { minimum: 0, maximum: 6_000 },
  electricityPricePerKWh: { minimum: 0, maximum: 10 },
  carbonIntensityKgPerKWh: { minimum: 0, maximum: 10 },
} as const satisfies Record<ClassroomConfigNumberKey, NumberRule>;

const BOOLEAN_KEYS = [
  "hvacEnabled",
  "lightsEnabled",
  "devicesEnabled",
] as const satisfies readonly (keyof ClassroomConfig)[];

const DOMAIN_RULES: Record<ClassroomConfigNumberKey, NumberRule> = {
  // Match the established TwinSnapshot contract. Narrower demo/UI ranges stay
  // at the untrusted edit and API boundaries above.
  roomAreaM2: { minimum: 0, exclusiveMinimum: true },
  occupants: { minimum: 0, integer: true },
  outsideTemperatureC: {},
  thermostatTemperatureC: {},
  operatingHoursPerDay: { minimum: 0, maximum: 24 },
  operatingDaysPerMonth: { minimum: 0, maximum: 31, integer: true },
  operatingDaysPerYear: { minimum: 0, maximum: 366, integer: true },
  lightingLevelPercent: { minimum: 0, maximum: 100 },
  lightingPowerDensityWPerM2: { minimum: 0 },
  devicePowerW: { minimum: 0 },
  electricityPricePerKWh: { minimum: 0 },
  carbonIntensityKgPerKWh: { minimum: 0 },
};

export class ClassroomConfigValidationError extends TypeError {
  constructor(message: string) {
    super(message);
    this.name = "ClassroomConfigValidationError";
  }
}

/** Strict boundary for untrusted user/API configuration objects. */
export function parseClassroomConfigInput(input: unknown): ClassroomConfig {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new ClassroomConfigValidationError("configuration must be an object.");
  }

  const value = input as Record<string, unknown>;
  const expectedKeys = [
    ...Object.keys(CLASSROOM_CONFIG_INPUT_RULES),
    ...BOOLEAN_KEYS,
  ].sort();
  const actualKeys = Object.keys(value).sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new ClassroomConfigValidationError(
      "configuration contains unsupported or missing fields.",
    );
  }

  assertNumberRules(value, CLASSROOM_CONFIG_INPUT_RULES);
  assertBooleanRules(value);
  assertOperatingDayConsistency(value as unknown as ClassroomConfig);

  return { ...(value as unknown as ClassroomConfig) };
}

/** Defensive domain boundary before simulation/optimizer orchestration. */
export function assertValidClassroomConfig(
  config: Readonly<ClassroomConfig>,
): void {
  assertNumberRules(
    config as unknown as Record<string, unknown>,
    DOMAIN_RULES,
  );
  assertBooleanRules(config as unknown as Record<string, unknown>);
}

/**
 * Normalizes one dashboard edit. Empty/non-finite values are rejected by
 * retaining the current value; finite outliers are clamped at this boundary.
 */
export function normalizeClassroomConfigEdit<K extends keyof ClassroomConfig>(
  current: Readonly<ClassroomConfig>,
  key: K,
  candidate: ClassroomConfig[K],
): ClassroomConfig {
  if ((BOOLEAN_KEYS as readonly (keyof ClassroomConfig)[]).includes(key)) {
    return typeof candidate === "boolean"
      ? { ...current, [key]: candidate }
      : { ...current };
  }

  if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
    return { ...current };
  }

  const rule = CLASSROOM_CONFIG_INPUT_RULES[key as ClassroomConfigNumberKey];
  let normalized = Math.min(rule.maximum, Math.max(rule.minimum, candidate));
  if ("integer" in rule && rule.integer) normalized = Math.round(normalized);

  const next = { ...current, [key]: normalized } as ClassroomConfig;
  return reconcileOperatingDays(next, key);
}

function reconcileOperatingDays<K extends keyof ClassroomConfig>(
  config: ClassroomConfig,
  editedKey: K,
): ClassroomConfig {
  if (config.operatingDaysPerMonth <= config.operatingDaysPerYear) {
    return config;
  }

  return editedKey === "operatingDaysPerYear"
    ? {
        ...config,
        operatingDaysPerMonth: config.operatingDaysPerYear,
      }
    : {
        ...config,
        operatingDaysPerYear: config.operatingDaysPerMonth,
      };
}

function assertNumberRules(
  value: Readonly<Record<string, unknown>>,
  rules: Readonly<Record<ClassroomConfigNumberKey, NumberRule>>,
): void {
  for (const [key, rule] of Object.entries(rules) as Array<
    [ClassroomConfigNumberKey, NumberRule]
  >) {
    const candidate = value[key];
    if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
      throwNumberRuleError(key, rule);
    }
    const belowMinimum = rule.minimum !== undefined && (
      rule.exclusiveMinimum
        ? candidate <= rule.minimum
        : candidate < rule.minimum
    );
    const aboveMaximum =
      rule.maximum !== undefined && candidate > rule.maximum;
    if (belowMinimum || aboveMaximum) throwNumberRuleError(key, rule);
    if (rule.integer && !Number.isInteger(candidate)) {
      throw new ClassroomConfigValidationError(
        `configuration.${key} must be an integer.`,
      );
    }
  }
}

function throwNumberRuleError(
  key: ClassroomConfigNumberKey,
  rule: Readonly<NumberRule>,
): never {
  const range = formatNumberRule(rule);
  throw new ClassroomConfigValidationError(
    `configuration.${key} must be a finite number${range}.`,
  );
}

function formatNumberRule(rule: Readonly<NumberRule>): string {
  if (rule.minimum !== undefined && rule.maximum !== undefined) {
    return rule.exclusiveMinimum
      ? ` greater than ${rule.minimum} and at most ${rule.maximum}`
      : ` from ${rule.minimum} to ${rule.maximum}`;
  }
  if (rule.minimum !== undefined) {
    return rule.exclusiveMinimum
      ? ` greater than ${rule.minimum}`
      : ` of at least ${rule.minimum}`;
  }
  if (rule.maximum !== undefined) return ` of at most ${rule.maximum}`;
  return "";
}

function assertBooleanRules(value: Readonly<Record<string, unknown>>): void {
  for (const key of BOOLEAN_KEYS) {
    if (typeof value[key] !== "boolean") {
      throw new ClassroomConfigValidationError(
        `configuration.${key} must be a boolean.`,
      );
    }
  }
}

function assertOperatingDayConsistency(
  config: Readonly<ClassroomConfig>,
): void {
  if (config.operatingDaysPerMonth > config.operatingDaysPerYear) {
    throw new ClassroomConfigValidationError(
      "configuration operating days must not have monthly days exceed annual days.",
    );
  }
}
