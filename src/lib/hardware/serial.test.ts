import { describe, expect, it, vi } from "vitest";
import {
  EdgeNodeSerialClient,
  type EdgeSerialPort,
  type EdgeSerialReader,
  isWebSerialSupported,
} from "./serial";

const encode = (value: string) => new TextEncoder().encode(value);

describe("EcoTwin Edge Node Web Serial client", () => {
  it("reads split newline-delimited messages and ignores malformed lines", async () => {
    const onReading = vi.fn();
    const onStatusChange = vi.fn();
    const reader: EdgeSerialReader = {
      read: vi.fn()
        .mockResolvedValueOnce({
          done: false,
          value: encode('{"type":"ecotwin-edge","temperatureC":29.'),
        })
        .mockResolvedValueOnce({
          done: false,
          value: encode('8,"humidityPercent":68}\nnot-json\n{"type":"other"}\n'),
        })
        .mockResolvedValueOnce({ done: true }),
      cancel: vi.fn(async () => undefined),
      releaseLock: vi.fn(),
    };
    const port: EdgeSerialPort = {
      readable: { getReader: () => reader },
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const client = new EdgeNodeSerialClient({
      navigatorValue: { serial: { requestPort: vi.fn(async () => port) } },
      now: () => 42_000,
      onReading,
      onStatusChange,
    });

    await client.connect();
    await vi.waitFor(() => expect(port.close).toHaveBeenCalledOnce());

    expect(port.open).toHaveBeenCalledWith({ baudRate: 115_200 });
    expect(onReading).toHaveBeenCalledOnce();
    expect(onReading).toHaveBeenCalledWith({
      type: "ecotwin-edge",
      source: "arduino-usb-serial",
      temperatureC: 29.8,
      humidityPercent: 68,
      receivedAtMs: 42_000,
    });
    expect(onStatusChange.mock.calls).toEqual([
      ["connected"],
      ["disconnected"],
    ]);
  });

  it("cancels the reader, releases its lock, and closes on disconnect", async () => {
    let finishRead: ((result: { done: boolean }) => void) | undefined;
    const reader: EdgeSerialReader = {
      read: vi.fn(() => new Promise<{ done: boolean }>((resolve) => {
        finishRead = resolve;
      })),
      cancel: vi.fn(async () => { finishRead?.({ done: true }); }),
      releaseLock: vi.fn(),
    };
    const port: EdgeSerialPort = {
      readable: { getReader: () => reader },
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const client = new EdgeNodeSerialClient({
      navigatorValue: { serial: { requestPort: vi.fn(async () => port) } },
    });

    await client.connect();
    await client.disconnect();

    expect(reader.cancel).toHaveBeenCalledOnce();
    expect(reader.releaseLock).toHaveBeenCalledOnce();
    expect(port.close).toHaveBeenCalledOnce();
  });

  it("releases the port and reports an error after a physical unplug", async () => {
    const unplugError = new Error("The device has been lost.");
    const onError = vi.fn();
    const onStatusChange = vi.fn();
    const reader: EdgeSerialReader = {
      read: vi.fn(async () => { throw unplugError; }),
      cancel: vi.fn(async () => undefined),
      releaseLock: vi.fn(),
    };
    const port: EdgeSerialPort = {
      readable: { getReader: () => reader },
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const client = new EdgeNodeSerialClient({
      navigatorValue: { serial: { requestPort: vi.fn(async () => port) } },
      onError,
      onStatusChange,
    });

    await client.connect();
    await vi.waitFor(() =>
      expect(onStatusChange).toHaveBeenLastCalledWith("error"),
    );

    expect(reader.releaseLock).toHaveBeenCalledOnce();
    expect(port.close).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(unplugError);
  });

  it("prevents duplicate simultaneous port requests", async () => {
    let selectPort: ((port: EdgeSerialPort) => void) | undefined;
    const reader: EdgeSerialReader = {
      read: vi.fn(async () => ({ done: true })),
      cancel: vi.fn(async () => undefined),
      releaseLock: vi.fn(),
    };
    const port: EdgeSerialPort = {
      readable: { getReader: () => reader },
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    };
    const requestPort = vi.fn(() => new Promise<EdgeSerialPort>((resolve) => {
      selectPort = resolve;
    }));
    const client = new EdgeNodeSerialClient({
      navigatorValue: { serial: { requestPort } },
    });

    const firstConnect = client.connect();
    const secondConnect = client.connect();
    selectPort?.(port);
    await Promise.all([firstConnect, secondConnect]);

    expect(requestPort).toHaveBeenCalledOnce();
  });

  it("can request a new port and reconnect after a physical unplug", async () => {
    const unplugError = new Error("The device has been lost.");
    const firstReader: EdgeSerialReader = {
      read: vi.fn(async () => { throw unplugError; }),
      cancel: vi.fn(async () => undefined),
      releaseLock: vi.fn(),
    };
    let finishSecondRead: ((result: { done: boolean }) => void) | undefined;
    const secondReader: EdgeSerialReader = {
      read: vi.fn(() => new Promise<{ done: boolean }>((resolve) => {
        finishSecondRead = resolve;
      })),
      cancel: vi.fn(async () => { finishSecondRead?.({ done: true }); }),
      releaseLock: vi.fn(),
    };
    const ports: EdgeSerialPort[] = [firstReader, secondReader].map((reader) => ({
      readable: { getReader: () => reader },
      open: vi.fn(async () => undefined),
      close: vi.fn(async () => undefined),
    }));
    const requestPort = vi.fn()
      .mockResolvedValueOnce(ports[0])
      .mockResolvedValueOnce(ports[1]);
    const onStatusChange = vi.fn();
    const client = new EdgeNodeSerialClient({
      navigatorValue: { serial: { requestPort } },
      onStatusChange,
    });

    await client.connect();
    await vi.waitFor(() => expect(onStatusChange).toHaveBeenLastCalledWith("error"));
    await client.connect();
    expect(onStatusChange).toHaveBeenLastCalledWith("connected");
    await client.disconnect();

    expect(requestPort).toHaveBeenCalledTimes(2);
    expect(secondReader.cancel).toHaveBeenCalledOnce();
    expect(ports[1].close).toHaveBeenCalledOnce();
  });

  it("feature-detects unsupported browsers", async () => {
    expect(isWebSerialSupported({})).toBe(false);
    expect(isWebSerialSupported({ serial: { requestPort() {} } })).toBe(true);

    const client = new EdgeNodeSerialClient({ navigatorValue: {} });
    await expect(client.connect()).rejects.toThrow(
      "Web Serial is not supported in this browser.",
    );
  });
});
