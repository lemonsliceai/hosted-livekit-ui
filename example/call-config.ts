import type { AgentOverrides } from "@lemonslice/hosted-call/server";

// Update this file to customize the session (including agent image, dialogue prompt, etc)

// Public PNG/JPG of the character, used as the reference image for the video.
export const AGENT_IMAGE_URL =
  "https://6ammc3n5zzf5ljnz.public.blob.vercel-storage.com/inf2-image-uploads/image-GWtrBABzAKQUQW1END8bNe8ohJwkvQ.png";

// Fish Audio voice id.
export const VOICE_ID = "0984f8581bbb4e5e980a990abb865874";

// Character description for the avatar.
// On Roleplay calls, the director infers the character's name, pronouns, scene, and look
// from the first 800 characters, so state them up front.
// A meta_prompt is added to the CHARACTER_PROMPT to turn it into a Facetime conversation
// (style, length, etc).
export const CHARACTER_PROMPT =
  "You are June, a small-town baker who moved to the city after calling off your wedding. " +
  "You’re warm, quietly stubborn. Remember little details, tell embarrassing stories about " +
  "yourself, and occasionally surprise the user with blunt advice.";

// Roleplay only. Customize backend prompts. Empty keeps the backend's defaults.
// See call-config-examples.ts for examples.
// Each is capped at 40,000 characters.
export const AGENT_OVERRIDES: AgentOverrides = {
  // Used to detect if a user is requesting an action. Yes/no question scored against each
  // user line.
  actionDetectorPrompt: "",
  // Director system prompt. This is the system-prompt for the LLM that describes the action based on the user's input.
  // The description it generates is cut at 800 characters.
  directorPrompt: "",
  // Appended to every action description. Used to provide consistent guidance across all actions.
  // Cut at 800 characters. Description + suffix is cut at 1,600.
  actionDescriptionSuffix: "",
};

// Roleplay only. Suggestions for actions. Empty shows none.
// { label, turns?, image?, prompt? }: `turns` hides the pill after that many visitor
// messages (omit to keep it for the call). `image` makes it a scene change: the action ends
// on that public https image, which stays as her reference. `prompt` replaces the default
// scene clip prompt (scene pills only). A pill tapped while another action is in flight is
// answered but not performed.
export const SUGGESTIONS = [
  { label: "Hug your pet cat.", turns: 5 },
  { label: "Give me a rose.", turns: 5 },
  { label: "Show me a dance move.", turns: 5 },
];
