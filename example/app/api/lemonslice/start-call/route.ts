import { createRoomHandler } from "@lemonslice/hosted-call/server";
import { AGENT_IMAGE_URL, AGENT_OVERRIDES, DIALOGUE_PROMPT, VOICE_ID } from "../../../../agent";

// Demo stand-in for your backend.
//
// The session config is the constants in ../../../../agent.ts.
// Use `authorize` to check your own user session before letting a visitor start a call.
export const POST = createRoomHandler({
  apiKey: process.env.LEMONSLICE_API_KEY ?? "",
  lemonSliceUrl: process.env.LEMONSLICE_API_URL ?? "https://lemonslice.com/api/liveai/rooms",
  room: { prompt: DIALOGUE_PROMPT, voiceId: VOICE_ID, agentImageUrl: AGENT_IMAGE_URL, agentOverrides: AGENT_OVERRIDES },
  webhookUrl: process.env.WEBHOOK_URL,
  livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,

  // Per-visitor config instead of constants:
  //
  // room: async (request) => {
  //   const user = await getUser(request);
  //   return { prompt: promptFor(user), voiceId: user.voiceId, agentImageUrl: user.imageUrl };
  // },
});
