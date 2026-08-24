import type { ComponentImpact, ImpactDirection } from "../impact/types";
import type { ScenarioParameter } from "../scenarios/types";
import type {
  ExplanationAssumptionSection,
  ExplanationComparisonBasis,
  ExplanationEvidence,
  ExplanationFallbackReason,
  ExplanationReason,
  ExplanationResult,
} from "./types";
import type { ExplanationProvider } from "./provider";

export const DETERMINISTIC_EXPLANATION_PROVIDER_ID =
  "ecotwin-deterministic";

/** Offline provider that summarizes only the supplied evidence fields. */
export const deterministicExplanationProvider: ExplanationProvider = {
  id: DETERMINISTIC_EXPLANATION_PROVIDER_ID,
  kind: "deterministic",
  explain: (evidence) => createDeterministicExplanation(evidence),
};

export function createDeterministicExplanation(
  evidence: Readonly<ExplanationEvidence>,
  fallbackReason: ExplanationFallbackReason | null = null,
): ExplanationResult {
  return {
    summary: createSummary(evidence),
    whyItChanged: createReasons(evidence),
    recommendedActions: evidence.recommendations.map((recommendation) => ({
      recommendation: structuredClone(recommendation),
      rationale: recommendation.parameterChange
        ? "This action is supported by the optimizer and component impact evidence."
        : "The supplied optimizer evidence supports maintaining the current controls.",
    })),
    modeledImpact: {
      explanation: describeImpact(
        evidence.comparisons.responseImpact.impact,
      ),
      comparisonBasis: structuredClone(
        evidence.comparisons.responseImpact.basis,
      ),
      impact: structuredClone(evidence.comparisons.responseImpact.impact),
    },
    assumptions: createAssumptionSections(evidence),
    warnings: [...evidence.warnings],
    provenance: structuredClone(evidence.provenance),
    source: {
      kind: "deterministic",
      providerId: DETERMINISTIC_EXPLANATION_PROVIDER_ID,
      fallbackReason,
    },
  };
}

function createSummary(evidence: Readonly<ExplanationEvidence>): string {
  const direction = evidence.comparisons.responseImpact.impact.direction;

  if (evidence.mode === "scenario-response") {
    if (direction === "neutral") {
      return "The modeled scenario is already at the EcoTwin response state, so no further control change is recommended.";
    }
    return direction === "improvement"
      ? "EcoTwin recommends a response that lowers modeled energy relative to the unmitigated scenario."
      : "Within the supplied constraints, the EcoTwin response has higher modeled energy than the unmitigated scenario.";
  }

  if (direction === "neutral") {
    return "The current controls are already at the modeled EcoTwin plan, so no change is recommended.";
  }
  return direction === "improvement"
    ? "EcoTwin recommends control changes that lower modeled energy from the current state."
    : "Within the supplied constraints, the EcoTwin response has higher modeled energy than the current state.";
}

function createReasons(
  evidence: Readonly<ExplanationEvidence>,
): ExplanationReason[] {
  const reasons: ExplanationReason[] = [];
  const scenarioComparison = evidence.comparisons.scenarioChange;

  if (scenarioComparison) {
    reasons.push(
      ...evidence.parameterChanges.scenario.map((change) => ({
        explanation: describeScenarioChange(change.parameter),
        comparisonBasis: structuredClone(scenarioComparison.basis),
        scenarioChange: structuredClone(change),
        componentImpact: null,
      })),
    );
    reasons.push(
      ...componentReasons(
        scenarioComparison.impact.majorContributors,
        scenarioComparison.basis,
        "scenario",
      ),
    );
  }

  reasons.push(
    ...componentReasons(
      evidence.comparisons.responseImpact.impact.majorContributors,
      evidence.comparisons.responseImpact.basis,
      "response",
    ),
  );

  if (reasons.length === 0) {
    reasons.push({
      explanation:
        "The compared states have no modeled component energy change.",
      comparisonBasis: structuredClone(
        evidence.comparisons.responseImpact.basis,
      ),
      scenarioChange: null,
      componentImpact: null,
    });
  }

  return reasons;
}

function componentReasons(
  components: readonly ComponentImpact[],
  basis: Readonly<ExplanationComparisonBasis>,
  comparison: "scenario" | "response",
): ExplanationReason[] {
  return components.map((component) => ({
    explanation:
      comparison === "scenario"
        ? `The modeled ${componentLabel(component.component)} change is a major contributor to the scenario impact.`
        : `The modeled ${componentLabel(component.component)} change is a major contributor to the response impact.`,
    comparisonBasis: structuredClone(basis),
    scenarioChange: null,
    componentImpact: structuredClone(component),
  }));
}

function describeScenarioChange(parameter: ScenarioParameter): string {
  const descriptions: Record<ScenarioParameter, string> = {
    outsideTemperatureC:
      "The scenario changes the modeled outdoor temperature while retaining the supplied controls.",
    occupants:
      "The scenario changes modeled occupancy without assuming that classroom systems are switched off.",
    thermostatTemperatureC:
      "The scenario changes the modeled thermostat control setting.",
    lightingLevelPercent:
      "The scenario changes the modeled lighting control setting.",
    devicePowerW:
      "The scenario changes the modeled device power allowance.",
  };
  return descriptions[parameter];
}

function componentLabel(component: ComponentImpact["component"]): string {
  if (component === "hvac") return "heating and cooling";
  if (component === "lighting") return "lighting";
  return "device";
}

function describeImpact(
  impact: Readonly<ExplanationEvidence["comparisons"]["responseImpact"]["impact"]>,
): string {
  const directions: ImpactDirection[] = [
    impact.energyKWh.annual.direction,
    impact.co2Kg.annual.direction,
    impact.cost.annual.direction,
  ];
  if (directions.every((direction) => direction === "improvement")) {
    return "The candidate state has lower modeled energy, emissions, and cost than the comparison baseline.";
  }
  if (directions.every((direction) => direction === "degradation")) {
    return "The candidate state has higher modeled energy, emissions, and cost than the comparison baseline within the supplied constraints.";
  }
  if (directions.every((direction) => direction === "neutral")) {
    return "The candidate and comparison baseline have no modeled energy, emissions, or cost difference.";
  }
  return "The structured impact fields show a mixed modeled outcome across energy, emissions, and cost.";
}

function createAssumptionSections(
  evidence: Readonly<ExplanationEvidence>,
): ExplanationAssumptionSection[] {
  return [
    {
      state: "current",
      values: structuredClone(evidence.assumptions.current),
      explanation:
        "These are the simulator assumptions supplied for the current state.",
    },
    ...(evidence.assumptions.scenarioWithoutResponse
      ? [
          {
            state: "scenario-without-response" as const,
            values: structuredClone(
              evidence.assumptions.scenarioWithoutResponse,
            ),
            explanation:
              "These are the simulator assumptions supplied for the unmitigated scenario state.",
          },
        ]
      : []),
    {
      state: "ecotwin-response",
      values: structuredClone(evidence.assumptions.ecoTwinResponse),
      explanation:
        "These are the simulator assumptions supplied for the EcoTwin response state.",
    },
  ];
}
