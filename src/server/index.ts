// Avoid editing

/**
 * Early-access prompt overrides. Only read for models LemonSlice has enabled on
 * your account; ask us for the guide before setting these. Each field is optional
 * and capped at 40,000 characters. Omit one to keep its default.
 */
export type AgentOverrides = {
  jevPrompt?: string;
  directorPrompt?: string;
  directorSuffix?: string;
};

export type AvatarConfig = {
  /** System instructions for the avatar. Max 40000 characters. */
  prompt: string;
  /** Fish Audio voice ID. */
  voiceId: string;
  /** Public image URL. */
  agentImageUrl: string;
  /** Overrides the handler's `webhookUrl` for this visitor. */
  webhookUrl?: string;
  /** Early access only. See `AgentOverrides`. */
  agentOverrides?: AgentOverrides;
};

const MAX_OVERRIDE_LENGTH = 40000;

const OVERRIDE_FIELDS = [
  ["jevPrompt", "jev_prompt"],
  ["directorPrompt", "director_prompt"],
  ["directorSuffix", "director_suffix"],
] as const;

function agentOverridesBody(
  overrides: AgentOverrides | undefined,
): { agent_overrides: Record<string, string> } | { error: string } | undefined {
  if (!overrides) return undefined;
  const body: Record<string, string> = {};
  for (const [field, wire] of OVERRIDE_FIELDS) {
    const value = overrides[field];
    if (value == null) continue;
    if (typeof value !== "string") return { error: `agentOverrides.${field} must be a string` };
    if (value.length > MAX_OVERRIDE_LENGTH) {
      return { error: `agentOverrides.${field} must be at most ${MAX_OVERRIDE_LENGTH} characters` };
    }
    if (value.trim()) body[wire] = value;
  }
  return Object.keys(body).length > 0 ? { agent_overrides: body } : undefined;
}

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
  /**
   * LiveKit agent name sent as `livekit_agent_name_override`.
   * Set from `LEMONSLICE_LIVEKIT_AGENT_NAME`. Omitted when empty.
   */
  livekitAgentNameOverride?: string;
};

/**
 * Builds a Next.js App Router route handler that creates a LemonSlice room.
 *
 * ```ts
 * // app/api/lemonslice/start-call/route.ts
 * export const POST = createRoomHandler({
 *   apiKey: process.env.LEMONSLICE_API_KEY!,
 *   lemonSliceUrl: process.env.LEMONSLICE_API_URL!,
 *   livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,
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
  livekitAgentNameOverride,
}: CreateRoomHandlerOptions) {
  return async function handleCreateRoom(request: Request): Promise<Response> {
    const browser = (await request
      .clone()
      .json()
      .catch(() => ({}))) as {
      supports_vp9?: unknown;
      voice_id?: unknown;
      model?: unknown;
    };
    const supportsVp9 = browser?.supports_vp9 === true;
    const requestedVoiceId =
      typeof browser?.voice_id === "string" && browser.voice_id.trim()
        ? browser.voice_id.trim()
        : null;
    const requestedModel =
      typeof browser?.model === "string" && browser.model.trim() ? browser.model.trim() : null;

    if (authorize) {
      const rejection = await authorize(request);
      if (rejection) return rejection;
    }

    if (!apiKey) {
      return Response.json({ error: "LEMONSLICE_API_KEY is not set" }, { status: 500 });
    }

    const config = typeof room === "function" ? await room(request) : room;
    const { prompt, voiceId: suggestedVoiceId, agentImageUrl } = config;
    const voiceId = requestedVoiceId ?? suggestedVoiceId;
    const sessionWebhookUrl = config.webhookUrl ?? webhookUrl;
    const agentNameOverride = livekitAgentNameOverride?.trim();
    const overrides = agentOverridesBody(config.agentOverrides);
    if (overrides && "error" in overrides) {
      return Response.json({ error: overrides.error }, { status: 400 });
    }

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
          ...(requestedModel ? { model: requestedModel } : {}),
          ...(sessionWebhookUrl ? { webhook_url: sessionWebhookUrl } : {}),
          ...(agentNameOverride ? { livekit_agent_name_override: agentNameOverride } : {}),
          ...(overrides ? { agent_overrides: overrides.agent_overrides } : {}),
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
