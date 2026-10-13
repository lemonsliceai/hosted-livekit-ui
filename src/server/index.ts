// Avoid editing

export type AvatarConfig = {
  /** System instructions for the avatar. Max 40000 characters. */
  prompt: string;
  /** Fish Audio voice ID. */
  voiceId: string;
  /** Public `https://` image URL. */
  agentImageUrl: string;
};

export type CreateRoomHandlerOptions = {
  /** Your LemonSlice API key. */
  apiKey: string;
  /** LemonSlice rooms endpoint. */
  lemonSliceUrl: string;
  /**
   * Avatar config, or a function of the request if it varies per visitor.
   */
  room: AvatarConfig | ((request: Request) => AvatarConfig | Promise<AvatarConfig>);
  /**
   * Optional auth gate run before the room is created.
   */
  authorize?: (request: Request) => Promise<Response | void> | Response | void;
};

/**
 * Builds a Next.js App Router route handler that creates a LemonSlice room.
 *
 * ```ts
 * // app/api/lemonslice/start-call/route.ts
 * export const POST = createRoomHandler({
 *   apiKey: process.env.LEMONSLICE_API_KEY!,
 *   lemonSliceUrl: process.env.LEMONSLICE_API_URL!,
 *   room: { prompt: "...", voiceId: "...", agentImageUrl: "https://..." },
 * });
 * ```
 */
export function createRoomHandler({
  apiKey,
  lemonSliceUrl,
  room,
  authorize,
}: CreateRoomHandlerOptions) {
  return async function handleCreateRoom(request: Request): Promise<Response> {
    if (authorize) {
      const rejection = await authorize(request);
      if (rejection) return rejection;
    }

    if (!apiKey) {
      return Response.json({ error: "LEMONSLICE_API_KEY is not set" }, { status: 500 });
    }

    const { prompt, voiceId, agentImageUrl } =
      typeof room === "function" ? await room(request) : room;

    let upstream: Response;
    try {
      upstream = await fetch(lemonSliceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify({
          transport_type: "livekit",
          prompt,
          voice_id: voiceId,
          agent_image_url: agentImageUrl,
        }),
      });
    } catch (error) {
      console.error("[lemonslice] LemonSlice API unreachable:", error);
      return Response.json({ error: "LemonSlice API unreachable" }, { status: 502 });
    }

    const payload = await upstream.json().catch(() => ({ error: "Invalid upstream response" }));
    if (!upstream.ok) {
      return Response.json(payload, { status: upstream.status });
    }

    const { room_url, token, session_id } = payload as Record<string, unknown>;
    return Response.json({ room_url, token, session_id }, { status: upstream.status });
  };
}
