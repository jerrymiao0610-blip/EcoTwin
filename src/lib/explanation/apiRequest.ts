import type { BuiltInScenarioId } from "../scenarios/types";
import type { ClassroomConfig } from "../simulation";
import {
  ClassroomConfigValidationError,
  parseClassroomConfigInput,
} from "../validation/classroomConfig";

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
  try {
    return parseClassroomConfigInput(input);
  } catch (error) {
    if (error instanceof ClassroomConfigValidationError) {
      throw new ExplanationRequestError(error.message);
    }
    throw error;
  }
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
