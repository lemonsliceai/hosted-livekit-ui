import { createRoomHandler } from "@lemonslice/hosted-call/server";
import { AGENT_IMAGE_URL, VOICE_ID } from "../../../../agent";

// Demo stand-in for your backend.
//
// The prompt, voice and avatar are hardcoded here.
const PROMPT =
  "You are a friendly product guide for an online store. Keep answers to one or two " +
  "short spoken sentences, and ask a follow-up question when it helps.";
// Use `authorize` to check your own user session before letting a visitor start a call.
export const POST = createRoomHandler({
  apiKey: process.env.LEMONSLICE_API_KEY ?? "",
  lemonSliceUrl: process.env.LEMONSLICE_API_URL ?? "https://lemonslice.com/api/liveai/rooms",
  room: { prompt: PROMPT, voiceId: VOICE_ID, agentImageUrl: AGENT_IMAGE_URL },
  webhookUrl: process.env.WEBHOOK_URL,
  livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,

  // Per-visitor config instead of constants:
  //
  // room: async (request) => {
  //   const user = await getUser(request);
  //   return { prompt: promptFor(user), voiceId: user.voiceId, agentImageUrl: user.imageUrl };
  // },
});
