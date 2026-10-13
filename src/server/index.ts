// Avoid editing

export type AvatarConfig = {
  /** System instructions for the avatar. Max 40000 characters. */
  prompt: string;
  /** Fish Audio voice ID. */
  voiceId: string;
  /** Public image URL. */
  agentImageUrl: string;
  /** Overrides the handler's `webhookUrl` for this visitor. */
  webhookUrl?: string;
};

export type CreateRoomHandlerOptions = {
  /** Your LemonSlice API key. */
  apiKey: string;
  /** LemonSlice rooms endpoint. */
  lemonSliceUrl: string;
  /**
   * Optional URL on your server that LemonSlice POSTs session events to
   */
  webhookUrl?: string;
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
  webhookUrl,
  room,
  authorize,
}: CreateRoomHandlerOptions) {
  return async function handleCreateRoom(request: Request): Promise<Response> {
    const browser = (await request
      .clone()
      .json()
      .catch(() => ({}))) as { supports_vp9?: unknown };
    const supportsVp9 = browser?.supports_vp9 === true;

    if (authorize) {
      const rejection = await authorize(request);
      if (rejection) return rejection;
    }

    if (!apiKey) {
      return Response.json({ error: "LEMONSLICE_API_KEY is not set" }, { status: 500 });
    }

    const config = typeof room === "function" ? await room(request) : room;
    const { prompt, voiceId, agentImageUrl } = config;
    const sessionWebhookUrl = config.webhookUrl ?? webhookUrl;

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
          supports_vp9: supportsVp9,
          ...(sessionWebhookUrl ? { webhook_url: sessionWebhookUrl } : {}),
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
