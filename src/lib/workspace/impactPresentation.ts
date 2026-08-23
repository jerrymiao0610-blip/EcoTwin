/** Semantic interpretation of signed impact deltas for presentation only. */
export type ImpactPresentationDirection =
  | "improvement"
  | "degradation"
  | "neutral";

export interface ImpactDeltaPresentation {
  /** Original candidate - baseline value, retained for traceability. */
  signedValue: number;
  /** Unsigned display magnitude. */
  magnitude: number;
  direction: ImpactPresentationDirection;
  valueQualifier: "saved" | "additional" | null;
  comparisonQualifier: "lower" | "higher" | "unchanged";
}

/**
 * Converts a signed candidate - baseline delta into display semantics without
 * changing the source value or performing any impact calculation.
 */
export function presentImpactDelta(
  signedValue: number,
): ImpactDeltaPresentation {
  if (signedValue < 0) {
    return {
      signedValue,
      magnitude: Math.abs(signedValue),
      direction: "improvement",
      valueQualifier: "saved",
      comparisonQualifier: "lower",
    };
  }

  if (signedValue > 0) {
    return {
      signedValue,
      magnitude: signedValue,
      direction: "degradation",
      valueQualifier: "additional",
      comparisonQualifier: "higher",
    };
  }

  return {
    signedValue,
    magnitude: 0,
    direction: "neutral",
    valueQualifier: null,
    comparisonQualifier: "unchanged",
  };
}
