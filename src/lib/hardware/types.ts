export const EDGE_NODE_MESSAGE_TYPE = "ecotwin-edge" as const;
export const EDGE_NODE_BAUD_RATE = 115_200;

export type EdgeNodeConnectionStatus =
  | "unsupported"
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "error";

export type EdgeNodeFreshness = "live" | "stale" | "no-recent-data";

/** Values received from the Arduino protocol before browser context is added. */
export interface EdgeNodeReading {
  readonly temperatureC: number;
  readonly humidityPercent: number;
}

/**
 * Observed real-world context attached by the browser. This is deliberately
 * separate from ClassroomConfig and from the modeled outdoor weather input.
 */
export interface EdgeNodeTelemetry extends EdgeNodeReading {
  readonly type: typeof EDGE_NODE_MESSAGE_TYPE;
  readonly source: "arduino-usb-serial";
  readonly receivedAtMs: number;
}

export type EdgeNodeMessageParseResult =
  | { readonly kind: "reading"; readonly reading: EdgeNodeReading }
  | { readonly kind: "ignored" }
  | { readonly kind: "invalid"; readonly reason: string };

