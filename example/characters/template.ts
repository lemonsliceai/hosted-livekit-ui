import type { AvatarConfig } from "@lemonslice/hosted-call/server";

/**
 * One file = one character = one session config. Copy it to `<name>.local.ts`, fill in
 * what you want, list it in characters.local.ts, and open the page with ?character=<name>.
 *
 * Blank or missing fields keep the route's defaults (prompt, voice, image) or the
 * backend's defaults (the three prompt overrides). With every field filled in, the
 * object is a complete `AvatarConfig` and can be passed straight to
 * `createRoomHandler({ room: template })` in any app that uses this package.
 */
export const template: Partial<AvatarConfig> = {
  // System instructions for the avatar. The director reads the character's name,
  // pronouns, scene, and look from the first 800 characters, so state them up front.
  prompt: "",
  // Fish Audio voice id. Blank: the route's default voice.
  voiceId: "",
  // Public PNG/JPG of the character, used as the reference image for the video.
  agentImageUrl: "",
  // Roleplay only. Each is optional and capped at 40,000 characters.
  agentOverrides: {
    // Yes/no question scored against each user line; 0.6 or above is an action request.
    jevPrompt: "",
    // Director system prompt. `{character}` and `{max_chars}` are filled in by the server.
    // Put worked examples directly in the text. The writer's tool call has an optional
    // `audio` boolean; tell it when to set it (sound core to the action), else clips are silent.
    directorPrompt: "",
    // Appended to every video prompt. Keep it under about 400 characters.
    directorSuffix: "",
  },
};
