import {
  assembleGeminiExplanation,
  createGeminiStructuredRequest,
} from "./geminiProvider";
import type { ExplanationProvider } from "./provider";
import type { ExplanationEvidence, ExplanationResult } from "./types";

export const DEFAULT_CLOUDFLARE_AI_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

interface CloudflareWorkersAiProviderOptions {
  accountId: string;
  apiToken: string;
  model?: string;
  fetchImplementation?: typeof fetch;
}

interface CloudflareWorkersAiResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface CloudflareWorkersAiRequest {
  model: string;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  max_tokens: number;
  stream: false;
  response_format: {
    type: "json_schema";
    json_schema: Record<string, unknown>;
  };
}

/** Server-only transport for Cloudflare Workers AI's OpenAI-compatible API. */
export class CloudflareWorkersAiExplanationProvider
  implements ExplanationProvider
{
  readonly kind = "ai" as const;
  readonly id: string;
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly model: string;
  private readonly fetchImplementation: typeof fetch;

  constructor({
    accountId,
    apiToken,
    model = DEFAULT_CLOUDFLARE_AI_MODEL,
    fetchImplementation = fetch,
  }: CloudflareWorkersAiProviderOptions) {
    if (accountId.trim() === "") {
      throw new Error("A Cloudflare account ID is required.");
    }
    if (apiToken.trim() === "") {
      throw new Error("A Cloudflare API token is required.");
    }
    if (model.trim() === "") {
      throw new Error("A Cloudflare Workers AI model is required.");
    }

    this.accountId = accountId.trim();
    this.apiToken = apiToken;
    this.model = model.trim();
    this.id = `cloudflare-workers-ai/${this.model}`;
    this.fetchImplementation = fetchImplementation;
  }

  async explain(
    evidence: Readonly<ExplanationEvidence>,
  ): Promise<ExplanationResult> {
    const endpoint =
      `https://api.cloudflare.com/client/v4/accounts/` +
      `${encodeURIComponent(this.accountId)}/ai/v1/chat/completions`;
    const response = await this.fetchImplementation(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createCloudflareWorkersAiRequest(evidence, this.model)),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Workers AI request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as CloudflareWorkersAiResponse;
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("Workers AI returned no structured explanation.");

    return assembleGeminiExplanation(evidence, JSON.parse(text), this.id);
  }
}

export function createCloudflareWorkersAiRequest(
  evidence: Readonly<ExplanationEvidence>,
  model = DEFAULT_CLOUDFLARE_AI_MODEL,
): CloudflareWorkersAiRequest {
  const request = createGeminiStructuredRequest(evidence);

  return {
    model,
    messages: [
      {
        role: "system",
        content: request.systemInstruction.parts
          .map(({ text }) => text)
          .join("\n"),
      },
      {
        role: "user",
        content: request.contents
          .flatMap(({ parts }) => parts.map(({ text }) => text))
          .join("\n"),
      },
    ],
    max_tokens: request.generationConfig.maxOutputTokens,
    stream: false,
    response_format: {
      type: "json_schema",
      json_schema: request.generationConfig.responseFormat.text.schema,
    },
  };
}
