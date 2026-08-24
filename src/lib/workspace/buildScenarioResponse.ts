import { runDecisionPipeline } from "../decision/pipeline";
import type {
  DecisionPackage,
  DecisionPipelineOptions,
} from "../decision/types";
import type { ImpactChange } from "../impact/types";
import type { SimulationAssumptions } from "../simulation";
import { buildWorkspace } from "./buildWorkspace";
import { presentImpactDelta } from "./impactPresentation";
import type {
  ScenarioResponseEnergyPresentation,
  ScenarioResponseModel,
  ScenarioResponseStatus,
} from "./scenarioResponseTypes";
import type {
  ScenarioWorkspaceEvidence,
  ScenarioWorkspaceModel,
} from "./scenarioTypes";

const COMPARISON_BASIS = {
  baseline: "scenario-without-response",
  candidate: "ecotwin-response",
  label: "Scenario without response vs EcoTwin response",
} as const;

/**
 * Runs the established decision pipeline with the What-if scenario state as
 * its baseline, then maps that DecisionPackage into detached response data.
 */
export function buildScenarioResponse(
  scenario: Readonly<ScenarioWorkspaceModel>,
  options: Readonly<DecisionPipelineOptions> = {},
): ScenarioResponseModel {
  const scenarioConfiguration = { ...scenario.scenario.configuration };
  const decision = runDecisionPipeline(scenarioConfiguration, options);
  const workspace = buildWorkspace(decision);
  const status = getResponseStatus(decision);

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    scenarioDescription: scenario.description,
    status,
    statusText:
      status === "already-at-modeled-plan"
        ? "Already at the modeled EcoTwin plan"
        : "EcoTwin response available",
    comparisonBasis: { ...COMPARISON_BASIS },
    scenarioBaseline: workspace.baseline,
    optimizedResponse: workspace.optimized,
    energyDelta: createEnergyPresentation(
      workspace.impact.energyKWh.daily,
    ),
    recommendations: workspace.recommendations,
    impact: workspace.impact,
    annualImpact: {
      energyKWh: { ...workspace.impact.energyKWh.annual },
      co2Kg: { ...workspace.impact.co2Kg.annual },
      cost: { ...workspace.impact.cost.annual },
    },
    evidence: {
      sourceScenario: cloneScenarioEvidence(scenario.evidence),
      pipeline: { ...workspace.evidence.pipeline },
      baselineAssumptions: cloneAssumptions(
        workspace.evidence.baselineAssumptions,
      ),
      optimizedAssumptions: cloneAssumptions(
        workspace.evidence.optimizedAssumptions,
      ),
    },
    warnings: [...scenario.warnings],
  };
}

function getResponseStatus(
  decision: Readonly<DecisionPackage>,
): ScenarioResponseStatus {
  const isSupportedNoChange =
    decision.metadata.changedParameterCount === 0 &&
    decision.impactReport.direction === "neutral" &&
    decision.recommendations.length === 1 &&
    decision.recommendations[0].id === "maintain-current-controls";

  return isSupportedNoChange
    ? "already-at-modeled-plan"
    : "response-recommended";
}

function createEnergyPresentation(
  dailyEnergy: Readonly<ImpactChange>,
): ScenarioResponseEnergyPresentation {
  const presentation = presentImpactDelta(dailyEnergy.difference);
  const percentageMagnitude =
    dailyEnergy.percentageChange === null
      ? null
      : Math.abs(dailyEnergy.percentageChange);

  if (presentation.direction === "neutral") {
    return {
      ...presentation,
      unit: "kWh/day",
      percentageChange: dailyEnergy.percentageChange,
      percentageMagnitude,
      amountText: "No further modeled improvement",
      comparisonText: "No further modeled improvement",
      outcomeText: "No further modeled improvement",
    };
  }

  const magnitude = formatNumber(presentation.magnitude);
  const amountText =
    presentation.direction === "improvement"
      ? `${magnitude} kWh/day avoided`
      : `${magnitude} kWh/day additional energy`;
  const comparisonText =
    percentageMagnitude === null
      ? `${magnitude} kWh/day ${presentation.comparisonQualifier} than the unmitigated scenario`
      : `${formatNumber(percentageMagnitude)}% ${presentation.comparisonQualifier} than the unmitigated scenario`;

  return {
    ...presentation,
    unit: "kWh/day",
    percentageChange: dailyEnergy.percentageChange,
    percentageMagnitude,
    amountText,
    comparisonText,
    outcomeText:
      presentation.direction === "improvement"
        ? "Energy avoided"
        : "Additional energy",
  };
}

function formatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function cloneScenarioEvidence(
  evidence: Readonly<ScenarioWorkspaceEvidence>,
): ScenarioWorkspaceEvidence {
  return {
    scenarioDefinition: { ...evidence.scenarioDefinition },
    scenarioComparison: { ...evidence.scenarioComparison },
    baselineAssumptions: cloneAssumptions(evidence.baselineAssumptions),
    scenarioAssumptions: cloneAssumptions(evidence.scenarioAssumptions),
  };
}

function cloneAssumptions(
  assumptions: Readonly<SimulationAssumptions>,
): SimulationAssumptions {
  return { ...assumptions };
}
