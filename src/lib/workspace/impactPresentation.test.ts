import { describe, expect, it } from "vitest";
import { presentImpactDelta } from "./impactPresentation";

describe("presentImpactDelta", () => {
  it("presents a negative signed delta as a positive saving", () => {
    expect(presentImpactDelta(-7.5)).toEqual({
      signedValue: -7.5,
      magnitude: 7.5,
      direction: "improvement",
      valueQualifier: "saved",
      comparisonQualifier: "lower",
    });
  });

  it("presents a positive signed delta as additional impact", () => {
    expect(presentImpactDelta(7.5)).toEqual({
      signedValue: 7.5,
      magnitude: 7.5,
      direction: "degradation",
      valueQualifier: "additional",
      comparisonQualifier: "higher",
    });
  });

  it("presents a zero signed delta without directional language", () => {
    expect(presentImpactDelta(0)).toEqual({
      signedValue: 0,
      magnitude: 0,
      direction: "neutral",
      valueQualifier: null,
      comparisonQualifier: "unchanged",
    });
  });
});
