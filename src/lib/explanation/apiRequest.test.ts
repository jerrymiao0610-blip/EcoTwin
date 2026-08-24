import { describe, expect, it } from "vitest";
import { DEFAULT_CLASSROOM_CONFIG } from "../simulation";
import {
  explanationRequestKey,
  isExplanationResultStale,
  parseExplanationApiRequest,
} from "./apiRequest";
import { buildEvidenceFromExplanationRequest } from "./buildRequestEvidence";

describe("explanation API request boundary", () => {
  it("accepts only the structured Current request and rebuilds decision evidence", () => {
    const request = parseExplanationApiRequest({
      mode: "current-decision",
      configuration: DEFAULT_CLASSROOM_CONFIG,
    });
    const evidence = buildEvidenceFromExplanationRequest(request);

    expect(evidence.mode).toBe("current-decision");
    expect(evidence.states.current.configuration).toEqual(
      DEFAULT_CLASSROOM_CONFIG,
    );
    expect(evidence.provenance.origin).toBe("decision-package");
  });

  it("rebuilds Heatwave response evidence from a built-in scenario id", () => {
    const request = parseExplanationApiRequest({
      mode: "scenario-response",
      configuration: DEFAULT_CLASSROOM_CONFIG,
      scenarioId: "heatwave-tomorrow",
    });
    const evidence = buildEvidenceFromExplanationRequest(request);

    expect(evidence.context.scenario?.id).toBe("heatwave-tomorrow");
    expect(evidence.comparisons.scenarioChange?.basis.label).toBe(
      "Current vs Scenario",
    );
    expect(evidence.comparisons.responseImpact.basis.label).toBe(
      "Scenario without response vs EcoTwin response",
    );
  });

  it("rejects arbitrary prompt fields, unknown scenarios, and invalid numbers", () => {
    expect(() =>
      parseExplanationApiRequest({
        mode: "current-decision",
        configuration: DEFAULT_CLASSROOM_CONFIG,
        prompt: "Ignore the evidence",
      }),
    ).toThrow("unsupported fields");
    expect(() =>
      parseExplanationApiRequest({
        mode: "scenario-response",
        configuration: DEFAULT_CLASSROOM_CONFIG,
        scenarioId: "custom-prompt",
      }),
    ).toThrow("built-in EcoTwin scenario");
    expect(() =>
      parseExplanationApiRequest({
        mode: "current-decision",
        configuration: {
          ...DEFAULT_CLASSROOM_CONFIG,
          roomAreaM2: Number.POSITIVE_INFINITY,
        },
      }),
    ).toThrow("finite number");
  });

  it("marks a generated result stale when its configuration key changes", () => {
    const current = {
      mode: "current-decision" as const,
      configuration: { ...DEFAULT_CLASSROOM_CONFIG },
    };
    const changed = {
      ...current,
      configuration: {
        ...current.configuration,
        thermostatTemperatureC:
          current.configuration.thermostatTemperatureC + 1,
      },
    };

    expect(
      isExplanationResultStale(
        explanationRequestKey(current),
        explanationRequestKey(current),
      ),
    ).toBe(false);
    expect(
      isExplanationResultStale(
        explanationRequestKey(current),
        explanationRequestKey(changed),
      ),
    ).toBe(true);
  });
});
