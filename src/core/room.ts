// Avoid editing

export type RoomConnection = {
  /** LiveKit token. */
  token: string;
  /** LiveKit server URL. */
  serverUrl: string;
  /** LemonSlice session ID. */
  sessionId: string | null;
};

export type RoomRequest = {
  /** Route on customer's backend that wraps `createRoomHandler`. */
  startCallUrl: string;
};

/**
 * Send an API request to customer's backend for user auth,
 * DB queries, and sending the LemonSlice request
 */
export async function createRoom(
  { startCallUrl }: RoomRequest,
  signal?: AbortSignal,
): Promise<RoomConnection> {
  const response = await fetch(startCallUrl, { method: "POST", signal });

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
