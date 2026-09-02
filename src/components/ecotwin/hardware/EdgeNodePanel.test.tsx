import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EdgeNodePanelView } from "./EdgeNodePanel";

describe("EcoTwin Edge Node panel", () => {
  it("presents the required unsupported-browser guidance", () => {
    const html = renderToStaticMarkup(
      <EdgeNodePanelView session={{
        status: "unsupported",
        telemetry: null,
        freshness: null,
        updatedLabel: null,
        errorMessage: null,
        connect: vi.fn(async () => undefined),
        disconnect: vi.fn(async () => undefined),
      }} />,
    );

    expect(html).toContain("UNSUPPORTED");
    expect(html).toContain("Web Serial is not supported in this browser.");
    expect(html).toContain(
      "Use Chrome or Edge on desktop for the EcoTwin Edge Node demo.",
    );
    expect(html).not.toContain("CONNECT EDGE NODE");
  });

  it("labels connected measurements as observed local telemetry", () => {
    const html = renderToStaticMarkup(
      <EdgeNodePanelView session={{
        status: "connected",
        telemetry: {
          type: "ecotwin-edge",
          source: "arduino-usb-serial",
          temperatureC: 29.8,
          humidityPercent: 68,
          receivedAtMs: 1_000,
        },
        freshness: "live",
        updatedLabel: "just now",
        errorMessage: null,
        connect: vi.fn(async () => undefined),
        disconnect: vi.fn(async () => undefined),
      }} />,
    );

    expect(html).toContain("CONNECTED");
    expect(html).toContain("29.8");
    expect(html).toContain("68");
    expect(html).toContain("Arduino · USB Serial");
    expect(html).toContain("local browser only");
    expect(html).toContain("contributes only after explicit sensor-mode activation");
  });

  it("offers explicit sensor-mode activation only for live telemetry", () => {
    const activate = vi.fn();
    const html = renderToStaticMarkup(
      <EdgeNodePanelView
        session={{
          status: "connected",
          telemetry: {
            type: "ecotwin-edge",
            source: "arduino-usb-serial",
            temperatureC: 25.8,
            humidityPercent: 44,
            receivedAtMs: 1_000,
          },
          freshness: "live",
          updatedLabel: "just now",
          errorMessage: null,
          connect: vi.fn(async () => undefined),
          disconnect: vi.fn(async () => undefined),
        }}
        sensorMode={{
          active: false,
          canActivate: true,
          activating: false,
          onActivate: activate,
          onReturnToManual: vi.fn(),
        }}
      />,
    );

    expect(html).toContain("USE EDGE NODE IN DIGITAL TWIN");
    expect(html).not.toContain("RETURN TO MANUAL MODE");
  });

  it("offers return to manual mode without replacing disconnect", () => {
    const html = renderToStaticMarkup(
      <EdgeNodePanelView
        session={{
          status: "connected",
          telemetry: {
            type: "ecotwin-edge",
            source: "arduino-usb-serial",
            temperatureC: 25.8,
            humidityPercent: 44,
            receivedAtMs: 1_000,
          },
          freshness: "stale",
          updatedLabel: "6 seconds ago",
          errorMessage: null,
          connect: vi.fn(async () => undefined),
          disconnect: vi.fn(async () => undefined),
        }}
        sensorMode={{
          active: true,
          canActivate: false,
          activating: false,
          onActivate: vi.fn(),
          onReturnToManual: vi.fn(),
        }}
      />,
    );

    expect(html).toContain("RETURN TO MANUAL MODE");
    expect(html).toContain("DISCONNECT");
  });

  it("shows no recent data while connected and awaiting the first reading", () => {
    const html = renderToStaticMarkup(
      <EdgeNodePanelView session={{
        status: "connected",
        telemetry: null,
        freshness: null,
        updatedLabel: null,
        errorMessage: null,
        connect: vi.fn(async () => undefined),
        disconnect: vi.fn(async () => undefined),
      }} />,
    );

    expect(html).toContain("CONNECTED");
    expect(html).toContain("NO RECENT DATA");
    expect(html).toContain("Awaiting first reading");
  });
});
