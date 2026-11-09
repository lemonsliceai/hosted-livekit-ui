import { createRoomHandler, type AvatarConfig } from "@lemonslice/hosted-call/server";
import { AGENT_IMAGE_URL, VOICE_ID } from "../../../../agent";
import { characterIds, getCharacter, withCharacter } from "../../../../characters";

// Demo stand-in for your backend.
//
// The prompt, voice and avatar below are the defaults. A character file
// (see ../../../../characters) replaces whichever of them it fills in.
const PROMPT =
  "You are a friendly product guide for an online store. Keep answers to one or two " +
  "short spoken sentences, and ask a follow-up question when it helps.";
const BASE: AvatarConfig = { prompt: PROMPT, voiceId: VOICE_ID, agentImageUrl: AGENT_IMAGE_URL };

/** Character id from the page's `?character=` (sent via startCallBody), else the env default, else none. */
async function requestedCharacterId(request: Request): Promise<string | null> {
  const body = (await request.clone().json().catch(() => ({}))) as { character?: unknown };
  const fromBody = typeof body.character === "string" ? body.character.trim() : "";
  return fromBody || process.env.LEMONSLICE_CHARACTER?.trim() || null;
}

// Use `authorize` to check your own user session before letting a visitor start a call.
const handler = createRoomHandler({
  apiKey: process.env.LEMONSLICE_API_KEY ?? "",
  lemonSliceUrl: process.env.LEMONSLICE_API_URL ?? "https://lemonslice.com/api/liveai/rooms",
  room: async (request) => {
    const id = await requestedCharacterId(request);
    const character = id ? getCharacter(id) : undefined;
    return character ? withCharacter(BASE, character) : BASE;
  },
  webhookUrl: process.env.WEBHOOK_URL,
  livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,
});

// Rejects unknown character ids with a readable error, then logs which character each
// session ran. The agent never echoes its config, so that log line is the only record.
export async function POST(request: Request) {
  const id = await requestedCharacterId(request);
  if (id && !getCharacter(id)) {
    return Response.json(
      { error: `Unknown character "${id}". Known: ${characterIds().join(", ") || "(none)"}` },
      { status: 400 },
    );
  }
  const response = await handler(request);
  if (response.ok) {
    const { session_id } = (await response.clone().json().catch(() => ({}))) as { session_id?: unknown };
    console.log(`[lemonslice] session=${String(session_id ?? "?")} character=${id ?? "none"}`);
  }
  return response;
}
