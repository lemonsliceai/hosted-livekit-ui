"use client";

import { useRoomContext } from "@livekit/components-react";
import { RoomEvent, type Participant } from "livekit-client";
import { useEffect, useRef, useState } from "react";

/** Agent → page notices. Same topic the playground uses. */
const AGENT_EVENTS_TOPIC = "agent/events";

type AgentEvent = {
  type?: string;
  seconds_remaining?: number;
  limit_kind?: string;
};

/**
 * Countdown until the call ends for being quiet.
 *
 * The agent sends one `idle_shutdown_warning` with `seconds_remaining`. This
 * hook counts down from that locally. `idle_shutdown_warning_dismissed` hides
 * it, which happens when she speaks again.
 */
export function useIdleCountdown(onElapsed: () => void) {
  const room = useRoomContext();
  const onElapsedRef = useRef(onElapsed);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [seconds, setSeconds] = useState<number | null>(null);

  onElapsedRef.current = onElapsed;

  useEffect(() => {
    const onData = (
      payload: Uint8Array,
      _participant: Participant | undefined,
      _kind: unknown,
      topic?: string,
    ) => {
      if (topic !== AGENT_EVENTS_TOPIC) return;
      let data: AgentEvent;
      try {
        data = JSON.parse(new TextDecoder().decode(payload)) as AgentEvent;
      } catch {
        return;
      }
      if (data.type === "idle_shutdown_warning_dismissed") {
        setDeadlineMs(null);
        return;
      }
      if (data.type !== "idle_shutdown_warning") return;
      if (data.limit_kind !== "idle") return;
      const remaining = data.seconds_remaining;
      if (typeof remaining !== "number" || !Number.isFinite(remaining)) return;
      setDeadlineMs(Date.now() + Math.max(0, remaining) * 1000);
    };

    const onDisconnected = () => setDeadlineMs(null);

    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.Disconnected, onDisconnected);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.Disconnected, onDisconnected);
    };
  }, [room]);

  useEffect(() => {
    if (deadlineMs === null) {
      setSeconds(null);
      return;
    }

    let ended = false;
    const tick = () => {
      const left = Math.ceil((deadlineMs - Date.now()) / 1000);
      if (left <= 0) {
        if (ended) return;
        ended = true;
        setSeconds(null);
        setDeadlineMs(null);
        onElapsedRef.current();
        return;
      }
      setSeconds(left);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  return seconds;
}
