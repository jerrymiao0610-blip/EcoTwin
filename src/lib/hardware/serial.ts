import { createEdgeNodeTelemetry } from "./telemetry";
import {
  EDGE_NODE_BAUD_RATE,
  type EdgeNodeConnectionStatus,
  type EdgeNodeTelemetry,
} from "./types";
import { parseEdgeNodeSerialLine } from "./validation";

export interface EdgeSerialReader {
  read(): Promise<{ readonly done: boolean; readonly value?: Uint8Array }>;
  cancel(): Promise<void>;
  releaseLock(): void;
}

export interface EdgeSerialPort {
  readonly readable: { getReader(): EdgeSerialReader } | null;
  open(options: { readonly baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

export interface EdgeSerialApi {
  requestPort(): Promise<EdgeSerialPort>;
}

interface EdgeNodeSerialClientOptions {
  readonly navigatorValue?: unknown;
  readonly now?: () => number;
  readonly onReading?: (telemetry: EdgeNodeTelemetry) => void;
  readonly onStatusChange?: (status: EdgeNodeConnectionStatus) => void;
  readonly onError?: (error: Error) => void;
}

export class WebSerialUnsupportedError extends Error {
  constructor() {
    super("Web Serial is not supported in this browser.");
    this.name = "WebSerialUnsupportedError";
  }
}

function defaultNavigatorValue(): unknown {
  return typeof navigator === "undefined" ? undefined : navigator;
}

export function getEdgeSerialApi(
  navigatorValue: unknown = defaultNavigatorValue(),
): EdgeSerialApi | null {
  if (navigatorValue === null || typeof navigatorValue !== "object") return null;
  const serial = (navigatorValue as { serial?: unknown }).serial;
  if (serial === null || typeof serial !== "object") return null;
  if (typeof (serial as { requestPort?: unknown }).requestPort !== "function") {
    return null;
  }
  return serial as EdgeSerialApi;
}

export function isWebSerialSupported(
  navigatorValue: unknown = defaultNavigatorValue(),
): boolean {
  return getEdgeSerialApi(navigatorValue) !== null;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error("The serial connection failed.");
}

export class EdgeNodeSerialClient {
  private readonly serialApi: EdgeSerialApi | null;
  private readonly now: () => number;
  private readonly onReading?: (telemetry: EdgeNodeTelemetry) => void;
  private readonly onStatusChange?: (status: EdgeNodeConnectionStatus) => void;
  private readonly onError?: (error: Error) => void;
  private port: EdgeSerialPort | null = null;
  private reader: EdgeSerialReader | null = null;
  private connectTask: Promise<void> | null = null;
  private readTask: Promise<void> | null = null;
  private disconnectRequested = false;

  constructor(options: Readonly<EdgeNodeSerialClientOptions> = {}) {
    this.serialApi = getEdgeSerialApi(options.navigatorValue);
    this.now = options.now ?? Date.now;
    this.onReading = options.onReading;
    this.onStatusChange = options.onStatusChange;
    this.onError = options.onError;
  }

  connect(): Promise<void> {
    if (this.connectTask) return this.connectTask;
    if (this.port) return Promise.resolve();
    if (!this.serialApi) return Promise.reject(new WebSerialUnsupportedError());

    this.disconnectRequested = false;
    const task = this.openSelectedPort();
    this.connectTask = task;
    void task.then(
      () => { if (this.connectTask === task) this.connectTask = null; },
      () => { if (this.connectTask === task) this.connectTask = null; },
    );
    return task;
  }

  private async openSelectedPort(): Promise<void> {
    const port = await this.serialApi!.requestPort();
    this.port = port;

    try {
      await port.open({ baudRate: EDGE_NODE_BAUD_RATE });
      if (!port.readable) throw new Error("The selected serial port is not readable.");

      const reader = port.readable.getReader();
      this.reader = reader;
      this.onStatusChange?.("connected");
      const readTask = this.readLines(port, reader);
      this.readTask = readTask;
      void readTask.then(
        () => { if (this.readTask === readTask) this.readTask = null; },
        () => { if (this.readTask === readTask) this.readTask = null; },
      );
    } catch (error) {
      await this.closePort(port);
      throw error;
    }
  }

  private async readLines(
    port: EdgeSerialPort,
    reader: EdgeSerialReader,
  ): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    let terminalError: Error | null = null;

    try {
      while (!this.disconnectRequested) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          const parsed = parseEdgeNodeSerialLine(trimmedLine);
          if (parsed.kind !== "reading") continue;
          this.onReading?.(createEdgeNodeTelemetry(parsed.reading, this.now()));
        }
      }
    } catch (error) {
      if (!this.disconnectRequested) {
        terminalError = asError(error);
        this.onError?.(terminalError);
      }
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // The browser may already have released a reader after a physical unplug.
      }
      if (this.reader === reader) this.reader = null;
      await this.closePort(port);
      this.onStatusChange?.(terminalError ? "error" : "disconnected");
    }
  }

  private async closePort(port: EdgeSerialPort): Promise<void> {
    try {
      await port.close();
    } catch {
      // Closing an unplugged device can fail; ownership is still released.
    } finally {
      if (this.port === port) this.port = null;
    }
  }

  async disconnect(): Promise<void> {
    this.disconnectRequested = true;
    const reader = this.reader;

    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // Continue cleanup even if the device disappeared before cancellation.
      }
    }

    if (this.readTask) {
      await this.readTask;
    } else if (this.port) {
      await this.closePort(this.port);
      this.onStatusChange?.("disconnected");
    }
  }
}
