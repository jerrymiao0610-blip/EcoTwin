import { runDecisionPipeline } from "../decision/pipeline";
import { buildScenarioResponse } from "../workspace/buildScenarioResponse";
import { buildScenarioWorkspaceModels } from "../workspace/buildScenarioWorkspace";
import type { ExplanationApiRequest } from "./apiRequest";
import {
  buildCurrentDecisionEvidence,
  buildScenarioResponseEvidence,
} from "./buildEvidence";
import type { ExplanationEvidence } from "./types";

/** Server orchestration that rebuilds all trusted evidence from established modules. */
export function buildEvidenceFromExplanationRequest(
  request: Readonly<ExplanationApiRequest>,
): ExplanationEvidence {
  if (request.mode === "current-decision") {
    return buildCurrentDecisionEvidence(
      runDecisionPipeline(request.configuration),
    );
  }

  const scenario = buildScenarioWorkspaceModels(
    request.configuration,
    [request.scenarioId],
  )[0];
  if (!scenario) {
    throw new Error("The requested built-in scenario could not be constructed.");
  }

  return buildScenarioResponseEvidence(
    scenario,
    buildScenarioResponse(scenario),
  );
}
