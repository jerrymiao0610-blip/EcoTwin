"use client";

import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  prefix?: string;
  className?: string;
  durationMs?: number;
}

const CRITICAL_DAMPING = 8;
const MIN_DURATION_MS = 150;
const MAX_DURATION_MS = 450;

/** Monotonic, no-overshoot response normalized to land exactly on 1. */
export function criticallyDampedProgress(progress: number) {
  const time = Math.min(1, Math.max(0, progress));
  const response = 1 - (1 + CRITICAL_DAMPING * time) * Math.exp(-CRITICAL_DAMPING * time);
  const endpoint = 1 - (1 + CRITICAL_DAMPING) * Math.exp(-CRITICAL_DAMPING);

  return time === 1 ? 1 : response / endpoint;
}

/**
 * Animates only the displayed value. The supplied model value remains the source
 * of truth and is written exactly at the end of every interruptible transition.
 */
export function AnimatedNumber({
  value,
  maximumFractionDigits = 1,
  minimumFractionDigits = 0,
  prefix = "",
  className,
  durationMs = 360,
}: AnimatedNumberProps) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<number | null>(null);
  const displayedValueRef = useRef(value);
  const formatter = useMemo(
    () => new Intl.NumberFormat("en-US", {
      maximumFractionDigits,
      minimumFractionDigits,
    }),
    [maximumFractionDigits, minimumFractionDigits],
  );
  const format = useCallback(
    (nextValue: number) => `${prefix}${formatter.format(nextValue)}`,
    [formatter, prefix],
  );
  const animationDurationMs = Math.min(
    MAX_DURATION_MS,
    Math.max(MIN_DURATION_MS, durationMs),
  );

  useLayoutEffect(() => {
    const element = elementRef.current;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!element) return;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);

    const resolveToTarget = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      displayedValueRef.current = value;
      element.textContent = format(value);
    };

    if (mediaQuery.matches || displayedValueRef.current === value) {
      resolveToTarget();
      return;
    }

    const startValue = displayedValueRef.current;
    // React has rendered the new target. Restore the live presentation value
    // before paint so a retargeted animation never flashes or stacks readings.
    element.textContent = format(startValue);
    const startedAt = performance.now();
    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - startedAt) / animationDurationMs);
      const nextValue = startValue + (value - startValue) * criticallyDampedProgress(elapsed);
      displayedValueRef.current = nextValue;
      element.textContent = format(nextValue);

      if (elapsed < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        resolveToTarget();
      }
    };

    mediaQuery.addEventListener("change", resolveToTarget, { once: true });
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      mediaQuery.removeEventListener("change", resolveToTarget);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [animationDurationMs, format, value]);

  return (
    <span
      ref={elementRef}
      className={["animated-number", className].filter(Boolean).join(" ")}
      aria-label={format(value)}
    >
      {format(value)}
    </span>
  );
}
