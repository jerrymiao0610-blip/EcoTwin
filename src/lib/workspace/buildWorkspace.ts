import type { ImpactChange, ImpactReport } from "../impact/types";
import type { SimulationAssumptions, SimulationResult } from "../simulation";
import type { TwinSnapshotMetadata } from "../twin/types";
import type {
  DecisionPackage,
  DecisionRecommendation,
} from "../decision/types";
import type {
  WorkspaceImpactSummary,
  WorkspaceModel,
  WorkspaceRecommendationCard,
  WorkspaceResultSummary,
} from "./types";

export const MISSING_TWIN_METADATA_WARNING =
  "Twin snapshot metadata is unavailable; classroom identity and provenance cannot be fully presented.";

/**
 * Builds a detached, deterministic presentation model from an existing
 * decision package. This layer only groups and copies established outputs.
 */
export function buildWorkspace(
  decision: Readonly<DecisionPackage>,
): WorkspaceModel {
  const twin = decision.metadata.twin;
  const baselineConfiguration = decision.metadata.baselineConfiguration;

  return {
    classroom: {
      id: twin?.definition.id ?? null,
      name: twin?.definition.name ?? null,
      roomAreaM2:
        twin?.definition.physicalProperties.roomAreaM2 ??
        baselineConfiguration.roomAreaM2,
      lightingPowerDensityWPerM2:
        twin?.definition.physicalProperties.lightingPowerDensityWPerM2 ??
        baselineConfiguration.lightingPowerDensityWPerM2,
    },
    context: {
      occupants: twin?.context.occupants ?? baselineConfiguration.occupants,
      outsideTemperatureC:
        twin?.context.outsideTemperatureC ??
        baselineConfiguration.outsideTemperatureC,
      operatingHoursPerDay:
        twin?.context.operatingHoursPerDay ??
        baselineConfiguration.operatingHoursPerDay,
      operatingDaysPerMonth:
        twin?.context.operatingDaysPerMonth ??
        baselineConfiguration.operatingDaysPerMonth,
      operatingDaysPerYear:
        twin?.context.operatingDaysPerYear ??
        baselineConfiguration.operatingDaysPerYear,
      electricityPricePerKWh:
        twin?.context.electricityPricePerKWh ??
        baselineConfiguration.electricityPricePerKWh,
      carbonIntensityKgPerKWh:
        twin?.context.carbonIntensityKgPerKWh ??
        baselineConfiguration.carbonIntensityKgPerKWh,
    },
    baseline: createResultSummary(
      decision.metadata.baselineConfiguration,
      decision.baselineSimulation,
    ),
    optimized: createResultSummary(
      decision.metadata.optimizedConfiguration,
      decision.optimizedSimulation,
    ),
    recommendations: decision.recommendations.map(createRecommendationCard),
    impact: createImpactSummary(decision.impactReport),
    evidence: {
      pipeline: {
        version: decision.metadata.pipelineVersion,
        impactDirection: decision.metadata.impactDirection,
        optimizerSearchSpaceSize:
          decision.metadata.optimizerSearchSpaceSize,
        changedParameterCount: decision.metadata.changedParameterCount,
        recommendationCount: decision.metadata.recommendationCount,
      },
      snapshotMetadata: twin
        ? cloneSnapshotMetadata(twin.snapshotMetadata)
        : null,
      baselineAssumptions: cloneAssumptions(
        decision.baselineSimulation.assumptions,
      ),
      optimizedAssumptions: cloneAssumptions(
        decision.optimizedSimulation.assumptions,
      ),
    },
    warnings: twin ? [] : [MISSING_TWIN_METADATA_WARNING],
  };
}

function createResultSummary(
  configuration: Readonly<DecisionPackage["metadata"]["baselineConfiguration"]>,
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

function createRecommendationCard(
  recommendation: Readonly<DecisionRecommendation>,
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

function createImpactSummary(
  impact: Readonly<ImpactReport>,
): WorkspaceImpactSummary {
  return {
    direction: impact.direction,
    energyKWh: clonePeriodImpact(impact.energyKWh),
    co2Kg: clonePeriodImpact(impact.co2Kg),
    cost: clonePeriodImpact(impact.cost),
    components: impact.components.map((component) => ({
      component: component.component,
      energyKWh: cloneImpactChange(component.energyKWh),
      contributionPercent: component.contributionPercent,
    })),
    majorContributors: impact.majorContributors.map((component) => ({
      component: component.component,
      energyKWh: cloneImpactChange(component.energyKWh),
      contributionPercent: component.contributionPercent,
    })),
  };
}

function clonePeriodImpact(
  impact: Readonly<ImpactReport["energyKWh"]>,
): ImpactReport["energyKWh"] {
  return {
    daily: cloneImpactChange(impact.daily),
    monthly: cloneImpactChange(impact.monthly),
    annual: cloneImpactChange(impact.annual),
  };
}

function cloneImpactChange(impact: Readonly<ImpactChange>): ImpactChange {
  return { ...impact };
}

function cloneSnapshotMetadata(
  metadata: Readonly<TwinSnapshotMetadata>,
): TwinSnapshotMetadata {
  return {
    schemaVersion: metadata.schemaVersion,
    capturedAt: metadata.capturedAt,
    provenance: {
      source: metadata.provenance.source,
      ...(metadata.provenance.sourceVersion === undefined
        ? {}
        : { sourceVersion: metadata.provenance.sourceVersion }),
    },
    contentHash: metadata.contentHash,
  };
}

function cloneAssumptions(
  assumptions: Readonly<SimulationAssumptions>,
): SimulationAssumptions {
  return { ...assumptions };
}
