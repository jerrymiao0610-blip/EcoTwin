import type { ImpactReport } from "../impact/types";
import type { ParameterChange } from "../optimizer/types";
import type { ScenarioChange } from "../scenarios/types";
import type { ClassroomConfig, SimulationAssumptions } from "../simulation";
import type { TwinSnapshotMetadata } from "../twin/types";
import { buildWorkspace } from "../workspace/buildWorkspace";
import type { ScenarioResponseModel } from "../workspace/scenarioResponseTypes";
import type { ScenarioWorkspaceModel } from "../workspace/scenarioTypes";
import type {
  WorkspaceImpactSummary,
  WorkspaceRecommendationCard,
  WorkspaceResultSummary,
} from "../workspace/types";
import type { DecisionPackage } from "../decision/types";
import type {
  ExplanationComparisonBasis,
  ExplanationContext,
  ExplanationEvidence,
  ExplanationProvenance,
} from "./types";

export const EXPLANATION_EVIDENCE_SCHEMA_VERSION = "1.0.0";

export const CURRENT_RESPONSE_COMPARISON_BASIS = {
  baseline: "current",
  candidate: "ecotwin-response",
  label: "Current vs EcoTwin response",
} as const satisfies ExplanationComparisonBasis;

export const CURRENT_SCENARIO_COMPARISON_BASIS = {
  baseline: "current",
  candidate: "scenario-without-response",
  label: "Current vs Scenario",
} as const satisfies ExplanationComparisonBasis;

/** Instructions every provider receives alongside the trusted evidence. */
export const EXPLANATION_GROUNDING_RULES: readonly string[] = [
  "Use only facts present in this structured evidence.",
  "Never invent or recompute numerical values, savings, or percentages.",
  "Keep provider-authored prose free of numerical claims; trusted numbers remain in structured fields.",
  "Do not claim causality beyond supplied scenario changes, recommendations, and component impacts.",
  "Use modeled or estimated terminology and never claim certified building performance.",
  "Distinguish Current, Scenario without response, and EcoTwin response states.",
  "Preserve every supplied comparison basis exactly.",
  "Do not add recommendations that are absent from the evidence.",
];

/** Builds grounded evidence for the normal Current decision experience. */
export function buildCurrentDecisionEvidence(
  decision: Readonly<DecisionPackage>,
): ExplanationEvidence {
  const workspace = buildWorkspace(decision);

  return {
    mode: "current-decision",
    context: {
      classroom: { ...workspace.classroom },
      realWorld: { ...workspace.context },
      scenario: null,
    },
    states: {
      current: cloneResultSummary(workspace.baseline),
      scenarioWithoutResponse: null,
      ecoTwinResponse: cloneResultSummary(workspace.optimized),
    },
    parameterChanges: {
      scenario: [],
      response: responseParameterChanges(workspace.recommendations),
    },
    recommendations: workspace.recommendations.map(cloneRecommendation),
    comparisons: {
      scenarioChange: null,
      responseImpact: {
        basis: { ...CURRENT_RESPONSE_COMPARISON_BASIS },
        impact: cloneImpact(workspace.impact),
      },
    },
    assumptions: {
      current: cloneAssumptions(workspace.evidence.baselineAssumptions),
      scenarioWithoutResponse: null,
      ecoTwinResponse: cloneAssumptions(
        workspace.evidence.optimizedAssumptions,
      ),
    },
    optimizer: { ...workspace.evidence.pipeline },
    provenance: createProvenance(
      "decision-package",
      workspace.evidence.pipeline.version,
      workspace.evidence.snapshotMetadata,
    ),
    warnings: [...workspace.warnings],
    groundingRules: [...EXPLANATION_GROUNDING_RULES],
  };
}

/**
 * Builds evidence for both Current vs Scenario and Scenario without response
 * vs EcoTwin response. The supplied Phase 9 comparison basis is copied, not
 * inferred or replaced.
 */
export function buildScenarioResponseEvidence(
  scenario: Readonly<ScenarioWorkspaceModel>,
  response: Readonly<ScenarioResponseModel>,
): ExplanationEvidence {
  assertMatchingScenario(scenario, response);
  assertMatchingScenarioState(scenario, response);
  assertMatchingScenarioAssumptions(scenario, response);

  return {
    mode: "scenario-response",
    context: createScenarioContext(scenario),
    states: {
      current: cloneResultSummary(scenario.baseline),
      scenarioWithoutResponse: cloneResultSummary(response.scenarioBaseline),
      ecoTwinResponse: cloneResultSummary(response.optimizedResponse),
    },
    parameterChanges: {
      scenario: scenario.changes.map(cloneScenarioChange),
      response: responseParameterChanges(response.recommendations),
    },
    recommendations: response.recommendations.map(cloneRecommendation),
    comparisons: {
      scenarioChange: {
        basis: { ...CURRENT_SCENARIO_COMPARISON_BASIS },
        impact: cloneImpact(scenario.impact),
      },
      responseImpact: {
        basis: {
          baseline: response.comparisonBasis.baseline,
          candidate: response.comparisonBasis.candidate,
          label: response.comparisonBasis.label,
        },
        impact: cloneImpact(response.impact),
      },
    },
    assumptions: {
      current: cloneAssumptions(
        scenario.evidence.baselineAssumptions,
      ),
      scenarioWithoutResponse: cloneAssumptions(
        response.evidence.baselineAssumptions,
      ),
      ecoTwinResponse: cloneAssumptions(
        response.evidence.optimizedAssumptions,
      ),
    },
    optimizer: { ...response.evidence.pipeline },
    provenance: createProvenance(
      "scenario-workspace-and-response",
      response.evidence.pipeline.version,
      null,
    ),
    warnings: uniqueStrings([...scenario.warnings, ...response.warnings]),
    groundingRules: [...EXPLANATION_GROUNDING_RULES],
  };
}

function createScenarioContext(
  scenario: Readonly<ScenarioWorkspaceModel>,
): ExplanationContext {
  const configuration = scenario.baseline.configuration;

  return {
    classroom: {
      id: null,
      name: null,
      roomAreaM2: configuration.roomAreaM2,
      lightingPowerDensityWPerM2:
        configuration.lightingPowerDensityWPerM2,
    },
    realWorld: contextFromConfiguration(configuration),
    scenario: {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
    },
  };
}

function contextFromConfiguration(
  configuration: Readonly<ClassroomConfig>,
): ExplanationContext["realWorld"] {
  return {
    occupants: configuration.occupants,
    outsideTemperatureC: configuration.outsideTemperatureC,
    operatingHoursPerDay: configuration.operatingHoursPerDay,
    operatingDaysPerMonth: configuration.operatingDaysPerMonth,
    operatingDaysPerYear: configuration.operatingDaysPerYear,
    electricityPricePerKWh: configuration.electricityPricePerKWh,
    carbonIntensityKgPerKWh: configuration.carbonIntensityKgPerKWh,
  };
}

function responseParameterChanges(
  recommendations: readonly WorkspaceRecommendationCard[],
): ParameterChange[] {
  return recommendations.flatMap(({ parameterChange }) =>
    parameterChange ? [{ ...parameterChange }] : [],
  );
}

function assertMatchingScenario(
  scenario: Readonly<ScenarioWorkspaceModel>,
  response: Readonly<ScenarioResponseModel>,
): void {
  if (scenario.id !== response.scenarioId) {
    throw new Error(
      `Scenario response mismatch: expected ${scenario.id}, received ${response.scenarioId}.`,
    );
  }
}

function assertMatchingScenarioAssumptions(
  scenario: Readonly<ScenarioWorkspaceModel>,
  response: Readonly<ScenarioResponseModel>,
): void {
  if (
    stableSerialize(scenario.evidence.scenarioAssumptions) !==
    stableSerialize(response.evidence.baselineAssumptions)
  ) {
    throw new Error(
      "Scenario response assumptions do not match the unmitigated scenario.",
    );
  }
}

function assertMatchingScenarioState(
  scenario: Readonly<ScenarioWorkspaceModel>,
  response: Readonly<ScenarioResponseModel>,
): void {
  if (
    stableSerialize(scenario.scenario) !==
    stableSerialize(response.scenarioBaseline)
  ) {
    throw new Error(
      "Scenario response baseline does not match the unmitigated scenario state.",
    );
  }
}

function createProvenance(
  origin: ExplanationProvenance["origin"],
  pipelineVersion: string,
  snapshotMetadata: Readonly<TwinSnapshotMetadata> | null,
): ExplanationProvenance {
  return {
    evidenceSchemaVersion: EXPLANATION_EVIDENCE_SCHEMA_VERSION,
    origin,
    pipelineVersion,
    snapshotMetadata: snapshotMetadata
      ? cloneSnapshotMetadata(snapshotMetadata)
      : null,
  };
}

function cloneResultSummary(
  summary: Readonly<WorkspaceResultSummary>,
): WorkspaceResultSummary {
  return {
    configuration: { ...summary.configuration },
    energyKWh: { ...summary.energyKWh },
    co2Kg: { ...summary.co2Kg },
    cost: { ...summary.cost },
    dailyEnergyByComponent: { ...summary.dailyEnergyByComponent },
    hvacMode: summary.hvacMode,
    ecoScore: summary.ecoScore,
  };
}

function cloneRecommendation(
  recommendation: Readonly<WorkspaceRecommendationCard>,
): WorkspaceRecommendationCard {
  return {
    id: recommendation.id,
    priority: recommendation.priority,
    action: recommendation.action,
    explanation: recommendation.explanation,
    parameterChange: recommendation.parameterChange
      ? { ...recommendation.parameterChange }
      : null,
    evidence: { ...recommendation.evidence },
  };
}

function cloneImpact(
  impact: Readonly<ImpactReport | WorkspaceImpactSummary>,
): WorkspaceImpactSummary {
  return {
    direction: impact.direction,
    energyKWh: clonePeriodImpact(impact.energyKWh),
    co2Kg: clonePeriodImpact(impact.co2Kg),
    cost: clonePeriodImpact(impact.cost),
    components: impact.components.map((component) => ({
      component: component.component,
      energyKWh: { ...component.energyKWh },
      contributionPercent: component.contributionPercent,
    })),
    majorContributors: impact.majorContributors.map((component) => ({
      component: component.component,
      energyKWh: { ...component.energyKWh },
      contributionPercent: component.contributionPercent,
    })),
  };
}

function clonePeriodImpact(
  impact: Readonly<WorkspaceImpactSummary["energyKWh"]>,
): WorkspaceImpactSummary["energyKWh"] {
  return {
    daily: { ...impact.daily },
    monthly: { ...impact.monthly },
    annual: { ...impact.annual },
  };
}

function cloneScenarioChange(
  change: Readonly<ScenarioChange>,
): ScenarioChange {
  return { ...change };
}

function cloneAssumptions(
  assumptions: Readonly<SimulationAssumptions>,
): SimulationAssumptions {
  return { ...assumptions };
}

function cloneSnapshotMetadata(
  metadata: Readonly<TwinSnapshotMetadata>,
): TwinSnapshotMetadata {
  return {
    schemaVersion: metadata.schemaVersion,
    capturedAt: metadata.capturedAt,
    provenance: { ...metadata.provenance },
    contentHash: metadata.contentHash,
  };
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function stableSerialize(value: unknown): string {
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
