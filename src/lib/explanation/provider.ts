import {
  createDeterministicExplanation,
  DETERMINISTIC_EXPLANATION_PROVIDER_ID,
} from "./deterministicProvider";
import type {
  ExplanationAssumptionSection,
  ExplanationEvidence,
  ExplanationFallbackReason,
  ExplanationProviderKind,
  ExplanationResult,
  ExplanationSource,
} from "./types";

/** Vendor-neutral boundary for future hosted or local explanation providers. */
export interface ExplanationProvider {
  readonly id: string;
  readonly kind: ExplanationProviderKind;
  explain(
    evidence: Readonly<ExplanationEvidence>,
  ): Promise<ExplanationResult> | ExplanationResult;
}

export class ExplanationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExplanationValidationError";
  }
}

/**
 * Runs a configured provider and falls back deterministically on provider or
 * validation failure. The provider receives a detached evidence copy.
 */
export async function explainEvidence(
  evidence: Readonly<ExplanationEvidence>,
  provider?: ExplanationProvider,
): Promise<ExplanationResult> {
  if (!provider) {
    return validateExplanationResult(
      evidence,
      createDeterministicExplanation(
        evidence,
        "provider-not-configured",
      ),
      {
        id: DETERMINISTIC_EXPLANATION_PROVIDER_ID,
        kind: "deterministic",
      },
    );
  }

  let candidate: ExplanationResult;
  try {
    candidate = await provider.explain(structuredClone(evidence));
  } catch {
    return deterministicFallback(evidence, "provider-error");
  }

  try {
    return validateExplanationResult(evidence, candidate, provider);
  } catch (error) {
    if (error instanceof ExplanationValidationError) {
      return deterministicFallback(evidence, "invalid-provider-result");
    }
    throw error;
  }
}

/**
 * Validates required sections and guarantees that all trusted facts exactly
 * match the evidence. Provider-authored prose cannot contain numeric claims;
 * numbers are carried only in the validated structured fields.
 */
export function validateExplanationResult(
  evidence: Readonly<ExplanationEvidence>,
  result: unknown,
  expectedProvider?: Pick<ExplanationProvider, "id" | "kind">,
): ExplanationResult {
  const candidate = requireRecord(result, "Explanation result");

  requireGroundedProse(candidate.summary, "summary");
  validateReasons(evidence, candidate.whyItChanged);
  validateRecommendedActions(evidence, candidate.recommendedActions);
  validateModeledImpact(evidence, candidate.modeledImpact);
  validateAssumptions(evidence, candidate.assumptions);
  requireTrustedEqual(candidate.warnings, evidence.warnings, "warnings");
  requireTrustedEqual(
    candidate.provenance,
    evidence.provenance,
    "provenance",
  );
  validateSource(candidate.source, expectedProvider);

  return {
    summary: candidate.summary as string,
    whyItChanged: structuredClone(
      candidate.whyItChanged,
    ) as ExplanationResult["whyItChanged"],
    recommendedActions: structuredClone(
      candidate.recommendedActions,
    ) as ExplanationResult["recommendedActions"],
    modeledImpact: structuredClone(
      candidate.modeledImpact,
    ) as ExplanationResult["modeledImpact"],
    assumptions: structuredClone(
      candidate.assumptions,
    ) as ExplanationResult["assumptions"],
    warnings: structuredClone(
      candidate.warnings,
    ) as ExplanationResult["warnings"],
    provenance: structuredClone(
      candidate.provenance,
    ) as ExplanationResult["provenance"],
    source: structuredClone(candidate.source) as ExplanationResult["source"],
  };
}

function validateReasons(
  evidence: Readonly<ExplanationEvidence>,
  reasons: unknown,
): void {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    fail("whyItChanged must contain at least one grounded reason.");
  }

  const validBases = [
    evidence.comparisons.responseImpact.basis,
    ...(evidence.comparisons.scenarioChange
      ? [evidence.comparisons.scenarioChange.basis]
      : []),
  ];
  for (const [index, value] of reasons.entries()) {
    const reason = requireRecord(value, `whyItChanged[${index}]`);
    requireGroundedProse(
      reason.explanation,
      `whyItChanged[${index}].explanation`,
    );
    requireMember(
      reason.comparisonBasis,
      validBases,
      `whyItChanged[${index}].comparisonBasis`,
    );
    const comparison = comparisonForBasis(
      evidence,
      reason.comparisonBasis,
    );
    if (reason.scenarioChange !== null) {
      if (
        !evidence.comparisons.scenarioChange ||
        !trustedEqual(
          reason.comparisonBasis,
          evidence.comparisons.scenarioChange.basis,
        )
      ) {
        fail(
          `whyItChanged[${index}].scenarioChange uses the wrong comparison basis.`,
        );
      }
      requireMember(
        reason.scenarioChange,
        evidence.parameterChanges.scenario,
        `whyItChanged[${index}].scenarioChange`,
      );
    }
    requireNullableMember(
      reason.componentImpact,
      comparison.impact.components,
      `whyItChanged[${index}].componentImpact`,
    );
  }
}

function comparisonForBasis(
  evidence: Readonly<ExplanationEvidence>,
  basis: unknown,
): ExplanationEvidence["comparisons"]["responseImpact"] {
  if (trustedEqual(basis, evidence.comparisons.responseImpact.basis)) {
    return evidence.comparisons.responseImpact;
  }
  if (
    evidence.comparisons.scenarioChange &&
    trustedEqual(basis, evidence.comparisons.scenarioChange.basis)
  ) {
    return evidence.comparisons.scenarioChange;
  }
  fail("Reason comparison basis is not present in the evidence.");
}

function validateRecommendedActions(
  evidence: Readonly<ExplanationEvidence>,
  actions: unknown,
): void {
  if (!Array.isArray(actions)) {
    fail("recommendedActions must be an array.");
  }
  if (actions.length !== evidence.recommendations.length) {
    fail("recommendedActions must preserve every supplied recommendation.");
  }

  for (const [index, value] of actions.entries()) {
    const action = requireRecord(value, `recommendedActions[${index}]`);
    requireTrustedEqual(
      action.recommendation,
      evidence.recommendations[index],
      `recommendedActions[${index}].recommendation`,
    );
    requireGroundedProse(
      action.rationale,
      `recommendedActions[${index}].rationale`,
    );
  }
}

function validateModeledImpact(
  evidence: Readonly<ExplanationEvidence>,
  modeledImpact: unknown,
): void {
  const impact = requireRecord(modeledImpact, "modeledImpact");
  requireGroundedProse(impact.explanation, "modeledImpact.explanation");
  requireTrustedEqual(
    impact.comparisonBasis,
    evidence.comparisons.responseImpact.basis,
    "modeledImpact.comparisonBasis",
  );
  requireTrustedEqual(
    impact.impact,
    evidence.comparisons.responseImpact.impact,
    "modeledImpact.impact",
  );
}

function validateAssumptions(
  evidence: Readonly<ExplanationEvidence>,
  assumptions: unknown,
): void {
  if (!Array.isArray(assumptions)) {
    fail("assumptions must be an array.");
  }

  const expected = expectedAssumptions(evidence);
  if (assumptions.length !== expected.length) {
    fail("assumptions must preserve every represented state.");
  }

  for (const [index, value] of assumptions.entries()) {
    const section = requireRecord(value, `assumptions[${index}]`);
    requireTrustedEqual(
      section.state,
      expected[index].state,
      `assumptions[${index}].state`,
    );
    requireTrustedEqual(
      section.values,
      expected[index].values,
      `assumptions[${index}].values`,
    );
    requireGroundedProse(
      section.explanation,
      `assumptions[${index}].explanation`,
    );
  }
}

function expectedAssumptions(
  evidence: Readonly<ExplanationEvidence>,
): Array<Omit<ExplanationAssumptionSection, "explanation">> {
  return [
    { state: "current", values: evidence.assumptions.current },
    ...(evidence.assumptions.scenarioWithoutResponse
      ? [
          {
            state: "scenario-without-response" as const,
            values: evidence.assumptions.scenarioWithoutResponse,
          },
        ]
      : []),
    {
      state: "ecotwin-response",
      values: evidence.assumptions.ecoTwinResponse,
    },
  ];
}

function validateSource(
  source: unknown,
  expectedProvider?: Pick<ExplanationProvider, "id" | "kind">,
): void {
  const value = requireRecord(source, "source");
  if (value.kind !== "ai" && value.kind !== "deterministic") {
    fail("source.kind must identify AI or deterministic output.");
  }
  if (typeof value.providerId !== "string" || value.providerId.trim() === "") {
    fail("source.providerId is required.");
  }
  if (!isFallbackReason(value.fallbackReason)) {
    fail("source.fallbackReason is invalid.");
  }
  if (value.kind === "ai" && value.fallbackReason !== null) {
    fail("AI provider output cannot claim a deterministic fallback reason.");
  }
  if (
    expectedProvider &&
    (value.providerId !== expectedProvider.id ||
      value.kind !== expectedProvider.kind)
  ) {
    fail("source metadata does not match the invoked provider.");
  }
}

function isFallbackReason(value: unknown): value is ExplanationFallbackReason | null {
  return (
    value === null ||
    value === "provider-not-configured" ||
    value === "provider-error" ||
    value === "invalid-provider-result"
  );
}

function requireGroundedProse(value: unknown, path: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${path} must be a non-empty string.`);
  }
  if (/\d/u.test(value)) {
    fail(
      `${path} contains a numeric claim; trusted numbers must remain in structured fields.`,
    );
  }
}

function requireMember(
  value: unknown,
  members: readonly unknown[],
  path: string,
): void {
  if (!members.some((member) => trustedEqual(value, member))) {
    fail(`${path} is not present in the supplied evidence.`);
  }
}

function requireNullableMember(
  value: unknown,
  members: readonly unknown[],
  path: string,
): void {
  if (value !== null) requireMember(value, members, path);
}

function requireTrustedEqual(
  actual: unknown,
  expected: unknown,
  path: string,
): void {
  if (!trustedEqual(actual, expected)) {
    fail(`${path} does not match trusted evidence.`);
  }
}

function trustedEqual(left: unknown, right: unknown): boolean {
  return stableSerialize(left) === stableSerialize(right);
}

function stableSerialize(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`)
    .join(",")}}`;
}

function requireRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function fail(message: string): never {
  throw new ExplanationValidationError(message);
}

function deterministicFallback(
  evidence: Readonly<ExplanationEvidence>,
  reason: ExplanationFallbackReason,
): ExplanationResult {
  const result = createDeterministicExplanation(evidence, reason);
  return validateExplanationResult(evidence, result, {
    id: DETERMINISTIC_EXPLANATION_PROVIDER_ID,
    kind: "deterministic",
  });
}

export type { ExplanationSource };
