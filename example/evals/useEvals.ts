"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { logRecord } from "./log";
import type { DataListener, EvalRoom, Prompts, Session, Truth, Verdict } from "./types";

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
export function useEvals(room: EvalRoom | null, options: { character?: string | null } = {}) {
  const [verdicts, setVerdicts] = useState<Verdict[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [prompts, setPrompts] = useState<Prompts | null>(null);
  const [sessionNote, setSessionNoteState] = useState("");
  const startedAt = useRef<string>(stamp());
  const logKey = useRef<string | null>(null);
  // The file is named by the LemonSlice session id, which only the agent knows. Records
  // written before its first record arrives wait here; if the call ends first, they are
  // filed under the LiveKit room name instead.
  const pending = useRef<Record<string, unknown>[]>([]);

  const setKey = useCallback((id: string) => {
    logKey.current = `${startedAt.current}-${id}`;
    for (const record of pending.current) logRecord({ session: logKey.current, ...record });
    pending.current = [];
  }, []);

  const log = useCallback(
    (record: Record<string, unknown>) => {
      if (!logKey.current && typeof record.session_id === "string" && record.session_id) setKey(record.session_id);
      if (logKey.current) logRecord({ session: logKey.current, ...record });
      else pending.current.push(record);
    },
    [setKey],
  );

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
    pending.current = [];
    setVerdicts([]);
    setSession(null);
    setPrompts(null);
    setSessionNoteState("");
    let gotSession = false;
    // What the page knows: the character it asked for. Filed once the agent names the session.
    log({ kind: "page", time: new Date().toISOString(), character: options.character ?? null });

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
      if (type === "prompts") {
        setPrompts(rest as Prompts);
        log({ kind: "prompts", ...rest });
        return;
      }
      if (type === "verdict" && typeof rest.turn === "string" && typeof rest.decision === "string") {
        const verdict = { ...rest, time: rest.time ?? new Date().toISOString(), text: rest.text ?? "" } as Verdict;
        setVerdicts((current) => [verdict, ...current.filter((v) => v.turn !== verdict.turn)].slice(0, HISTORY));
        // `kind` is the decision: the record shape companion-demo's harness_report.py reads.
        log({ kind: verdict.decision, ...verdict });
        return;
      }
      if (type === "status" && typeof rest.turn === "string" && typeof rest.status === "string") {
        const status = rest.status;
        const timings = (rest.timings ?? {}) as Record<string, number>;
        // reply_done is the agent's own marker, only there to carry a timing; it is not a clip state.
        setVerdicts((current) =>
          current.map((v) =>
            v.turn === rest.turn
              ? { ...v, ...(status === "reply_done" ? {} : { status }), timings: { ...v.timings, ...timings } }
              : v,
          ),
        );
        log({ kind: "status", ...rest });
        return;
      }
      if (type === "avatar") {
        log({ kind: "avatar", ...rest }); // what the deployment actually sends; log only
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
      // The call ended before the agent named it: file what we have under the room name,
      // which is known by now even if it was empty at connect.
      if (!logKey.current && pending.current.length) setKey(room.name || "unknown");
    };
    // options.character is read once per call, when the room connects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, log, send, setKey]);

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
    (turn: string, prompt: string, duration: number, audio: boolean, event?: string) => {
      patch(turn, (v) => ({ ...v, replay: "pending", status: undefined }));
      send({ kind: "replay", turn, prompt, duration, audio, ...(event ? { event } : {}) });
    },
    [patch, send],
  );

  return { verdicts, session, prompts, sessionNote, label, note, setSessionNote, replay, live: room !== null };
}
