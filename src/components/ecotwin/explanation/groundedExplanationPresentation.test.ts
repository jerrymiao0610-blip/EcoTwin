import { describe, expect, it } from "vitest";
import { DEFAULT_CLASSROOM_CONFIG } from "../../../lib/simulation";
import {
  currentExplanationRequest,
  explanationSourceLabel,
  fallbackStatusText,
  scenarioExplanationRequest,
} from "./groundedExplanationPresentation";

describe("grounded explanation presentation", () => {
  it("never labels deterministic fallback as AI", () => {
    const source = {
      kind: "deterministic" as const,
      providerId: "ecotwin-deterministic",
      fallbackReason: "provider-error" as const,
    };

    expect(explanationSourceLabel(source)).toBe("Evidence summary");
    expect(explanationSourceLabel(source)).not.toContain("AI");
    expect(fallbackStatusText(source)).not.toContain("AI");
  });

  it("labels valid provider output as a grounded AI explanation", () => {
    const source = {
      kind: "ai" as const,
      providerId: "google-gemini/gemini-test",
      fallbackReason: null,
    };

    expect(explanationSourceLabel(source)).toBe("AI grounded explanation");
    expect(fallbackStatusText(source)).toContain("Gemini");
  });

  it("identifies Workers AI without claiming Gemini", () => {
    const source = {
      kind: "ai" as const,
      providerId: "cloudflare-workers-ai/@cf/meta/test-model",
      fallbackReason: null,
    };

    expect(fallbackStatusText(source)).toBe("Workers AI · grounded prose");
    expect(fallbackStatusText(source)).not.toContain("Gemini");
  });

  it("creates only the narrow Current and built-in scenario requests", () => {
    expect(currentExplanationRequest(DEFAULT_CLASSROOM_CONFIG)).toEqual({
      mode: "current-decision",
      configuration: DEFAULT_CLASSROOM_CONFIG,
    });
    expect(
      scenarioExplanationRequest(DEFAULT_CLASSROOM_CONFIG, "eco-mode"),
    ).toEqual({
      mode: "scenario-response",
      configuration: DEFAULT_CLASSROOM_CONFIG,
      scenarioId: "eco-mode",
    });
  });
});
