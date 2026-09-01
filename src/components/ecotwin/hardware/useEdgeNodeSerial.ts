"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  EdgeNodeSerialClient,
  isWebSerialSupported,
  WebSerialUnsupportedError,
} from "@/lib/hardware/serial";
import {
  formatEdgeNodeUpdated,
  getEdgeNodeFreshness,
} from "@/lib/hardware/telemetry";
import type {
  EdgeNodeConnectionStatus,
  EdgeNodeFreshness,
  EdgeNodeTelemetry,
} from "@/lib/hardware/types";

export interface EdgeNodeSerialSession {
  readonly status: EdgeNodeConnectionStatus;
  readonly telemetry: EdgeNodeTelemetry | null;
  readonly freshness: EdgeNodeFreshness | null;
  readonly updatedLabel: string | null;
  readonly errorMessage: string | null;
  readonly connect: () => Promise<void>;
  readonly disconnect: () => Promise<void>;
}

const subscribeToSerialSupport = () => () => undefined;
const getServerSerialSupport = () => false;

export function useEdgeNodeSerial(): EdgeNodeSerialSession {
  const supported = useSyncExternalStore(
    subscribeToSerialSupport,
    isWebSerialSupported,
    getServerSerialSupport,
  );
  const [status, setStatus] = useState<EdgeNodeConnectionStatus>("disconnected");
  const [telemetry, setTelemetry] = useState<EdgeNodeTelemetry | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(0);
  const clientRef = useRef<EdgeNodeSerialClient | null>(null);
  const mountedRef = useRef(true);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new EdgeNodeSerialClient({
        onReading: (nextTelemetry) => {
          if (!mountedRef.current) return;
          setTelemetry(nextTelemetry);
          setNowMs(nextTelemetry.receivedAtMs);
        },
        onStatusChange: (nextStatus) => {
          if (mountedRef.current) setStatus(nextStatus);
        },
        onError: (error) => {
          if (!mountedRef.current) return;
          setErrorMessage(error.message);
          setStatus("error");
        },
      });
    }
    return clientRef.current;
  }, []);

  const connect = useCallback(async () => {
    if (!supported || status === "connecting" || status === "connected") {
      return;
    }

    setErrorMessage(null);
    setStatus("connecting");
    try {
      await getClient().connect();
    } catch (error) {
      if (!mountedRef.current) return;
      if (error instanceof DOMException && error.name === "NotFoundError") {
        setStatus("disconnected");
        return;
      }
      setErrorMessage(
        error instanceof Error ? error.message : "The serial connection failed.",
      );
      setStatus(error instanceof WebSerialUnsupportedError ? "unsupported" : "error");
    }
  }, [getClient, status, supported]);

  const disconnect = useCallback(async () => {
    if (!clientRef.current) {
      setStatus("disconnected");
      return;
    }

    setStatus("disconnecting");
    setErrorMessage(null);
    await clientRef.current.disconnect();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void clientRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!telemetry) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [telemetry]);

  const freshness = useMemo(
    () => telemetry ? getEdgeNodeFreshness(telemetry.receivedAtMs, nowMs) : null,
    [nowMs, telemetry],
  );
  const updatedLabel = useMemo(
    () => telemetry ? formatEdgeNodeUpdated(telemetry.receivedAtMs, nowMs) : null,
    [nowMs, telemetry],
  );

  return {
    status: supported ? status : "unsupported",
    telemetry,
    freshness,
    updatedLabel,
    errorMessage,
    connect,
    disconnect,
  };
}
