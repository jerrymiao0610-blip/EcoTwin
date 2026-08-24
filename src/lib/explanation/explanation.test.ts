import { describe, expect, it } from "vitest";
import {
  runDecisionPipeline,
  runTwinDecisionPipeline,
} from "../decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import { createTwinSnapshot } from "../twin/twin";
import type { TwinSnapshot } from "../twin/types";
import { MISSING_TWIN_METADATA_WARNING } from "../workspace/buildWorkspace";
import { buildScenarioResponse } from "../workspace/buildScenarioResponse";
import { buildScenarioWorkspaceModels } from "../workspace/buildScenarioWorkspace";
import type { ScenarioResponseModel } from "../workspace/scenarioResponseTypes";
import type { ScenarioWorkspaceModel } from "../workspace/scenarioTypes";
import {
  buildCurrentDecisionEvidence,
  buildScenarioResponseEvidence,
  CURRENT_RESPONSE_COMPARISON_BASIS,
  CURRENT_SCENARIO_COMPARISON_BASIS,
} from "./buildEvidence";
import {
  createDeterministicExplanation,
  DETERMINISTIC_EXPLANATION_PROVIDER_ID,
} from "./deterministicProvider";
import {
  explainEvidence,
  ExplanationValidationError,
  type ExplanationProvider,
  validateExplanationResult,
} from "./provider";
import type { ExplanationEvidence, ExplanationResult } from "./types";

const TEST_AI_PROVIDER_ID = "test-ai-provider";

function createTwin(): TwinSnapshot {
  return createTwinSnapshot({
    definition: {
      id: "classroom-explanation",
      name: "Explanation Lab",
      physicalProperties: {
        roomAreaM2: DEFAULT_CLASSROOM_CONFIG.roomAreaM2,
        lightingPowerDensityWPerM2:
          DEFAULT_CLASSROOM_CONFIG.lightingPowerDensityWPerM2,
      },
    },
    state: {
      thermostatTemperatureC:
        DEFAULT_CLASSROOM_CONFIG.thermostatTemperatureC,
      lightingLevelPercent: DEFAULT_CLASSROOM_CONFIG.lightingLevelPercent,
      devicePowerW: DEFAULT_CLASSROOM_CONFIG.devicePowerW,
      hvacEnabled: DEFAULT_CLASSROOM_CONFIG.hvacEnabled,
      lightsEnabled: DEFAULT_CLASSROOM_CONFIG.lightsEnabled,
      devicesEnabled: DEFAULT_CLASSROOM_CONFIG.devicesEnabled,
    },
    context: {
      occupants: DEFAULT_CLASSROOM_CONFIG.occupants,
      outsideTemperatureC: DEFAULT_CLASSROOM_CONFIG.outsideTemperatureC,
      operatingHoursPerDay: DEFAULT_CLASSROOM_CONFIG.operatingHoursPerDay,
      operatingDaysPerMonth:
        DEFAULT_CLASSROOM_CONFIG.operatingDaysPerMonth,
      operatingDaysPerYear: DEFAULT_CLASSROOM_CONFIG.operatingDaysPerYear,
      electricityPricePerKWh:
        DEFAULT_CLASSROOM_CONFIG.electricityPricePerKWh,
      carbonIntensityKgPerKWh:
        DEFAULT_CLASSROOM_CONFIG.carbonIntensityKgPerKWh,
    },
    capturedAt: "2026-08-24T09:00:00.000Z",
    provenance: {
      source: "phase-ten-test",
      sourceVersion: "grounded-evidence",
    },
  });
}

function scenarioPair(
  id: ScenarioWorkspaceModel["id"],
): [ScenarioWorkspaceModel, ScenarioResponseModel] {
  const scenario = buildScenarioWorkspaceModels(
    DEFAULT_CLASSROOM_CONFIG,
  ).find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Missing test scenario: ${id}`);
  return [scenario, buildScenarioResponse(scenario)];
}

function validAiResult(
  evidence: Readonly<ExplanationEvidence>,
): ExplanationResult {
  const result = createDeterministicExplanation(evidence);
  return {
    ...result,
    source: {
      kind: "ai",
      providerId: TEST_AI_PROVIDER_ID,
      fallbackReason: null,
    },
  };
}

describe("grounded explanation evidence", () => {
  it("constructs Current decision evidence with twin identity and provenance", () => {
    const twin = createTwin();
    const decision = runTwinDecisionPipeline(twin);
    const evidence = buildCurrentDecisionEvidence(decision);

    expect(evidence.mode).toBe("current-decision");
    expect(evidence.context.classroom).toMatchObject({
      id: twin.definition.id,
      name: twin.definition.name,
    });
    expect(evidence.states.current.configuration).toEqual(
      decision.metadata.baselineConfiguration,
    );
    expect(evidence.states.ecoTwinResponse.configuration).toEqual(
      decision.metadata.optimizedConfiguration,
    );
    expect(evidence.provenance.snapshotMetadata).toEqual(twin.metadata);
    expect(evidence.provenance.snapshotMetadata).not.toBe(twin.metadata);
    expect(evidence.warnings).toEqual([]);
  });

  it("constructs Heatwave scenario-response evidence for both comparisons", () => {
    const [scenario, response] = scenarioPair("heatwave-tomorrow");
    const evidence = buildScenarioResponseEvidence(scenario, response);

    expect(evidence.mode).toBe("scenario-response");
    expect(evidence.context.scenario).toMatchObject({
      id: "heatwave-tomorrow",
      title: scenario.title,
    });
    expect(evidence.parameterChanges.scenario).toEqual(scenario.changes);
    expect(evidence.states.current).toEqual(scenario.baseline);
    expect(evidence.states.scenarioWithoutResponse).toEqual(
      response.scenarioBaseline,
    );
    expect(evidence.states.ecoTwinResponse).toEqual(
      response.optimizedResponse,
    );
    expect(evidence.comparisons.scenarioChange?.impact).toEqual(
      scenario.impact,
    );
    expect(evidence.comparisons.responseImpact.impact).toEqual(
      response.impact,
    );
  });

  it("constructs Empty Classroom evidence without assuming systems are off", () => {
    const [scenario, response] = scenarioPair("empty-classroom");
    const evidence = buildScenarioResponseEvidence(scenario, response);

    expect(evidence.context.scenario?.id).toBe("empty-classroom");
    expect(evidence.states.scenarioWithoutResponse?.configuration.occupants).toBe(
      0,
    );
    expect(evidence.states.scenarioWithoutResponse?.configuration.hvacEnabled).toBe(
      scenario.scenario.configuration.hvacEnabled,
    );
    expect(
      evidence.states.scenarioWithoutResponse?.dailyEnergyByComponent.hvacKWh,
    ).toBe(response.scenarioBaseline.dailyEnergyByComponent.hvacKWh);
  });

  it("preserves Eco Mode as a neutral scenario response", () => {
    const [scenario, response] = scenarioPair("eco-mode");
    const evidence = buildScenarioResponseEvidence(scenario, response);
    const result = createDeterministicExplanation(evidence);

    expect(response.status).toBe("already-at-modeled-plan");
    expect(evidence.comparisons.scenarioChange?.impact.direction).toBe(
      "improvement",
    );
    expect(evidence.comparisons.responseImpact.impact.direction).toBe(
      "neutral",
    );
    expect(result.summary).toContain("already at the EcoTwin response state");
    expect(result.modeledImpact.impact.direction).toBe("neutral");
  });

  it("preserves Current, Scenario, and response comparison bases exactly", () => {
    const current = buildCurrentDecisionEvidence(
      runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG),
    );
    const [scenario, response] = scenarioPair("heatwave-tomorrow");
    const scenarioEvidence = buildScenarioResponseEvidence(
      scenario,
      response,
    );

    expect(current.comparisons.responseImpact.basis).toEqual(
      CURRENT_RESPONSE_COMPARISON_BASIS,
    );
    expect(scenarioEvidence.comparisons.scenarioChange?.basis).toEqual(
      CURRENT_SCENARIO_COMPARISON_BASIS,
    );
    expect(scenarioEvidence.comparisons.responseImpact.basis).toEqual(
      response.comparisonBasis,
    );
    expect(scenarioEvidence.comparisons.responseImpact.basis.label).toBe(
      "Scenario without response vs EcoTwin response",
    );
  });

  it("copies every trusted numerical value from source structures", () => {
    const decision = runTwinDecisionPipeline(createTwin());
    const evidence = buildCurrentDecisionEvidence(decision);

    expect(evidence.states.current.energyKWh).toEqual({
      daily: decision.baselineSimulation.dailyEnergyKWh,
      monthly: decision.baselineSimulation.monthlyEnergyKWh,
      annual: decision.baselineSimulation.annualEnergyKWh,
    });
    expect(evidence.states.ecoTwinResponse.co2Kg.annual).toBe(
      decision.optimizedSimulation.annualCO2Kg,
    );
    expect(evidence.states.ecoTwinResponse.cost.annual).toBe(
      decision.optimizedSimulation.annualCost,
    );
    expect(evidence.comparisons.responseImpact.impact).toEqual(
      decision.impactReport,
    );
    expect(evidence.optimizer.optimizerSearchSpaceSize).toBe(
      decision.metadata.optimizerSearchSpaceSize,
    );
    expect(evidence.recommendations).toEqual(decision.recommendations);
  });

  it("does not mutate Current or scenario-response source inputs", () => {
    const decision = runTwinDecisionPipeline(createTwin());
    const [scenario, response] = scenarioPair("heatwave-tomorrow");
    const decisionBefore = structuredClone(decision);
    const scenarioBefore = structuredClone(scenario);
    const responseBefore = structuredClone(response);

    buildCurrentDecisionEvidence(decision);
    buildScenarioResponseEvidence(scenario, response);

    expect(decision).toEqual(decisionBefore);
    expect(scenario).toEqual(scenarioBefore);
    expect(response).toEqual(responseBefore);
  });

  it("returns fully detached evidence objects", () => {
    const decision = runTwinDecisionPipeline(createTwin());
    const first = buildCurrentDecisionEvidence(decision);
    const second = buildCurrentDecisionEvidence(decision);

    expect(first).not.toBe(second);
    expect(first.states.current).not.toBe(second.states.current);
    expect(first.recommendations).not.toBe(second.recommendations);
    expect(first.recommendations[0].evidence).not.toBe(
      second.recommendations[0].evidence,
    );
    expect(first.comparisons.responseImpact.impact.energyKWh).not.toBe(
      second.comparisons.responseImpact.impact.energyKWh,
    );
    expect(first.assumptions.current).not.toBe(second.assumptions.current);

    first.states.current.configuration.occupants = -1;
    first.recommendations[0].evidence.annualEnergyChangeKWh = -1;
    first.assumptions.current.hvacCop = -1;

    expect(second).toEqual(buildCurrentDecisionEvidence(decision));
    expect(decision).toEqual(runTwinDecisionPipeline(createTwin()));
  });

  it("is deterministic for repeated evidence and fallback generation", () => {
    const [scenario, response] = scenarioPair("heatwave-tomorrow");
    const firstEvidence = buildScenarioResponseEvidence(scenario, response);
    const secondEvidence = buildScenarioResponseEvidence(scenario, response);

    expect(firstEvidence).toEqual(secondEvidence);
    expect(createDeterministicExplanation(firstEvidence)).toEqual(
      createDeterministicExplanation(secondEvidence),
    );
  });

  it("exposes missing twin metadata and warnings without fabrication", () => {
    const evidence = buildCurrentDecisionEvidence(
      runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG),
    );
    const result = createDeterministicExplanation(evidence);

    expect(evidence.context.classroom.id).toBeNull();
    expect(evidence.context.classroom.name).toBeNull();
    expect(evidence.provenance.snapshotMetadata).toBeNull();
    expect(evidence.warnings).toEqual([MISSING_TWIN_METADATA_WARNING]);
    expect(result.warnings).toEqual(evidence.warnings);
  });
});

describe("explanation providers and validation", () => {
  it("produces a deterministic evidence summary with trusted facts detached", () => {
    const evidence = buildCurrentDecisionEvidence(
      runTwinDecisionPipeline(createTwin()),
    );
    const result = createDeterministicExplanation(evidence);

    expect(result.summary).toBeTruthy();
    expect(result.whyItChanged.length).toBeGreaterThan(0);
    expect(result.recommendedActions.map(({ recommendation }) => recommendation)).toEqual(
      evidence.recommendations,
    );
    expect(result.modeledImpact.impact).toEqual(
      evidence.comparisons.responseImpact.impact,
    );
    expect(result.modeledImpact.impact).not.toBe(
      evidence.comparisons.responseImpact.impact,
    );
    expect(() => validateExplanationResult(evidence, result)).not.toThrow();
  });

  it("never labels deterministic fallback output as AI", async () => {
    const evidence = buildCurrentDecisionEvidence(
      runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG),
    );
    const result = await explainEvidence(evidence);

    expect(result.source).toEqual({
      kind: "deterministic",
      providerId: DETERMINISTIC_EXPLANATION_PROVIDER_ID,
      fallbackReason: "provider-not-configured",
    });
    expect(result.source.kind).not.toBe("ai");
  });

  it("preserves valid provider identity and structured output", async () => {
    const evidence = buildCurrentDecisionEvidence(
      runTwinDecisionPipeline(createTwin()),
    );
    const provider: ExplanationProvider = {
      id: TEST_AI_PROVIDER_ID,
      kind: "ai",
      explain: validAiResult,
    };

    const result = await explainEvidence(evidence, provider);

    expect(result.source).toEqual({
      kind: "ai",
      providerId: TEST_AI_PROVIDER_ID,
      fallbackReason: null,
    });
    expect(result.modeledImpact.impact).toEqual(
      evidence.comparisons.responseImpact.impact,
    );
  });

  it("falls back on provider errors and malformed provider results", async () => {
    const evidence = buildCurrentDecisionEvidence(
      runTwinDecisionPipeline(createTwin()),
    );
    const throwingProvider: ExplanationProvider = {
      id: TEST_AI_PROVIDER_ID,
      kind: "ai",
      explain: () => {
        throw new Error("Unavailable");
      },
    };
    const malformedProvider: ExplanationProvider = {
      id: TEST_AI_PROVIDER_ID,
      kind: "ai",
      explain: () => {
        const result = validAiResult(evidence);
        result.modeledImpact.impact.energyKWh.annual.candidate += 1;
        return result;
      },
    };

    const failed = await explainEvidence(evidence, throwingProvider);
    const malformed = await explainEvidence(evidence, malformedProvider);

    expect(failed.source).toEqual({
      kind: "deterministic",
      providerId: DETERMINISTIC_EXPLANATION_PROVIDER_ID,
      fallbackReason: "provider-error",
    });
    expect(malformed.source).toEqual({
      kind: "deterministic",
      providerId: DETERMINISTIC_EXPLANATION_PROVIDER_ID,
      fallbackReason: "invalid-provider-result",
    });
    expect(malformed.modeledImpact.impact).toEqual(
      evidence.comparisons.responseImpact.impact,
    );
  });

  it("rejects missing sections, altered trusted values, and numeric prose claims", () => {
    const evidence = buildCurrentDecisionEvidence(
      runTwinDecisionPipeline(createTwin()),
    );
    const missingSection = validAiResult(evidence);
    missingSection.whyItChanged = [];
    const alteredTrustedValue = validAiResult(evidence);
    alteredTrustedValue.recommendedActions[0].recommendation.evidence.annualCostChange +=
      1;
    const unsupportedNumericProse = validAiResult(evidence);
    unsupportedNumericProse.summary =
      "The response will save an unsupported amount of 999 units.";

    expect(() => validateExplanationResult(evidence, missingSection)).toThrow(
      ExplanationValidationError,
    );
    expect(() =>
      validateExplanationResult(evidence, alteredTrustedValue),
    ).toThrow(ExplanationValidationError);
    expect(() =>
      validateExplanationResult(evidence, unsupportedNumericProse),
    ).toThrow(/numeric claim/);
  });
});

