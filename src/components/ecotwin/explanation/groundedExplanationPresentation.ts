import type { ExplanationApiRequest } from "@/lib/explanation/apiRequest";
import type { ExplanationSource } from "@/lib/explanation/types";
import type { BuiltInScenarioId } from "@/lib/scenarios/types";
import type { ClassroomConfig } from "@/lib/simulation";

export function currentExplanationRequest(
  configuration: Readonly<ClassroomConfig>,
): ExplanationApiRequest {
  return {
    mode: "current-decision",
    configuration: { ...configuration },
  };
}

export function scenarioExplanationRequest(
  configuration: Readonly<ClassroomConfig>,
  scenarioId: BuiltInScenarioId,
): ExplanationApiRequest {
  return {
    mode: "scenario-response",
    configuration: { ...configuration },
    scenarioId,
  };
}

export function explanationSourceLabel(source: Readonly<ExplanationSource>): string {
  return source.kind === "ai" ? "AI grounded explanation" : "Evidence summary";
}

export function fallbackStatusText(source: Readonly<ExplanationSource>): string {
  if (source.kind === "ai") return "Gemini · grounded prose";
  if (source.fallbackReason === "provider-not-configured") {
    return "Offline evidence summary · provider not configured";
  }
  if (source.fallbackReason === "provider-error") {
    return "Evidence summary · provider unavailable";
  }
  if (source.fallbackReason === "invalid-provider-result") {
    return "Evidence summary · provider response did not pass grounding checks";
  }
  return "EcoTwin deterministic evidence summary";
}
