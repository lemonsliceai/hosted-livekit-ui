// Avoid editing

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createRoom,
  type RoomConnection,
  type RoomRequest,
  type StartCallOptions,
} from "./room";

export type CallStatus = "idle" | "connecting" | "live" | "ended" | "error";

export type CallState = {
  status: CallStatus;
  /** Last error, for your own logging or UI. */
  errorMessage: string | null;
  connection: RoomConnection | null;
  /** LemonSlice session ID for the active call, or null before one starts. */
  sessionId: string | null;
  start: (options?: StartCallOptions) => void;
  end: () => void;
  /** Called once the avatar's video track arrives. */
  markLive: () => void;
  /** Wire these to `<LiveKitRoom>`. */
  onDisconnected: () => void;
  onError: (error: Error) => void;
};

/**
 * Owns the call lifecycle.
 */
export function useLemonSliceCall({ startCallUrl }: RoomRequest): CallState {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [connection, setConnection] = useState<RoomConnection | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  const start = useCallback((options: StartCallOptions = {}) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("connecting");
    setErrorMessage(null);

    createRoom({ startCallUrl, ...options }, controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setConnection(next);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        // Errors go to the console
        console.error("[lemonslice] could not start the call:", error);
        setErrorMessage(error instanceof Error ? error.message : "Could not start the call");
        setStatus("error");
      });
  }, [startCallUrl]);

  const end = useCallback(() => {
    abortRef.current?.abort();
    setConnection(null);
    setStatus("ended");
  }, []);

  const markLive = useCallback(() => setStatus("live"), []);

  const onDisconnected = useCallback(() => {
    setConnection(null);
    setStatus((current) => (current === "error" ? current : "ended"));
  }, []);

  const onError = useCallback((error: Error) => {
    console.error("[lemonslice] room error:", error);
    setConnection(null);
    setErrorMessage(error.message);
    setStatus("error");
  }, []);

  return {
    status,
    errorMessage,
    connection,
    sessionId: connection?.sessionId ?? null,
    start,
    end,
    markLive,
    onDisconnected,
    onError,
  };
}
