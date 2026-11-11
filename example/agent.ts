import type { AgentOverrides } from "@lemonslice/hosted-call/server";

// Update this file to customize the session (including agent image, dialogue prompt, etc)

// Public PNG/JPG of the character, used as the reference image for the video.
export const AGENT_IMAGE_URL =
  "https://6ammc3n5zzf5ljnz.public.blob.vercel-storage.com/public/hero_agents/leila/base2.png";

// Fish Audio voice id.
export const VOICE_ID = "0984f8581bbb4e5e980a990abb865874";

// System instructions for the avatar. On Roleplay calls the director reads the character's
// name, pronouns, scene, and look from the first 800 characters, so state them up front.
// A meta_prompt is added to the DIALOGUE_PROMPT to guide on style + length.
export const DIALOGUE_PROMPT =
  "You are a friendly product guide for an online store. Keep answers to one or two " +
  "short spoken sentences, and ask a follow-up question when it helps.";

// Roleplay only. Empty keeps the backend's default. Each is capped at 40,000 characters.
export const AGENT_OVERRIDES: AgentOverrides = {
  // Yes/no question scored against each user line; at or above the threshold it is an action request.
  jevPrompt: "",
  // Director system prompt. Used to describe the action.
  directorPrompt: "",
  // Appended to every video prompt. The combined prompt is cut at 1,000 characters.
  directorSuffix: "",
};
