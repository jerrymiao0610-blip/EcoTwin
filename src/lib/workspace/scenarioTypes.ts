import type {
  ImpactDirection,
  ImpactReport,
} from "../impact/types";
import type {
  BuiltInScenarioId,
  ScenarioChange,
  ScenarioComparison,
  ScenarioDefinition,
} from "../scenarios/types";
import type { SimulationAssumptions } from "../simulation";
import type { ImpactDeltaPresentation } from "./impactPresentation";
import type { WorkspaceResultSummary } from "./types";

/** Daily energy change prepared for both numeric and human-readable display. */
export interface ScenarioEnergyDeltaPresentation
  extends ImpactDeltaPresentation {
  unit: "kWh/day";
  comparisonText: string;
  outcomeText: "Energy saved" | "Additional energy" | "No modeled change";
}

/** Source records retained so every presented scenario remains traceable. */
export interface ScenarioWorkspaceEvidence {
  scenarioDefinition: ScenarioDefinition;
  scenarioComparison: ScenarioComparison;
  baselineAssumptions: SimulationAssumptions;
  scenarioAssumptions: SimulationAssumptions;
}

/** Pure presentation model consumed by the future Scenario Experience UI. */
export interface ScenarioWorkspaceModel {
  id: BuiltInScenarioId;
  title: string;
  description: string;
  changes: ScenarioChange[];
  baseline: WorkspaceResultSummary;
  scenario: WorkspaceResultSummary;
  direction: ImpactDirection;
  energyDelta: ScenarioEnergyDeltaPresentation;
  impact: ImpactReport;
  evidence: ScenarioWorkspaceEvidence;
  warnings: string[];
}
