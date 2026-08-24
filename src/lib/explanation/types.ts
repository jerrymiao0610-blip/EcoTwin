import type { ComponentImpact } from "../impact/types";
import type { ParameterChange } from "../optimizer/types";
import type { BuiltInScenarioId, ScenarioChange } from "../scenarios/types";
import type { SimulationAssumptions } from "../simulation";
import type { TwinSnapshotMetadata } from "../twin/types";
import type {
  WorkspaceClassroomIdentity,
  WorkspaceImpactSummary,
  WorkspacePipelineEvidence,
  WorkspaceRealWorldContext,
  WorkspaceRecommendationCard,
  WorkspaceResultSummary,
} from "../workspace/types";

export type ExplanationMode = "current-decision" | "scenario-response";

export type ExplanationStateId =
  | "current"
  | "scenario-without-response"
  | "ecotwin-response";

export interface ExplanationScenarioIdentity {
  id: BuiltInScenarioId;
  title: string;
  description: string;
}

export interface ExplanationContext {
  classroom: WorkspaceClassroomIdentity;
  realWorld: WorkspaceRealWorldContext;
  scenario: ExplanationScenarioIdentity | null;
}

export interface ExplanationStates {
  current: WorkspaceResultSummary;
  scenarioWithoutResponse: WorkspaceResultSummary | null;
  ecoTwinResponse: WorkspaceResultSummary;
}

export interface ExplanationParameterChanges {
  scenario: ScenarioChange[];
  response: ParameterChange[];
}

/** Names both sides so a provider cannot silently change the comparison. */
export interface ExplanationComparisonBasis {
  baseline: ExplanationStateId;
  candidate: ExplanationStateId;
  label: string;
}

export interface ExplanationComparisonEvidence {
  basis: ExplanationComparisonBasis;
  impact: WorkspaceImpactSummary;
}

export interface ExplanationComparisons {
  /** Current vs Scenario. Present only in scenario-response mode. */
  scenarioChange: ExplanationComparisonEvidence | null;
  /** Current vs Response, or Scenario without response vs Response. */
  responseImpact: ExplanationComparisonEvidence;
}

export interface ExplanationAssumptions {
  current: SimulationAssumptions;
  scenarioWithoutResponse: SimulationAssumptions | null;
  ecoTwinResponse: SimulationAssumptions;
}

export interface ExplanationProvenance {
  evidenceSchemaVersion: string;
  origin:
    | "decision-package"
    | "scenario-workspace-and-response";
  pipelineVersion: string;
  snapshotMetadata: TwinSnapshotMetadata | null;
}

/**
 * Complete provider input. Every number is copied from an established product
 * structure; this module does not calculate energy, emissions, cost, savings,
 * percentages, component rankings, or optimizer outcomes.
 */
export interface ExplanationEvidence {
  mode: ExplanationMode;
  context: ExplanationContext;
  states: ExplanationStates;
  parameterChanges: ExplanationParameterChanges;
  recommendations: WorkspaceRecommendationCard[];
  comparisons: ExplanationComparisons;
  assumptions: ExplanationAssumptions;
  optimizer: WorkspacePipelineEvidence;
  provenance: ExplanationProvenance;
  warnings: string[];
  groundingRules: string[];
}

export type ExplanationProviderKind = "ai" | "deterministic";

export type ExplanationFallbackReason =
  | "provider-not-configured"
  | "provider-error"
  | "invalid-provider-result";

export interface ExplanationSource {
  kind: ExplanationProviderKind;
  providerId: string;
  fallbackReason: ExplanationFallbackReason | null;
}

/** Provider-authored prose paired with exact structured source grounding. */
export interface ExplanationReason {
  explanation: string;
  comparisonBasis: ExplanationComparisonBasis;
  scenarioChange: ScenarioChange | null;
  componentImpact: ComponentImpact | null;
}

/** The displayed action remains the original deterministic recommendation. */
export interface ExplanationRecommendedAction {
  recommendation: WorkspaceRecommendationCard;
  rationale: string;
}

/** Trusted impact numbers remain separate from provider-authored prose. */
export interface ExplanationModeledImpact {
  explanation: string;
  comparisonBasis: ExplanationComparisonBasis;
  impact: WorkspaceImpactSummary;
}

export interface ExplanationAssumptionSection {
  state: ExplanationStateId;
  values: SimulationAssumptions;
  explanation: string;
}

/** Concise structured contract intended for a future judge-facing UI. */
export interface ExplanationResult {
  summary: string;
  whyItChanged: ExplanationReason[];
  recommendedActions: ExplanationRecommendedAction[];
  modeledImpact: ExplanationModeledImpact;
  assumptions: ExplanationAssumptionSection[];
  warnings: string[];
  provenance: ExplanationProvenance;
  source: ExplanationSource;
}

