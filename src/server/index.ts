// Avoid editing

import { httpsImageUrl } from "./https-image-url";

/**
 * Early-access prompt overrides. Only read for models LemonSlice has enabled on
 * your account; ask us for the guide before setting these. Each field is optional
 * and capped at 40,000 characters. Omit one to keep its default.
 */
export type AgentOverrides = {
  actionDetectorPrompt?: string;
  directorPrompt?: string;
  actionDescriptionSuffix?: string;
  lora?: string;
  loraScale?: number;
};

export type AvatarConfig = {
  /** System instructions for the avatar. Max 40000 characters. */
  prompt: string;
  /** Fish Audio voice ID. Omit to have LemonSlice pick one that fits the image. */
  voiceId?: string;
  /** Public image URL. */
  agentImageUrl: string;
  /** Overrides the handler's `webhookUrl` for this visitor. */
  webhookUrl?: string;
  /** Early access only. See `AgentOverrides`. */
  agentOverrides?: AgentOverrides;
};

const MAX_OVERRIDE_LENGTH = 40000;

const OVERRIDE_FIELDS = [
  ["actionDetectorPrompt", "action_detector_prompt"],
  ["directorPrompt", "director_prompt"],
  ["actionDescriptionSuffix", "action_description_suffix"],
  ["lora", "lora"],
] as const;

function agentOverridesBody(
  overrides: AgentOverrides | undefined,
): { agent_overrides: Record<string, string | number> } | { error: string } | undefined {
  if (!overrides) return undefined;
  const body: Record<string, string | number> = {};
  for (const [field, wire] of OVERRIDE_FIELDS) {
    const value = overrides[field];
    if (value == null) continue;
    if (typeof value !== "string") return { error: `agentOverrides.${field} must be a string` };
    if (value.length > MAX_OVERRIDE_LENGTH) {
      return { error: `agentOverrides.${field} must be at most ${MAX_OVERRIDE_LENGTH} characters` };
    }
    if (value.trim()) body[wire] = value;
  }
  if (overrides.loraScale != null) body.lora_scale = overrides.loraScale;
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
  /** Defaults to `/hosted-voice-match` next to `/rooms` in `lemonSliceUrl`. */
  voiceMatchUrl?: string;
};

/**
 * Builds a Next.js App Router route handler. POST creates a LemonSlice room; GET returns the
 * voice the call will use, for the call setup.
 *
 * ```ts
 * // app/api/lemonslice/start-call/route.ts
 * const handler = createRoomHandler({
 *   apiKey: process.env.LEMONSLICE_API_KEY!,
 *   lemonSliceUrl: process.env.LEMONSLICE_API_URL!,
 *   livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,
 *   room: { prompt: "...", voiceId: "...", agentImageUrl: "https://..." },
 * });
 * export { handler as GET, handler as POST };
 * ```
 */
export function createRoomHandler({
  apiKey,
  lemonSliceUrl,
  webhookUrl,
  room,
  authorize,
  livekitAgentNameOverride,
  voiceMatchUrl,
}: CreateRoomHandlerOptions) {
  const matchUrl = voiceMatchUrl || lemonSliceUrl.replace(/\/rooms\/?$/, "/hosted-voice-match");
  return async function handleCreateRoom(request: Request): Promise<Response> {
    const browser = (await request
      .clone()
      .json()
      .catch(() => ({}))) as {
      supports_vp9?: unknown;
      voice_id?: unknown;
      model?: unknown;
      agent_image_url?: unknown;
    };
    const supportsVp9 = browser?.supports_vp9 === true;
    const requestedVoiceId =
      typeof browser?.voice_id === "string" && browser.voice_id.trim()
        ? browser.voice_id.trim()
        : null;
    const requestedModel =
      typeof browser?.model === "string" && browser.model.trim() ? browser.model.trim() : null;
    const requestedImageUrl = httpsImageUrl(browser?.agent_image_url);

    if (authorize) {
      const rejection = await authorize(request);
      if (rejection) return rejection;
    }

    if (!apiKey) {
      return Response.json({ error: "LEMONSLICE_API_KEY is not set" }, { status: 500 });
    }

    const config = typeof room === "function" ? await room(request) : room;
    const { prompt, agentImageUrl } = config;
    const configuredVoiceId =
      typeof config.voiceId === "string" && config.voiceId.trim() ? config.voiceId.trim() : null;

    if (request.method === "GET") {
      if (configuredVoiceId) return Response.json({ voice_id: configuredVoiceId });
      const imageUrl =
        httpsImageUrl(new URL(request.url).searchParams.get("image_url")) ?? httpsImageUrl(agentImageUrl);
      return Response.json({ voice_id: imageUrl ? await matchedVoice(apiKey, matchUrl, imageUrl) : null });
    }

    const voiceId = requestedVoiceId ?? configuredVoiceId ?? undefined;
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
          agent_image_url: requestedImageUrl ?? agentImageUrl,
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

async function matchedVoice(apiKey: string, url: string, imageUrl: string): Promise<string | null> {
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({ image_url: imageUrl }),
      signal: AbortSignal.timeout(60_000),
    });
    const payload = (await upstream.json().catch(() => null)) as { voice_id?: unknown } | null;
    return upstream.ok && typeof payload?.voice_id === "string" && payload.voice_id ? payload.voice_id : null;
  } catch (error) {
    console.error("[lemonslice] voice match unreachable:", error);
    return null;
  }
}

export { createAvatarVariantHandler, type CreateAvatarVariantHandlerOptions } from "./avatar-variant";
