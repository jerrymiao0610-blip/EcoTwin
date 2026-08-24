import type { BuiltInScenarioId } from "../scenarios/types";
import type { ClassroomConfig } from "../simulation";

export type ExplanationApiRequest =
  | {
      mode: "current-decision";
      configuration: ClassroomConfig;
    }
  | {
      mode: "scenario-response";
      configuration: ClassroomConfig;
      scenarioId: BuiltInScenarioId;
    };

const NUMBER_RANGES = {
  roomAreaM2: [10, 250],
  occupants: [0, 100],
  outsideTemperatureC: [-10, 45],
  thermostatTemperatureC: [16, 30],
  operatingHoursPerDay: [0, 16],
  operatingDaysPerMonth: [0, 31],
  operatingDaysPerYear: [0, 366],
  lightingLevelPercent: [0, 100],
  lightingPowerDensityWPerM2: [0, 25],
  devicePowerW: [0, 6_000],
  electricityPricePerKWh: [0, 10],
  carbonIntensityKgPerKWh: [0, 10],
} as const satisfies Record<
  Exclude<keyof ClassroomConfig, "hvacEnabled" | "lightsEnabled" | "devicesEnabled">,
  readonly [number, number]
>;

const BOOLEAN_KEYS = [
  "hvacEnabled",
  "lightsEnabled",
  "devicesEnabled",
] as const satisfies readonly (keyof ClassroomConfig)[];

const SCENARIO_IDS: readonly BuiltInScenarioId[] = [
  "heatwave-tomorrow",
  "empty-classroom",
  "eco-mode",
];

export class ExplanationRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplanationRequestError";
  }
}

/** Strictly accepts the small, non-prompt request used by the explanation route. */
export function parseExplanationApiRequest(input: unknown): ExplanationApiRequest {
  const request = requireRecord(input, "Explanation request");
  const configuration = parseConfiguration(request.configuration);

  if (request.mode === "current-decision") {
    requireExactKeys(request, ["mode", "configuration"]);
    return { mode: request.mode, configuration };
  }

  if (request.mode === "scenario-response") {
    requireExactKeys(request, ["mode", "configuration", "scenarioId"]);
    if (!SCENARIO_IDS.includes(request.scenarioId as BuiltInScenarioId)) {
      throw new ExplanationRequestError("scenarioId must name a built-in EcoTwin scenario.");
    }
    return {
      mode: request.mode,
      configuration,
      scenarioId: request.scenarioId as BuiltInScenarioId,
    };
  }

  throw new ExplanationRequestError("mode must identify a supported explanation experience.");
}

/** Stable key used to prevent old results from appearing current after inputs change. */
export function explanationRequestKey(request: Readonly<ExplanationApiRequest>): string {
  return JSON.stringify(request);
}

export function isExplanationResultStale(
  generatedForKey: string,
  currentRequestKey: string,
): boolean {
  return generatedForKey !== currentRequestKey;
}

function parseConfiguration(input: unknown): ClassroomConfig {
  const value = requireRecord(input, "configuration");
  requireExactKeys(value, [...Object.keys(NUMBER_RANGES), ...BOOLEAN_KEYS]);

  const parsed = {} as ClassroomConfig;
  for (const [key, [minimum, maximum]] of Object.entries(NUMBER_RANGES)) {
    const candidate = value[key];
    if (
      typeof candidate !== "number" ||
      !Number.isFinite(candidate) ||
      candidate < minimum ||
      candidate > maximum
    ) {
      throw new ExplanationRequestError(
        `configuration.${key} must be a finite number from ${minimum} to ${maximum}.`,
      );
    }
    (parsed as unknown as Record<string, number | boolean>)[key] = candidate;
  }

  for (const key of BOOLEAN_KEYS) {
    if (typeof value[key] !== "boolean") {
      throw new ExplanationRequestError(`configuration.${key} must be a boolean.`);
    }
    (parsed as unknown as Record<string, number | boolean>)[key] = value[key] as boolean;
  }

  return parsed;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ExplanationRequestError(`${label} must be an object.`);
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
    throw new ExplanationRequestError("Explanation request contains unsupported fields.");
  }
}
