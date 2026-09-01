import {
  EDGE_NODE_MESSAGE_TYPE,
  type EdgeNodeFreshness,
  type EdgeNodeReading,
  type EdgeNodeTelemetry,
} from "./types";

export function createEdgeNodeTelemetry(
  reading: Readonly<EdgeNodeReading>,
  receivedAtMs: number,
): EdgeNodeTelemetry {
  if (!Number.isFinite(receivedAtMs)) {
    throw new TypeError("Edge Node receipt time must be finite.");
  }

  return Object.freeze({
    type: EDGE_NODE_MESSAGE_TYPE,
    source: "arduino-usb-serial" as const,
    temperatureC: reading.temperatureC,
    humidityPercent: reading.humidityPercent,
    receivedAtMs,
  });
}

export function getEdgeNodeFreshness(
  receivedAtMs: number,
  nowMs: number,
): EdgeNodeFreshness {
  const ageMs = Math.max(0, nowMs - receivedAtMs);
  if (ageMs < 5_000) return "live";
  if (ageMs <= 15_000) return "stale";
  return "no-recent-data";
}

export function formatEdgeNodeUpdated(
  receivedAtMs: number,
  nowMs: number,
): string {
  const ageSeconds = Math.max(0, Math.floor((nowMs - receivedAtMs) / 1_000));
  if (ageSeconds < 2) return "just now";
  return `${ageSeconds} seconds ago`;
}

