import { describe, expect, it, vi } from "vitest";
import { runDecisionPipeline } from "../decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import { buildScenarioResponse } from "../workspace/buildScenarioResponse";
import { buildScenarioWorkspaceModels } from "../workspace/buildScenarioWorkspace";
import {
  buildCurrentDecisionEvidence,
  buildScenarioResponseEvidence,
} from "./buildEvidence";
import { createDeterministicExplanation } from "./deterministicProvider";
import {
  assembleGeminiExplanation,
  createGeminiStructuredRequest,
  GEMINI_GROUNDING_INSTRUCTION,
  GeminiExplanationProvider,
  type GeminiStructuredProse,
} from "./geminiProvider";
import { explainEvidence } from "./provider";
import type { ExplanationEvidence } from "./types";

function currentEvidence() {
  return buildCurrentDecisionEvidence(
    runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG),
  );
}

function scenarioEvidence(id: "heatwave-tomorrow" | "empty-classroom" | "eco-mode") {
  const scenario = buildScenarioWorkspaceModels(
    DEFAULT_CLASSROOM_CONFIG,
    [id],
  )[0];
  if (!scenario) throw new Error("Missing scenario fixture.");
  return buildScenarioResponseEvidence(
    scenario,
    buildScenarioResponse(scenario),
  );
}

function proseFor(evidence: Readonly<ExplanationEvidence>): GeminiStructuredProse {
  const skeleton = createDeterministicExplanation(evidence);
  return {
    summary: "EcoTwin explains the modeled plan using only the supplied evidence.",
    reasonExplanations: skeleton.whyItChanged.map(
      () => "The supplied comparison identifies this modeled relationship.",
    ),
    actionRationales: skeleton.recommendedActions.map(
      () => "The optimizer supports this controllable action within the modeled context.",
    ),
    modeledImpactExplanation:
      "The trusted impact fields show how the candidate relates to its named baseline.",
    assumptionExplanations: skeleton.assumptions.map(
      () => "This educational estimate depends on the supplied steady-state assumptions.",
    ),
  };
}

function geminiResponse(prose: GeminiStructuredProse): Response {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(prose) }] } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("GeminiExplanationProvider", () => {
  it("constructs a current structured-output request with fixed prose slots", () => {
    const evidence = currentEvidence();
    const request = createGeminiStructuredRequest(evidence);
    const schema = request.generationConfig.responseFormat.text.schema as {
      properties: Record<string, { minItems?: number; maxItems?: number }>;
    };

    expect(request.generationConfig.responseFormat.text.mimeType).toBe(
      "application/json",
    );
    expect(request.generationConfig.candidateCount).toBe(1);
    expect(schema.properties.reasonExplanations.minItems).toBe(
      createDeterministicExplanation(evidence).whyItChanged.length,
    );
    expect(schema.properties.reasonExplanations.maxItems).toBe(
      createDeterministicExplanation(evidence).whyItChanged.length,
    );
    expect(request.contents[0].parts[0].text).toContain(
      '"mode":"current-decision"',
    );
  });

  it("sends every required grounding instruction", () => {
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("only the supplied EcoTwin evidence");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("Never invent or recompute numerical values");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("Never invent recommendations");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("sensors");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("building properties");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("Never claim certified building performance");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("modeled or estimated");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("Current");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("Scenario without response");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("EcoTwin response");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("comparison basis");
    expect(GEMINI_GROUNDING_INSTRUCTION).toContain("model assumptions");
  });

  it("orchestrates a valid current Gemini result and preserves provider identity", async () => {
    const evidence = currentEvidence();
    let requestedUrl = "";
    let requestedOptions: RequestInit | undefined;
    const fetchImplementation: typeof fetch = vi.fn(async (input, options) => {
      requestedUrl = String(input);
      requestedOptions = options;
      return geminiResponse(proseFor(evidence));
    });
    const provider = new GeminiExplanationProvider({
      apiKey: "test-key",
      model: "gemini-test-model",
      fetchImplementation,
    });

    const result = await explainEvidence(evidence, provider);

    expect(result.source).toEqual({
      kind: "ai",
      providerId: "google-gemini/gemini-test-model",
      fallbackReason: null,
    });
    expect(result.modeledImpact.impact).toEqual(
      evidence.comparisons.responseImpact.impact,
    );
    expect(requestedUrl).toContain("gemini-test-model:generateContent");
    expect(requestedOptions?.headers).toMatchObject({
      "x-goog-api-key": "test-key",
    });
    expect(requestedOptions?.body).not.toContain("test-key");
  });

  it("orchestrates Heatwave prose without collapsing either comparison", async () => {
    const evidence = scenarioEvidence("heatwave-tomorrow");
    const result = await explainEvidence(
      evidence,
      new GeminiExplanationProvider({
        apiKey: "test-key",
        fetchImplementation: async () => geminiResponse(proseFor(evidence)),
      }),
    );

    expect(result.whyItChanged.some(({ comparisonBasis }) =>
      comparisonBasis.label === "Current vs Scenario",
    )).toBe(true);
    expect(result.whyItChanged.some(({ comparisonBasis }) =>
      comparisonBasis.label === "Scenario without response vs EcoTwin response",
    )).toBe(true);
    expect(result.modeledImpact.comparisonBasis.label).toBe(
      "Scenario without response vs EcoTwin response",
    );
  });

  it("keeps Empty Classroom system loads and Eco Mode neutrality trusted", () => {
    const emptyEvidence = scenarioEvidence("empty-classroom");
    const emptyResult = assembleGeminiExplanation(
      emptyEvidence,
      proseFor(emptyEvidence),
    );
    const ecoEvidence = scenarioEvidence("eco-mode");
    const ecoResult = assembleGeminiExplanation(ecoEvidence, proseFor(ecoEvidence));

    expect(emptyResult.modeledImpact.impact).toEqual(
      emptyEvidence.comparisons.responseImpact.impact,
    );
    expect(emptyEvidence.states.scenarioWithoutResponse?.configuration.occupants).toBe(0);
    expect(emptyEvidence.states.scenarioWithoutResponse?.energyKWh.daily).toBeGreaterThan(0);
    expect(ecoResult.modeledImpact.impact.direction).toBe("neutral");
  });

  it("falls back on network failure", async () => {
    const evidence = currentEvidence();
    const result = await explainEvidence(
      evidence,
      new GeminiExplanationProvider({
        apiKey: "test-key",
        fetchImplementation: async () => {
          throw new Error("Network unavailable");
        },
      }),
    );

    expect(result.source.kind).toBe("deterministic");
    expect(result.source.fallbackReason).toBe("provider-error");
  });

  it("falls back when provider prose tries to introduce a numerical claim", async () => {
    const evidence = currentEvidence();
    const invalid = { ...proseFor(evidence), summary: "Savings improve by 42 percent." };
    const result = await explainEvidence(
      evidence,
      new GeminiExplanationProvider({
        apiKey: "test-key",
        fetchImplementation: async () => geminiResponse(invalid),
      }),
    );

    expect(result.source.kind).toBe("deterministic");
    expect(result.source.fallbackReason).toBe("invalid-provider-result");
  });

  it("never lets provider prose replace trusted numerical structures", () => {
    const evidence = currentEvidence();
    const result = assembleGeminiExplanation(evidence, proseFor(evidence));

    expect(result.recommendedActions.map(({ recommendation }) => recommendation)).toEqual(
      evidence.recommendations,
    );
    expect(result.modeledImpact.impact).toEqual(
      evidence.comparisons.responseImpact.impact,
    );
    expect(result.provenance).toEqual(evidence.provenance);
  });
});
