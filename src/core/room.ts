// Avoid editing

import { supportsVP9 } from "livekit-client";

export type RoomConnection = {
  /** LiveKit token. */
  token: string;
  /** LiveKit server URL. */
  serverUrl: string;
  /** LemonSlice session ID. */
  sessionId: string | null;
};

export type StartCallOptions = {
  /** Fish Audio voice ID selected by the visitor. Omit it to use the suggested voice. */
  voiceId?: string;
  /** LemonSlice avatar model for this call. */
  model?: "cwm-1-lite" | "cwm-1" | "roleplay";
  /**
   * Extra fields merged into the start-call POST body for your own route to read,
   * such as a character id. Never put prompt text here; resolve ids server-side.
   * The built-in fields win on a name clash.
   */
  startCallBody?: Record<string, unknown>;
};

export type RoomRequest = {
  /** Route on customer's backend that wraps `createRoomHandler`. */
  startCallUrl: string;
};

/**
 * Send an API request to customer's backend for user auth,
 * DB queries, and sending the LemonSlice request.
 */
export async function createRoom(
  { startCallUrl, voiceId, model, startCallBody }: RoomRequest & StartCallOptions,
  signal?: AbortSignal,
): Promise<RoomConnection> {
  const response = await fetch(startCallUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...startCallBody,
      supports_vp9: supportsVP9(),
      ...(voiceId ? { voice_id: voiceId } : {}),
      ...(model ? { model } : {}),
    }),
    signal,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Room request failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  const data = (await response.json()) as {
    token?: string;
    room_url?: string;
    session_id?: string;
  };
  if (!data.token || !data.room_url) {
    throw new Error("Room response is missing token or room_url");
  }
  return { token: data.token, serverUrl: data.room_url, sessionId: data.session_id ?? null };
}
