"use client";

import { useState, type ReactNode } from "react";
import styles from "./EvalsPanel.module.css";
import type { EvalRoom, Truth, Verdict } from "./types";
import { useEvals } from "./useEvals";

const DURATIONS = [3, 5, 10] as const;
/** How much of the suffix to show after the writer's prompt before the ellipsis. */
const SUFFIX_PREVIEW_CHARS = 60;

function tookAsAsk(v: Verdict): boolean | undefined {
  if (v.decision === "action") return true;
  if (v.decision === "none") return false;
  return undefined;
}

/** The prompt as sent, with the suffix cut to a preview. */
function sentPreview(v: Verdict): string {
  const full = v.full_prompt ?? "";
  const head = v.prompt && full.startsWith(v.prompt) ? v.prompt.length : 0;
  const rest = full.slice(head);
  return rest.length <= SUFFIX_PREVIEW_CHARS ? full : `${full.slice(0, head)}${rest.slice(0, SUFFIX_PREVIEW_CHARS).trimEnd()}…`;
}

function Pill({ on, disabled, title, onClick, children }: { on?: boolean; disabled?: boolean; title?: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} disabled={disabled} title={title} className={`${styles.pill} ${on ? styles.pillOn : ""}`} onClick={onClick}>
      {children}
    </button>
  );
}

/** A textarea with save and cancel. Enter saves, Shift+Enter breaks a line. */
function Editor({ initial, rows = 3, extra, onSave, onCancel }: { initial: string; rows?: number; extra?: ReactNode; onSave: (text: string) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className={styles.editor}>
      <textarea
        className={styles.textarea}
        rows={rows}
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSave(text);
          } else if (e.key === "Escape") {
            onCancel();
          }
        }}
      />
      <div className={styles.pills}>
        {extra}
        <Pill onClick={() => onSave(text)}>save</Pill>
        <Pill onClick={onCancel}>cancel</Pill>
      </div>
    </div>
  );
}

function Row({ v, live, onLabel, onNote, onReplay }: { v: Verdict; live: boolean; onLabel: (truth: Truth | null) => void; onNote: (text: string) => void; onReplay: (prompt: string, duration: number) => void }) {
  const [showFull, setShowFull] = useState(false);
  const [editing, setEditing] = useState<"note" | "replay" | null>(null);
  const [duration, setDuration] = useState<number>(v.duration ?? 5);
  const took = tookAsAsk(v);
  const agreed = v.truth && took !== undefined ? (v.truth === "action") === took : null;
  const field = (key: string, value: ReactNode, className = "") => (
    <div className={styles.field}><span className={styles.key}>{key}</span><span className={`${styles.value} ${className}`}>{value}</span></div>
  );
  return (
    <li className={styles.row}>
      <div className={styles.head}>
        <span>{v.jev == null ? "jev —" : `jev ${v.jev.toFixed(2)}`}</span>
        <span className={styles[v.decision] ?? ""}>{v.decision}{v.state ? ` (${v.state})` : ""}</span>
        {v.duration != null ? <span>{v.duration} s</span> : null}
        {agreed != null ? <span className={agreed ? styles.agree : styles.disagree}>{agreed ? "truth ✓" : "truth ✗"}</span> : null}
        {v.replays ? <span>replayed ×{v.replays}</span> : null}
        <span>{v.time.slice(11, 19)}</span>
      </div>
      <div className={styles.text}>{v.text}</div>
      {v.event ? field("event", v.event) : null}
      {v.error ? field("error", v.error, styles.error) : null}
      {v.prompt ? field("prompt", v.prompt) : null}
      {v.full_prompt
        ? field(
            "full prompt",
            <>
              {showFull ? v.full_prompt : sentPreview(v)}
              <button type="button" className={styles.link} onClick={() => setShowFull((s) => !s)}>
                {showFull ? "less" : `show all (${v.full_prompt.length})`}
              </button>
            </>,
          )
        : null}
      {v.note && editing !== "note" ? field("note", v.note, styles.noteText) : null}

      {editing === "replay" ? (
        <Editor
          initial={v.prompt ?? ""}
          rows={5}
          extra={
            <select className={styles.select} value={duration} onChange={(e) => setDuration(Number(e.target.value))} aria-label="Duration">
              {DURATIONS.map((d) => <option key={d} value={d}>{d} s</option>)}
            </select>
          }
          onSave={(text) => {
            if (text.trim()) onReplay(text.trim(), duration);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      ) : null}
      {editing === "note" ? <Editor initial={v.note ?? ""} onSave={(text) => { onNote(text); setEditing(null); }} onCancel={() => setEditing(null)} /> : null}

      <div className={styles.pills}>
        {(["action", "none"] as const).map((truth) => (
          <Pill key={truth} on={v.truth === truth} onClick={() => onLabel(v.truth === truth ? null : truth)}>
            {truth === "action" ? "action" : "no action"}
          </Pill>
        ))}
        <span className={styles.spacer} />
        <Pill
          disabled={!live || v.replay === "pending"}
          title={live ? "Play this prompt again, as written or edited. Silent: no lead-in, no reaction." : "The call has ended"}
          onClick={() => setEditing(editing === "replay" ? null : "replay")}
        >
          replay
        </Pill>
        <Pill onClick={() => setEditing(editing === "note" ? null : "note")}>{v.note ? "edit note" : "note"}</Pill>
        {v.replay === "pending" ? <span className={styles.status}>sending…</span> : null}
        {v.replay === "busy" ? <span className={`${styles.status} ${styles.busy}`}>busy: a clip is in flight</span> : null}
      </div>
    </li>
  );
}

/**
 * Development only. A column beside the call listing what the agent made of each user
 * line, with the truth, a note, and a replay for each, and a note for the whole call.
 */
export function EvalsPanel({ room, character }: { room: EvalRoom | null; character?: string | null }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingSessionNote, setEditingSessionNote] = useState(false);
  const { verdicts, session, prompts, sessionNote, label, note, setSessionNote, replay, live } = useEvals(room, { character });
  if (collapsed) {
    return (
      <aside className={`${styles.panel} ${styles.collapsed}`} aria-label="Action evals">
        <button type="button" className={styles.pill} onClick={() => setCollapsed(false)} title="Open the evals panel">»</button>
      </aside>
    );
  }
  return (
    <aside className={styles.panel} aria-label="Action evals">
      <div className={styles.top}>
        <span className={styles.title}>evals · {verdicts.length}</span>
        <button type="button" className={styles.pill} onClick={() => setCollapsed(true)} title="Collapse">«</button>
      </div>
      <div className={styles.meta}>
        {session
          ? [
              session.session_id ? `session ${session.session_id}` : session.room ? `room ${session.room}` : null,
              session.model,
              session.overrides?.length ? `overrides: ${session.overrides.join(", ")}` : "no overrides",
            ].filter(Boolean).join(" · ")
          : live ? "waiting for the agent's session record…" : "no call"}
        {session ? (
          <div>
            {prompts
              ? `prompts logged · ${prompts.writer_model ?? "?"} · jev ≥ ${prompts.jev_threshold ?? "?"}${prompts.agent_commit ? ` · agent ${prompts.agent_commit}` : ""}${prompts.truncated?.length ? ` · cut: ${prompts.truncated.join(", ")}` : ""}`
              : "prompts: waiting…"}
            {character ? ` · character ${character}` : ""}
          </div>
        ) : null}
      </div>
      <div className={styles.sessionNote}>
        {editingSessionNote ? (
          <Editor initial={sessionNote} onSave={(text) => { setSessionNote(text); setEditingSessionNote(false); }} onCancel={() => setEditingSessionNote(false)} />
        ) : (
          <div className={styles.field}>
            <span className={styles.key}>call</span>
            <span className={`${styles.value} ${styles.noteText}`}>
              {sessionNote || <span className={styles.status}>no note</span>}
              <button type="button" className={styles.link} onClick={() => setEditingSessionNote(true)}>{sessionNote ? "edit" : "add note"}</button>
            </span>
          </div>
        )}
      </div>
      {verdicts.length === 0 ? (
        <p className={styles.empty}>{live ? "Waiting for the first user line." : "Start a Roleplay call. The agent needs ACTION_EVALS=1."}</p>
      ) : (
        <ol className={styles.list}>
          {verdicts.map((v) => (
            <Row key={v.turn} v={v} live={live} onLabel={(t) => label(v.turn, t)} onNote={(t) => note(v.turn, t)} onReplay={(p, d) => replay(v.turn, p, d, v.event)} />
          ))}
        </ol>
      )}
    </aside>
  );
}

/** The panel beside the call. Wrap `<LemonSliceCall>` in it; the call shrinks to the remaining width. */
export function EvalsLayout({ room, character, children }: { room: EvalRoom | null; character?: string | null; children: ReactNode }) {
  return (
    <div className={styles.layout}>
      <EvalsPanel room={room} character={character} />
      <div className={styles.call}>{children}</div>
    </div>
  );
}
