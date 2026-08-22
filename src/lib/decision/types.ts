import type {
  ImpactComponent,
  ImpactDirection,
  ImpactReport,
} from "../impact/types";
import type {
  OptimizerConstraints,
  ParameterChange,
} from "../optimizer/types";
import type { ClassroomConfig, SimulationResult } from "../simulation";

export type RecommendationPriority = "high" | "medium" | "low" | "none";

/** Simulator and impact outputs supporting a recommendation. */
export interface RecommendationEvidence {
  component: ImpactComponent | null;
  componentDailyEnergyChangeKWh: number;
  componentContributionPercent: number;
  annualEnergyChangeKWh: number;
  annualCO2ChangeKg: number;
  annualCostChange: number;
}

/** An actionable optimizer change with enough evidence to explain why it matters. */
export interface DecisionRecommendation {
  id: string;
  priority: RecommendationPriority;
  action: string;
  explanation: string;
  parameterChange: ParameterChange | null;
  evidence: RecommendationEvidence;
}

/** Deterministic execution details and configuration provenance. */
export interface DecisionMetadata {
  pipelineVersion: string;
  impactDirection: ImpactDirection;
  optimizerSearchSpaceSize: number;
  changedParameterCount: number;
  recommendationCount: number;
  baselineConfiguration: ClassroomConfig;
  optimizedConfiguration: ClassroomConfig;
}

/** Complete output of the EcoTwin decision workflow. */
export interface DecisionPackage {
  baselineSimulation: SimulationResult;
  optimizedSimulation: SimulationResult;
  impactReport: ImpactReport;
  recommendations: DecisionRecommendation[];
  metadata: DecisionMetadata;
}

export interface DecisionPipelineOptions {
  optimizerConstraints?: OptimizerConstraints;
}
