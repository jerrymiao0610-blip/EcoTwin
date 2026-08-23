import { compareSimulationResults } from "../impact/impact";
import type { ImpactChange, ImpactReport } from "../impact/types";
import {
  BUILT_IN_SCENARIO_IDS,
  simulateScenarios,
} from "../scenarios/scenarios";
import type {
  BuiltInScenarioId,
  ScenarioChange,
  ScenarioComparison,
  ScenarioDefinition,
  ScenarioResult,
} from "../scenarios/types";
import type {
  ClassroomConfig,
  SimulationAssumptions,
  SimulationResult,
} from "../simulation";
import { presentImpactDelta } from "./impactPresentation";
import type {
  ScenarioEnergyDeltaPresentation,
  ScenarioWorkspaceModel,
} from "./scenarioTypes";
import type { WorkspaceResultSummary } from "./types";

/**
 * Builds detached scenario models in caller order, or in the built-in stable
 * order when no IDs are supplied. Scenario behavior remains owned by the
 * existing scenario engine.
 */
export function buildScenarioWorkspaceModels(
  baseline: Readonly<ClassroomConfig>,
  scenarioIds: readonly BuiltInScenarioId[] = BUILT_IN_SCENARIO_IDS,
): ScenarioWorkspaceModel[] {
  return simulateScenarios(baseline, scenarioIds).map(createScenarioModel);
}

function createScenarioModel(
  result: Readonly<ScenarioResult>,
): ScenarioWorkspaceModel {
  const impact = compareSimulationResults(
    result.baselineSimulation,
    result.scenarioSimulation,
  );

  return {
    id: result.scenario.id,
    title: result.scenario.name,
    description: result.scenario.description,
    changes: result.changes.map(cloneScenarioChange),
    baseline: createResultSummary(
      result.baselineConfiguration,
      result.baselineSimulation,
    ),
    scenario: createResultSummary(
      result.scenarioConfiguration,
      result.scenarioSimulation,
    ),
    direction: impact.direction,
    energyDelta: createEnergyDeltaPresentation(impact.energyKWh.daily),
    impact: cloneImpactReport(impact),
    evidence: {
      scenarioDefinition: cloneScenarioDefinition(result.scenario),
      scenarioComparison: cloneScenarioComparison(result.comparison),
      baselineAssumptions: cloneAssumptions(
        result.baselineSimulation.assumptions,
      ),
      scenarioAssumptions: cloneAssumptions(
        result.scenarioSimulation.assumptions,
      ),
    },
    warnings: [],
  };
}

function createEnergyDeltaPresentation(
  dailyEnergy: Readonly<ImpactChange>,
): ScenarioEnergyDeltaPresentation {
  const presentation = presentImpactDelta(dailyEnergy.difference);

  if (presentation.direction === "neutral") {
    return {
      ...presentation,
      unit: "kWh/day",
      comparisonText: "No modeled change",
      outcomeText: "No modeled change",
    };
  }

  return {
    ...presentation,
    unit: "kWh/day",
    comparisonText: `${formatMagnitude(presentation.magnitude)} kWh/day ${presentation.comparisonQualifier}`,
    outcomeText:
      presentation.direction === "improvement"
        ? "Energy saved"
        : "Additional energy",
  };
}

function formatMagnitude(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function createResultSummary(
  configuration: Readonly<ClassroomConfig>,
  simulation: Readonly<SimulationResult>,
): WorkspaceResultSummary {
  return {
    configuration: { ...configuration },
    energyKWh: {
      daily: simulation.dailyEnergyKWh,
      monthly: simulation.monthlyEnergyKWh,
      annual: simulation.annualEnergyKWh,
    },
    co2Kg: {
      daily: simulation.dailyCO2Kg,
      monthly: simulation.monthlyCO2Kg,
      annual: simulation.annualCO2Kg,
    },
    cost: {
      daily: simulation.dailyCost,
      monthly: simulation.monthlyCost,
      annual: simulation.annualCost,
    },
    dailyEnergyByComponent: {
      hvacKWh: simulation.hvacEnergyKWh,
      lightingKWh: simulation.lightingEnergyKWh,
      devicesKWh: simulation.deviceEnergyKWh,
    },
    hvacMode: simulation.hvacMode,
    ecoScore: simulation.ecoScore,
  };
}

function cloneImpactReport(impact: Readonly<ImpactReport>): ImpactReport {
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
  impact: Readonly<ImpactReport["energyKWh"]>,
): ImpactReport["energyKWh"] {
  return {
    daily: { ...impact.daily },
    monthly: { ...impact.monthly },
    annual: { ...impact.annual },
  };
}

function cloneScenarioDefinition(
  scenario: Readonly<ScenarioDefinition>,
): ScenarioDefinition {
  return { ...scenario };
}

function cloneScenarioChange(
  change: Readonly<ScenarioChange>,
): ScenarioChange {
  return { ...change };
}

function cloneScenarioComparison(
  comparison: Readonly<ScenarioComparison>,
): ScenarioComparison {
  return { ...comparison };
}

function cloneAssumptions(
  assumptions: Readonly<SimulationAssumptions>,
): SimulationAssumptions {
  return { ...assumptions };
}
