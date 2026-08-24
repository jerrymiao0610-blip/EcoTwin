import type { ImpactChange } from "../impact/types";
import type { BuiltInScenarioId } from "../scenarios/types";
import type { SimulationAssumptions } from "../simulation";
import type { ImpactDeltaPresentation } from "./impactPresentation";
import type {
  WorkspaceImpactSummary,
  WorkspacePipelineEvidence,
  WorkspaceRecommendationCard,
  WorkspaceResultSummary,
} from "./types";
import type { ScenarioWorkspaceEvidence } from "./scenarioTypes";

export type ScenarioResponseStatus =
  | "response-recommended"
  | "already-at-modeled-plan";

/** Explicitly distinguishes this comparison from Current vs What-if. */
export interface ScenarioResponseComparisonBasis {
  baseline: "scenario-without-response";
  candidate: "ecotwin-response";
  label: "Scenario without response vs EcoTwin response";
}

/** Signed decision-pipeline impact prepared for scenario-response UI copy. */
export interface ScenarioResponseEnergyPresentation
  extends ImpactDeltaPresentation {
  unit: "kWh/day";
  percentageChange: number | null;
  percentageMagnitude: number | null;
  amountText: string;
  comparisonText: string;
  outcomeText:
    | "Energy avoided"
    | "Additional energy"
    | "No further modeled improvement";
}

export interface ScenarioResponseAnnualImpact {
  energyKWh: ImpactChange;
  co2Kg: ImpactChange;
  cost: ImpactChange;
}

/** Existing source records and pipeline evidence behind the response. */
export interface ScenarioResponseEvidence {
  sourceScenario: ScenarioWorkspaceEvidence;
  pipeline: WorkspacePipelineEvidence;
  baselineAssumptions: SimulationAssumptions;
  optimizedAssumptions: SimulationAssumptions;
}

/**
 * Pure presentation model for Scenario without response vs EcoTwin response.
 * Every recommendation and impact originates in a scenario-specific
 * DecisionPackage.
 */
export interface ScenarioResponseModel {
  scenarioId: BuiltInScenarioId;
  scenarioTitle: string;
  scenarioDescription: string;
  status: ScenarioResponseStatus;
  statusText:
    | "EcoTwin response available"
    | "Already at the modeled EcoTwin plan";
  comparisonBasis: ScenarioResponseComparisonBasis;
  scenarioBaseline: WorkspaceResultSummary;
  optimizedResponse: WorkspaceResultSummary;
  energyDelta: ScenarioResponseEnergyPresentation;
  recommendations: WorkspaceRecommendationCard[];
  impact: WorkspaceImpactSummary;
  annualImpact: ScenarioResponseAnnualImpact;
  evidence: ScenarioResponseEvidence;
  warnings: string[];
}
