import type {
  ComponentImpact,
  ImpactDirection,
  PeriodImpact,
} from "../impact/types";
import type { ParameterChange } from "../optimizer/types";
import type {
  ClassroomConfig,
  HvacMode,
  SimulationAssumptions,
} from "../simulation";
import type { TwinSnapshotMetadata } from "../twin/types";
import type {
  RecommendationEvidence,
  RecommendationPriority,
} from "../decision/types";

/** Stable classroom identity and physical facts used by workspace headers. */
export interface WorkspaceClassroomIdentity {
  id: string | null;
  name: string | null;
  roomAreaM2: number;
  lightingPowerDensityWPerM2: number;
}

/** Real-world and operating conditions behind the represented decision. */
export interface WorkspaceRealWorldContext {
  occupants: number;
  outsideTemperatureC: number;
  operatingHoursPerDay: number;
  operatingDaysPerMonth: number;
  operatingDaysPerYear: number;
  electricityPricePerKWh: number;
  carbonIntensityKgPerKWh: number;
}

export interface WorkspacePeriodValues {
  daily: number;
  monthly: number;
  annual: number;
}

export interface WorkspaceEnergyComponents {
  hvacKWh: number;
  lightingKWh: number;
  devicesKWh: number;
}

/** Existing simulator output grouped for a baseline or optimized result card. */
export interface WorkspaceResultSummary {
  configuration: ClassroomConfig;
  energyKWh: WorkspacePeriodValues;
  co2Kg: WorkspacePeriodValues;
  cost: WorkspacePeriodValues;
  dailyEnergyByComponent: WorkspaceEnergyComponents;
  hvacMode: HvacMode;
  ecoScore: number;
}

/** A presentation card that retains every traceable decision recommendation field. */
export interface WorkspaceRecommendationCard {
  id: string;
  priority: RecommendationPriority;
  action: string;
  explanation: string;
  parameterChange: ParameterChange | null;
  evidence: RecommendationEvidence;
}

/** Impact analysis regrouped for workspace comparison panels. */
export interface WorkspaceImpactSummary {
  direction: ImpactDirection;
  energyKWh: PeriodImpact;
  co2Kg: PeriodImpact;
  cost: PeriodImpact;
  components: ComponentImpact[];
  majorContributors: ComponentImpact[];
}

export interface WorkspacePipelineEvidence {
  version: string;
  impactDirection: ImpactDirection;
  optimizerSearchSpaceSize: number;
  changedParameterCount: number;
  recommendationCount: number;
}

/** Calculation assumptions and source metadata supporting the displayed result. */
export interface WorkspaceEvidence {
  pipeline: WorkspacePipelineEvidence;
  snapshotMetadata: TwinSnapshotMetadata | null;
  baselineAssumptions: SimulationAssumptions;
  optimizedAssumptions: SimulationAssumptions;
}

/** Pure presentation model consumed by a future Decision Workspace UI. */
export interface WorkspaceModel {
  classroom: WorkspaceClassroomIdentity;
  context: WorkspaceRealWorldContext;
  baseline: WorkspaceResultSummary;
  optimized: WorkspaceResultSummary;
  recommendations: WorkspaceRecommendationCard[];
  impact: WorkspaceImpactSummary;
  evidence: WorkspaceEvidence;
  warnings: string[];
}
