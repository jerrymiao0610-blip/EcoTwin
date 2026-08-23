import { describe, expect, it } from "vitest";
import { criticallyDampedProgress } from "./AnimatedNumber";

describe("criticallyDampedProgress", () => {
  it("lands exactly on its supplied endpoints", () => {
    expect(criticallyDampedProgress(0)).toBe(0);
    expect(criticallyDampedProgress(1)).toBe(1);
  });

  it("is monotonic and does not overshoot", () => {
    const samples = Array.from({ length: 21 }, (_, index) =>
      criticallyDampedProgress(index / 20),
    );

    expect(samples.every((sample) => sample >= 0 && sample <= 1)).toBe(true);
    expect(samples.every((sample, index) => index === 0 || sample >= samples[index - 1])).toBe(true);
  });
});
