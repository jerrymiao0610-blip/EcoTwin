import { compareSimulationResults } from "../impact/impact";
import { optimizeClassroomEnergy } from "../optimizer/optimizer";
import { simulateClassroomEnergy, type ClassroomConfig } from "../simulation";
import type { TwinSnapshot } from "../twin/types";
import { generateDecisionRecommendations } from "./recommendation";
import {
  twinSnapshotToClassroomConfig,
  twinSnapshotToDecisionContext,
} from "./twinAdapter";
import type { DecisionPackage, DecisionPipelineOptions } from "./types";

export const DECISION_PIPELINE_VERSION = "1.0.0";

/**
 * Runs the existing intelligence modules in sequence without changing their
 * calculations: simulate, optimize, compare, then explain.
 */
export function runDecisionPipeline(
  config: Readonly<ClassroomConfig>,
  options: Readonly<DecisionPipelineOptions> = {},
): DecisionPackage {
  const baselineConfiguration: ClassroomConfig = { ...config };
  const baselineSimulation = simulateClassroomEnergy(baselineConfiguration);
  const optimization = optimizeClassroomEnergy(
    baselineConfiguration,
    options.optimizerConstraints,
  );
  const impactReport = compareSimulationResults(
    baselineSimulation,
    optimization.optimizedSimulation,
  );
  const recommendations = generateDecisionRecommendations(
    optimization.changedParameters,
    impactReport,
  );

  return {
    baselineSimulation,
    optimizedSimulation: optimization.optimizedSimulation,
    impactReport,
    recommendations,
    metadata: {
      pipelineVersion: DECISION_PIPELINE_VERSION,
      impactDirection: impactReport.direction,
      optimizerSearchSpaceSize: optimization.searchSpaceSize,
      changedParameterCount: optimization.changedParameters.length,
      recommendationCount: recommendations.length,
      baselineConfiguration: optimization.baselineConfiguration,
      optimizedConfiguration: optimization.optimizedConfiguration,
    },
  };
}

/**
 * Runs the decision workflow from an immutable digital-twin snapshot while
 * retaining its identity, context, and provenance in the result metadata.
 */
export function runTwinDecisionPipeline(
  twin: Readonly<TwinSnapshot>,
  options: Readonly<DecisionPipelineOptions> = {},
): DecisionPackage {
  const configuration = twinSnapshotToClassroomConfig(twin);
  const decision = runDecisionPipeline(configuration, options);

  return {
    ...decision,
    metadata: {
      ...decision.metadata,
      twin: twinSnapshotToDecisionContext(twin),
    },
  };
}
