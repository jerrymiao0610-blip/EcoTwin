import { NextResponse } from "next/server";
import {
  ExplanationRequestError,
  parseExplanationApiRequest,
} from "../../../lib/explanation/apiRequest";
import { buildEvidenceFromExplanationRequest } from "../../../lib/explanation/buildRequestEvidence";
import {
  CloudflareWorkersAiExplanationProvider,
  DEFAULT_CLOUDFLARE_AI_MODEL,
} from "../../../lib/explanation/cloudflareWorkersAiProvider";
import {
  DEFAULT_GEMINI_MODEL,
  GeminiExplanationProvider,
} from "../../../lib/explanation/geminiProvider";
import { explainEvidence, type ExplanationProvider } from "../../../lib/explanation/provider";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = parseExplanationApiRequest(await request.json());
    const evidence = buildEvidenceFromExplanationRequest(input);
    const result = await explainEvidence(evidence, configuredProvider());

    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ExplanationRequestError || error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "The explanation request was not valid." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { error: "EcoTwin could not prepare an explanation." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

function configuredProvider(): ExplanationProvider | undefined {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;

  if (apiKey) {
    return new GeminiExplanationProvider({ apiKey, model });
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !apiToken) return undefined;

  return new CloudflareWorkersAiExplanationProvider({
    accountId,
    apiToken,
    model:
      process.env.CLOUDFLARE_AI_MODEL?.trim() ||
      DEFAULT_CLOUDFLARE_AI_MODEL,
  });
}
