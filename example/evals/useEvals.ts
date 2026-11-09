"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logRecord } from "./log";
import type { DataListener, EvalRoom, Session, Truth, Verdict } from "./types";

const EVALS_TOPIC = "agent/evals"; // agent -> page
const CONTROL_TOPIC = "agent/evals-control"; // page -> agent
const HISTORY = 50;
// The agent may join after us, so hello is repeated until the session record arrives.
const HELLO_RETRY_MS = [0, 3000, 8000];

function stamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

/**
 * Everything the panel shows and does. One log file per call, named by the call's start
 * time and the LemonSlice session id (room name until the id is known). Every record the
 * agent sends and every mark made here is appended to it.
 */
export function useEvals(room: EvalRoom | null) {
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionNote, setSessionNoteState] = useState("");
  const startedAt = useRef<string>(stamp());
  const logKey = useRef<string | null>(null);
  const roomName = useRef<string>("");

  const log = useCallback((record: Record<string, unknown>) => {
    if (!logKey.current) {
      const id = typeof record.session_id === "string" && record.session_id ? record.session_id : roomName.current || "unknown";
      logKey.current = `${startedAt.current}-${id}`;
    }
    logRecord({ session: logKey.current, ...record });
  }, []);

  const send = useCallback(
    (body: Record<string, unknown>) => {
      if (!room) return;
      room.localParticipant
        .publishData(new TextEncoder().encode(JSON.stringify(body)), { reliable: true, topic: CONTROL_TOPIC })
        .catch((error) => console.warn("[evals] control message failed:", error));
    },
    [room],
  );

  useEffect(() => {
    if (!room) return;
    // A new call: new file, clean slate.
    startedAt.current = stamp();
    logKey.current = null;
    roomName.current = room.name;
    setVerdicts([]);
    setSession(null);
    setSessionNoteState("");
    let gotSession = false;

    const onData: DataListener = (payload, _participant, _kind, topic) => {
      if (topic !== EVALS_TOPIC) return;
      let data: Record<string, unknown> & { type?: unknown };
      try {
        data = JSON.parse(new TextDecoder().decode(payload)) as typeof data;
      } catch {
        return;
      }
      const { type, ...rest } = data;
      if (type === "session") {
        gotSession = true;
        setSession(rest as Session);
        log({ kind: "session", ...rest });
        return;
      }
      if (type === "verdict" && typeof rest.turn === "string" && typeof rest.decision === "string") {
        const verdict = { ...rest, time: rest.time ?? new Date().toISOString(), text: rest.text ?? "" } as Verdict;
        setVerdicts((current) => [verdict, ...current.filter((v) => v.turn !== verdict.turn)].slice(0, HISTORY));
        // `kind` is the decision: the record shape companion-demo's harness_report.py reads.
        log({ kind: verdict.decision, ...verdict });
        return;
      }
      if (type === "replay" && typeof rest.turn === "string") {
        const accepted = rest.accepted === true;
        setVerdicts((current) =>
          current.map((v) =>
            v.turn === rest.turn
              ? { ...v, replay: accepted ? "sent" : "busy", replays: (v.replays ?? 0) + (accepted ? 1 : 0) }
              : v,
          ),
        );
        log({ kind: "replay", ...rest });
      }
    };
    room.on("dataReceived", onData);

    const timers = HELLO_RETRY_MS.map((ms) =>
      window.setTimeout(() => {
        if (!gotSession) send({ kind: "hello" });
      }, ms),
    );
    return () => {
      room.off("dataReceived", onData);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [room, log, send]);

  const patch = useCallback((turn: string, change: (v: Verdict) => Verdict) => {
    setVerdicts((current) => current.map((v) => (v.turn === turn ? change(v) : v)));
  }, []);

  /** Was that an ask for an action? The same truth again clears it. */
  const label = useCallback(
    (turn: string, truth: Truth | null) => {
      patch(turn, (v) => {
        const next = { ...v };
        if (truth) next.truth = truth;
        else delete next.truth;
        return next;
      });
      log({ kind: "label", time: new Date().toISOString(), turn, truth: truth ?? "unset" });
    },
    [log, patch],
  );

  /** A free-text note on one line. Saving again replaces it; the log keeps every version. */
  const note = useCallback(
    (turn: string, text: string) => {
      const trimmed = text.trim();
      patch(turn, (v) => {
        const next = { ...v };
        if (trimmed) next.note = trimmed;
        else delete next.note;
        return next;
      });
      log({ kind: "note", time: new Date().toISOString(), turn, text: trimmed });
    },
    [log, patch],
  );

  /** A note on the whole call. */
  const setSessionNote = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      setSessionNoteState(trimmed);
      log({ kind: "session_note", time: new Date().toISOString(), text: trimmed });
    },
    [log],
  );

  /** Play a prompt again, as written or edited. The agent answers with what it actually sent. */
  const replay = useCallback(
    (turn: string, prompt: string, duration: number, event?: string) => {
      patch(turn, (v) => ({ ...v, replay: "pending" }));
      send({ kind: "replay", turn, prompt, duration, ...(event ? { event } : {}) });
    },
    [patch, send],
  );

  return { verdicts, session, sessionNote, label, note, setSessionNote, replay, live: room !== null };
}
