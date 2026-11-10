/** Records from the agent on `agent/evals` (ACTION_EVALS=1), and the page's own marks. */
export type Decision = "action" | "none" | "busy" | "error";
export type Truth = "action" | "none";

export type Verdict = {
  turn: string;
  time: string;
  room?: string;
  session_id?: string;
  text: string;
  decision: Decision;
  /** P(asking for an action). Absent when the line was not scored. */
  jev?: number;
  /** The writer's prompt. */
  prompt?: string;
  /** The prompt as the pipeline received it: suffix appended, capped. */
  full_prompt?: string;
  duration?: number;
  event?: string;
  error?: string;
  /** Director state for a busy line. */
  state?: string;
  /** What Jev was shown. Logged, not displayed. */
  jev_state?: string;
  /** The clip is rendered with sound. The writer decides. */
  audio?: boolean;
  /**
   * Seconds per phase. `jev`, `director`: model calls, request to response. From the avatar's
   * status events: `ttff` (video prompt sent to rendered), `to_first_frame` (user's line to the clip
   * rendered, the headline), `reply_to_play` (her lead-in said to playing).
   */
  timings?: Record<string, number>;
  /** The clip's last reported status: generating, ready, started, failed, done. */
  status?: string;
  /** Page-side marks, also logged. */
  truth?: Truth;
  note?: string;
  replays?: number;
  /** The last replay request: waiting for the agent, sent, or refused because a clip was in flight. */
  replay?: "pending" | "sent" | "busy";
};

/** The agent's one-off description of the session, for provenance at the top of each log. */
export type Session = {
  time: string;
  room?: string;
  session_id?: string;
  model?: string;
  character_head?: string;
  overrides?: string[];
};

/** The texts the director runs with, for replicating a log. Long ones are cut; the hash is of the full text. */
export type Prompts = {
  time: string;
  jev_question?: string;
  director_prompt?: string;
  director_suffix?: string;
  character?: string;
  writer_model?: string;
  jev_model?: string;
  jev_threshold?: number;
  agent_commit?: string | null;
  sha256?: Record<string, string>;
  truncated?: string[];
};

/**
 * The slice of a LiveKit Room this folder uses, so it needs no LiveKit import.
 * `LemonSliceCall`'s `onRoom` hands out the real room, which satisfies this.
 */
export type DataListener = (payload: Uint8Array, participant?: unknown, kind?: unknown, topic?: string) => void;
export type EvalRoom = {
  name: string;
  on(event: "dataReceived", listener: DataListener): unknown;
  off(event: "dataReceived", listener: DataListener): unknown;
  localParticipant: {
    publishData(data: Uint8Array, options?: { reliable?: boolean; topic?: string }): Promise<unknown>;
  };
};
