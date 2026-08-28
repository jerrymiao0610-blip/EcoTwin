import { describe, expect, it, vi } from "vitest";
import { runDecisionPipeline } from "../decision/pipeline";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import { buildCurrentDecisionEvidence } from "./buildEvidence";
import {
  CloudflareWorkersAiExplanationProvider,
  createCloudflareWorkersAiRequest,
  DEFAULT_CLOUDFLARE_AI_MODEL,
} from "./cloudflareWorkersAiProvider";
import { createDeterministicExplanation } from "./deterministicProvider";
import { explainEvidence } from "./provider";
import type { ExplanationEvidence } from "./types";

function currentEvidence() {
  return buildCurrentDecisionEvidence(
    runDecisionPipeline(DEFAULT_CLASSROOM_CONFIG),
  );
}

function proseFor(evidence: Readonly<ExplanationEvidence>) {
  const skeleton = createDeterministicExplanation(evidence);
  return {
    summary: "EcoTwin explains the modeled plan using only the supplied evidence.",
    reasonExplanations: skeleton.whyItChanged.map(
      () => "The supplied comparison identifies this modeled relationship.",
    ),
    actionRationales: skeleton.recommendedActions.map(
      () => "The optimizer supports this action within the modeled context.",
    ),
    modeledImpactExplanation:
      "The trusted impact fields relate the candidate to its named baseline.",
    assumptionExplanations: skeleton.assumptions.map(
      () => "This estimate depends on the supplied model assumptions.",
    ),
  };
}

function workersAiResponse(evidence: Readonly<ExplanationEvidence>): Response {
  return new Response(
    JSON.stringify({
      choices: [
        { message: { content: JSON.stringify(proseFor(evidence)) } },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("CloudflareWorkersAiExplanationProvider", () => {
  it("adapts the grounding contract to Cloudflare JSON Mode", () => {
    const evidence = currentEvidence();
    const request = createCloudflareWorkersAiRequest(evidence);

    expect(request.model).toBe(DEFAULT_CLOUDFLARE_AI_MODEL);
    expect(request.messages[0].content).toContain(
      "Never invent or recompute numerical values",
    );
    expect(request.messages[1].content).toContain(
      '"mode":"current-decision"',
    );
    expect(request.response_format).toMatchObject({
      type: "json_schema",
      json_schema: {
        type: "object",
        additionalProperties: false,
      },
    });
  });

  it("keeps the token in the header and preserves trusted facts", async () => {
    const evidence = currentEvidence();
    const apiToken = "test-cloudflare-token";
    let requestedUrl = "";
    let requestedOptions: RequestInit | undefined;
    const fetchImplementation: typeof fetch = vi.fn(async (input, options) => {
      requestedUrl = String(input);
      requestedOptions = options;
      return workersAiResponse(evidence);
    });

    const result = await explainEvidence(
      evidence,
      new CloudflareWorkersAiExplanationProvider({
        accountId: "test-account-id",
        apiToken,
        fetchImplementation,
      }),
    );

    expect(requestedUrl).toBe(
      "https://api.cloudflare.com/client/v4/accounts/" +
        "test-account-id/ai/v1/chat/completions",
    );
    expect(requestedOptions?.headers).toMatchObject({
      Authorization: `Bearer ${apiToken}`,
    });
    expect(requestedOptions?.body).not.toContain(apiToken);
    expect(result.source).toEqual({
      kind: "ai",
      providerId: `cloudflare-workers-ai/${DEFAULT_CLOUDFLARE_AI_MODEL}`,
      fallbackReason: null,
    });
    expect(result.modeledImpact.impact).toEqual(
      evidence.comparisons.responseImpact.impact,
    );
  });

  it("replaces only unsafe numerical prose with grounded deterministic wording", async () => {
    const evidence = currentEvidence();
    const prose = proseFor(evidence);
    prose.summary = "This summary improperly repeats 42 as a model result.";

    const result = await explainEvidence(
      evidence,
      new CloudflareWorkersAiExplanationProvider({
        accountId: "test-account-id",
        apiToken: "test-cloudflare-token",
        fetchImplementation: async () => new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(prose) } }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      }),
    );

    expect(result.source.kind).toBe("ai");
    expect(result.summary).toBe(createDeterministicExplanation(evidence).summary);
    expect(result.whyItChanged[0].explanation).toBe(
      prose.reasonExplanations[0],
    );
    expect(result.summary).not.toMatch(/\d/u);
  });

  it("falls back deterministically when Workers AI is unavailable", async () => {
    const evidence = currentEvidence();
    const result = await explainEvidence(
      evidence,
      new CloudflareWorkersAiExplanationProvider({
        accountId: "test-account-id",
        apiToken: "test-cloudflare-token",
        fetchImplementation: async () => {
          throw new Error("Workers AI unavailable");
        },
      }),
    );

    expect(result.source).toMatchObject({
      kind: "deterministic",
      fallbackReason: "provider-error",
    });
  });
});
