import {
  EDGE_NODE_MESSAGE_TYPE,
  type EdgeNodeMessageParseResult,
} from "./types";

// Broad presentation safeguards, not claims about a particular sensor model.
export const EDGE_NODE_PRESENTATION_BOUNDS = {
  temperatureC: { minimum: -50, maximum: 100 },
  humidityPercent: { minimum: 0, maximum: 100 },
} as const;

export function parseEdgeNodeSerialLine(
  line: string,
): EdgeNodeMessageParseResult {
  let value: unknown;

  try {
    value = JSON.parse(line);
  } catch {
    return { kind: "invalid", reason: "Malformed JSON." };
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { kind: "invalid", reason: "Telemetry must be a JSON object." };
  }

  const message = value as Record<string, unknown>;
  if (message.type !== EDGE_NODE_MESSAGE_TYPE) return { kind: "ignored" };

  const temperatureC = message.temperatureC;
  const humidityPercent = message.humidityPercent;
  if (typeof temperatureC !== "number" || !Number.isFinite(temperatureC)) {
    return { kind: "invalid", reason: "Temperature must be finite." };
  }
  if (typeof humidityPercent !== "number" || !Number.isFinite(humidityPercent)) {
    return { kind: "invalid", reason: "Humidity must be finite." };
  }

  const temperatureBounds = EDGE_NODE_PRESENTATION_BOUNDS.temperatureC;
  if (
    temperatureC < temperatureBounds.minimum ||
    temperatureC > temperatureBounds.maximum
  ) {
    return { kind: "invalid", reason: "Temperature is outside presentation bounds." };
  }

  const humidityBounds = EDGE_NODE_PRESENTATION_BOUNDS.humidityPercent;
  if (
    humidityPercent < humidityBounds.minimum ||
    humidityPercent > humidityBounds.maximum
  ) {
    return { kind: "invalid", reason: "Humidity is outside presentation bounds." };
  }

  return {
    kind: "reading",
    reading: { temperatureC, humidityPercent },
  };
}

