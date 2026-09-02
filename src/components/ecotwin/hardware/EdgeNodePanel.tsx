"use client";

import { AnimatedNumber } from "../AnimatedNumber";
import type { EdgeNodeSerialSession } from "./useEdgeNodeSerial";

const STATUS_LABELS = {
  unsupported: "UNSUPPORTED",
  disconnected: "DISCONNECTED",
  connecting: "CONNECTING",
  connected: "CONNECTED",
  disconnecting: "DISCONNECTING",
  error: "ERROR",
} as const;

const FRESHNESS_LABELS = {
  live: "LIVE",
  stale: "STALE",
  "no-recent-data": "NO RECENT DATA",
} as const;

type EdgeNodePanelSession = Pick<
  EdgeNodeSerialSession,
  | "status"
  | "telemetry"
  | "freshness"
  | "updatedLabel"
  | "errorMessage"
  | "connect"
  | "disconnect"
>;

export interface EdgeNodeSensorModeControls {
  readonly active: boolean;
  readonly canActivate: boolean;
  readonly activating: boolean;
  readonly onActivate: () => void;
  readonly onReturnToManual: () => void;
}

export function EdgeNodePanelView({ session, sensorMode }: { session: EdgeNodePanelSession; sensorMode?: EdgeNodeSensorModeControls }) {
  const { status, telemetry, freshness, updatedLabel, errorMessage } = session;
  const connected = status === "connected";
  const busy = status === "connecting" || status === "disconnecting";
  const displayedFreshness = freshness ?? (connected ? "no-recent-data" : null);

  return (
    <section className="edge-node-panel" aria-labelledby="edge-node-title">
      <header>
        <div>
          <span className="eyebrow">Real-world context</span>
          <h2 id="edge-node-title">EcoTwin Edge Node</h2>
        </div>
        <span className={`edge-node-status status-${status}`} role="status" aria-live="polite">
          <i aria-hidden="true" />{STATUS_LABELS[status]}
        </span>
      </header>

      {status === "unsupported" ? (
        <p className="edge-node-unsupported">
          Web Serial is not supported in this browser.<br />
          Use Chrome or Edge on desktop for the EcoTwin Edge Node demo.
        </p>
      ) : (
        <>
          <div className="edge-node-readings" aria-label="Latest Edge Node measurements">
            <div>
              <span>Measured temperature</span>
              <strong>{telemetry ? <AnimatedNumber value={telemetry.temperatureC} /> : "—"}<small> °C</small></strong>
            </div>
            <div>
              <span>Measured humidity</span>
              <strong>{telemetry ? <AnimatedNumber value={telemetry.humidityPercent} maximumFractionDigits={1} /> : "—"}<small> %</small></strong>
            </div>
          </div>

          <dl className="edge-node-meta">
            <div><dt>Source</dt><dd>Arduino · USB Serial</dd></div>
            <div><dt>Updated</dt><dd>{updatedLabel ?? "Awaiting first reading"}</dd></div>
          </dl>

          {displayedFreshness ? (
            <span className={`edge-node-freshness freshness-${displayedFreshness}`}>
              {FRESHNESS_LABELS[displayedFreshness]}
            </span>
          ) : null}
          {errorMessage ? <p className="edge-node-error">{errorMessage}</p> : null}

          <div className="edge-node-controls">
            {connected || status === "disconnecting" ? (
              <button type="button" onClick={() => void session.disconnect()} disabled={busy}>
                {status === "disconnecting" ? "DISCONNECTING…" : "DISCONNECT"}
              </button>
            ) : (
              <button type="button" onClick={() => void session.connect()} disabled={busy}>
                {status === "connecting" ? "CONNECTING…" : "CONNECT EDGE NODE"}
              </button>
            )}
            <small>115200 baud · local browser only</small>
          </div>

          {sensorMode && (sensorMode.active || sensorMode.canActivate) ? (
            <button
              type="button"
              className="edge-node-mode-button"
              onClick={sensorMode.active ? sensorMode.onReturnToManual : sensorMode.onActivate}
              disabled={sensorMode.activating}
            >
              {sensorMode.active
                ? "RETURN TO MANUAL MODE"
                : sensorMode.activating
                  ? "PREPARING SENSOR MODEL…"
                  : "USE EDGE NODE IN DIGITAL TWIN"}
            </button>
          ) : null}
        </>
      )}

      <p className="edge-node-model-note">
        Humidity remains separate from the legacy equation and contributes only after explicit sensor-mode activation.
      </p>
    </section>
  );
}

export function EdgeNodePanel({ session, sensorMode }: { session: EdgeNodeSerialSession; sensorMode: EdgeNodeSensorModeControls }) {
  return <EdgeNodePanelView session={session} sensorMode={sensorMode} />;
}
