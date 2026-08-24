import { createDeterministicExplanation } from "./deterministicProvider";
import type { ExplanationProvider } from "./provider";
import type { ExplanationEvidence, ExplanationResult } from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models";

export const GEMINI_GROUNDING_INSTRUCTION = [
  "You explain only the supplied EcoTwin evidence.",
  "Never invent or recompute numerical values, savings, percentages, parameter changes, annual impact, or optimizer counts.",
  "Never invent recommendations, sensors, building properties, comfort standards, or equipment efficiencies.",
  "Never claim certified building performance. Use modeled or estimated terminology.",
  "Preserve the Current, Scenario without response, and EcoTwin response distinctions represented by each supplied slot.",
  "Preserve each supplied comparison basis and do not collapse Current vs What-if with Scenario without response vs EcoTwin response.",
  "Acknowledge the supplied model assumptions and the educational model limitations.",
  "Write concise factual prose without digits or numerical claims. Return only the requested structured JSON.",
].join("\n");

export interface GeminiStructuredProse {
  summary: string;
  reasonExplanations: string[];
  actionRationales: string[];
  modeledImpactExplanation: string;
  assumptionExplanations: string[];
}

export interface GeminiGenerateContentRequest {
  systemInstruction: {
    parts: Array<{ text: string }>;
  };
  contents: Array<{
    role: "user";
    parts: Array<{ text: string }>;
  }>;
  generationConfig: {
    candidateCount: 1;
    maxOutputTokens: number;
    responseFormat: {
      text: {
        mimeType: "application/json";
        schema: Record<string, unknown>;
      };
    };
  };
}

interface GeminiProviderOptions {
  apiKey: string;
  model?: string;
  fetchImplementation?: typeof fetch;
}

interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

/**
 * Server-side Gemini provider. Gemini supplies prose only; trusted fields are
 * reattached from the deterministic result before Phase 10A validation.
 */
export class GeminiExplanationProvider implements ExplanationProvider {
  readonly kind = "ai" as const;
  readonly id: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImplementation: typeof fetch;

  constructor({
    apiKey,
    model = DEFAULT_GEMINI_MODEL,
    fetchImplementation = fetch,
  }: GeminiProviderOptions) {
    if (apiKey.trim() === "") throw new Error("A Gemini API key is required.");
    if (model.trim() === "") throw new Error("A Gemini model is required.");

    this.apiKey = apiKey;
    this.model = model;
    this.id = `google-gemini/${model}`;
    this.fetchImplementation = fetchImplementation;
  }

  async explain(evidence: Readonly<ExplanationEvidence>): Promise<ExplanationResult> {
    const request = createGeminiStructuredRequest(evidence);
    const response = await this.fetchImplementation(
      `${GEMINI_API_ROOT}/${encodeURIComponent(this.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as GeminiApiResponse;
    const text = payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("Gemini returned no structured explanation.");

    return assembleGeminiExplanation(evidence, JSON.parse(text), this.id);
  }
}

export function createGeminiStructuredRequest(
  evidence: Readonly<ExplanationEvidence>,
): GeminiGenerateContentRequest {
  const skeleton = createDeterministicExplanation(evidence);
  const schema = createProseSchema(
    skeleton.whyItChanged.length,
    skeleton.recommendedActions.length,
    skeleton.assumptions.length,
  );
  const slotGuide = {
    reasonSlots: skeleton.whyItChanged.map((reason, index) => ({
      index,
      comparisonBasis: reason.comparisonBasis,
      scenarioChange: reason.scenarioChange,
      componentImpact: reason.componentImpact,
    })),
    actionSlots: skeleton.recommendedActions.map(({ recommendation }, index) => ({
      index,
      recommendation,
    })),
    assumptionSlots: skeleton.assumptions.map(({ state, values }, index) => ({
      index,
      state,
      values,
    })),
    modeledImpactBasis: skeleton.modeledImpact.comparisonBasis,
  };

  return {
    systemInstruction: {
      parts: [{ text: GEMINI_GROUNDING_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              task:
                "Fill every prose slot in order. Explain relationships in the evidence without restating numeric values.",
              evidence,
              slotGuide,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      candidateCount: 1,
      maxOutputTokens: 1_200,
      responseFormat: {
        text: {
          mimeType: "application/json",
          schema,
        },
      },
    },
  };
}

export function assembleGeminiExplanation(
  evidence: Readonly<ExplanationEvidence>,
  prose: unknown,
  providerId = `google-gemini/${DEFAULT_GEMINI_MODEL}`,
): ExplanationResult {
  const value = requireRecord(prose);
  const trusted = createDeterministicExplanation(evidence);
  const summary = requireString(value.summary, "summary");
  const reasonExplanations = requireStringArray(
    value.reasonExplanations,
    trusted.whyItChanged.length,
    "reasonExplanations",
  );
  const actionRationales = requireStringArray(
    value.actionRationales,
    trusted.recommendedActions.length,
    "actionRationales",
  );
  const modeledImpactExplanation = requireString(
    value.modeledImpactExplanation,
    "modeledImpactExplanation",
  );
  const assumptionExplanations = requireStringArray(
    value.assumptionExplanations,
    trusted.assumptions.length,
    "assumptionExplanations",
  );

  return {
    ...trusted,
    summary,
    whyItChanged: trusted.whyItChanged.map((reason, index) => ({
      ...reason,
      explanation: reasonExplanations[index],
    })),
    recommendedActions: trusted.recommendedActions.map((action, index) => ({
      ...action,
      rationale: actionRationales[index],
    })),
    modeledImpact: {
      ...trusted.modeledImpact,
      explanation: modeledImpactExplanation,
    },
    assumptions: trusted.assumptions.map((assumption, index) => ({
      ...assumption,
      explanation: assumptionExplanations[index],
    })),
    source: {
      kind: "ai",
      providerId,
      fallbackReason: null,
    },
  };
}

function createProseSchema(
  reasonCount: number,
  actionCount: number,
  assumptionCount: number,
): Record<string, unknown> {
  const prose = {
    type: "string",
    description: "Concise grounded prose with no digits or numerical claims.",
  };
  const exactStringArray = (count: number, description: string) => ({
    type: "array",
    description,
    items: prose,
    minItems: count,
    maxItems: count,
  });

  return {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: prose,
      reasonExplanations: exactStringArray(
        reasonCount,
        "One explanation for each supplied reason slot, in the same order.",
      ),
      actionRationales: exactStringArray(
        actionCount,
        "One interpretation for each trusted recommendation, in the same order.",
      ),
      modeledImpactExplanation: prose,
      assumptionExplanations: exactStringArray(
        assumptionCount,
        "One limitation-aware explanation for each assumption slot, in the same order.",
      ),
    },
    required: [
      "summary",
      "reasonExplanations",
      "actionRationales",
      "modeledImpactExplanation",
      "assumptionExplanations",
    ],
  };
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gemini structured output must be an object.");
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Gemini structured output field ${field} is invalid.`);
  }
  return value;
}

function requireStringArray(value: unknown, count: number, field: string): string[] {
  if (!Array.isArray(value) || value.length !== count) {
    throw new Error(`Gemini structured output field ${field} has the wrong length.`);
  }
  return value.map((item, index) => requireString(item, `${field}[${index}]`));
}
