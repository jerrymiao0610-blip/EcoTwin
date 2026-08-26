import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CLASSROOM_CONFIG } from "../../../lib/simulation";
import { POST } from "./route";

const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
const originalCloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const originalCloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
const originalCloudflareModel = process.env.CLOUDFLARE_AI_MODEL;

describe.sequential("POST /api/explanation", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CLOUDFLARE_AI_MODEL;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
    if (originalModel === undefined) delete process.env.GEMINI_MODEL;
    else process.env.GEMINI_MODEL = originalModel;
    if (originalCloudflareAccountId === undefined) {
      delete process.env.CLOUDFLARE_ACCOUNT_ID;
    } else process.env.CLOUDFLARE_ACCOUNT_ID = originalCloudflareAccountId;
    if (originalCloudflareApiToken === undefined) {
      delete process.env.CLOUDFLARE_API_TOKEN;
    } else process.env.CLOUDFLARE_API_TOKEN = originalCloudflareApiToken;
    if (originalCloudflareModel === undefined) {
      delete process.env.CLOUDFLARE_AI_MODEL;
    } else process.env.CLOUDFLARE_AI_MODEL = originalCloudflareModel;
  });

  it("returns a usable deterministic Current summary when the key is missing", async () => {
    const response = await POST(jsonRequest({
      mode: "current-decision",
      configuration: DEFAULT_CLASSROOM_CONFIG,
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(result.source).toMatchObject({
      kind: "deterministic",
      fallbackReason: "provider-not-configured",
    });
    expect(result.summary).toBeTruthy();
  });

  it.each([
    "heatwave-tomorrow",
    "empty-classroom",
    "eco-mode",
  ] as const)("returns a deterministic %s response with the correct basis", async (scenarioId) => {
    const response = await POST(jsonRequest({
      mode: "scenario-response",
      configuration: DEFAULT_CLASSROOM_CONFIG,
      scenarioId,
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.modeledImpact.comparisonBasis.label).toBe(
      "Scenario without response vs EcoTwin response",
    );
    expect(result.source.kind).toBe("deterministic");
  });

  it("converts Gemini network failure into a calm deterministic fallback", async () => {
    const testKey = "development-test-key";
    process.env.GEMINI_API_KEY = testKey;
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("Network unavailable");
    }));

    const response = await POST(jsonRequest({
      mode: "current-decision",
      configuration: DEFAULT_CLASSROOM_CONFIG,
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.source).toMatchObject({
      kind: "deterministic",
      fallbackReason: "provider-error",
    });
    expect(JSON.stringify(result)).not.toContain(testKey);
  });

  it("uses server-only Workers AI when a direct Gemini key is missing", async () => {
    const apiToken = "development-test-cloudflare-token";
    process.env.CLOUDFLARE_ACCOUNT_ID = "development-account-id";
    process.env.CLOUDFLARE_API_TOKEN = apiToken;
    let requestedUrl = "";
    let requestedOptions: RequestInit | undefined;
    vi.stubGlobal("fetch", vi.fn(async (input, options) => {
      requestedUrl = String(input);
      requestedOptions = options;
      throw new Error("Network unavailable");
    }));

    const response = await POST(jsonRequest({
      mode: "current-decision",
      configuration: DEFAULT_CLASSROOM_CONFIG,
    }));
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(requestedUrl).toBe(
      "https://api.cloudflare.com/client/v4/accounts/" +
        "development-account-id/ai/v1/chat/completions",
    );
    expect(requestedOptions?.headers).toMatchObject({
      Authorization: `Bearer ${apiToken}`,
    });
    expect(result.source).toMatchObject({
      kind: "deterministic",
      fallbackReason: "provider-error",
    });
    expect(JSON.stringify(result)).not.toContain(apiToken);
  });

  it("rejects free-form and malformed requests without invoking a provider", async () => {
    const response = await POST(jsonRequest({
      mode: "current-decision",
      configuration: DEFAULT_CLASSROOM_CONFIG,
      prompt: "Tell me anything",
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "The explanation request was not valid.",
    });
  });
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/explanation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
