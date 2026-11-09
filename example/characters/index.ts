import type { AvatarConfig } from "@lemonslice/hosted-call/server";
import { localCharacters } from "./characters.local";

/**
 * A character is a partial session config: whatever it sets replaces the route's
 * defaults, blank or missing fields keep them. Prompt overrides only apply on
 * Roleplay calls, and a blank override keeps the backend's default.
 */
export type Character = Partial<AvatarConfig>;

/** Tracked characters here, local ones from characters.local.ts (gitignored). */
export const CHARACTERS: Record<string, Character> = {
  ...localCharacters,
};

export function characterIds(): string[] {
  return Object.keys(CHARACTERS);
}

export function getCharacter(id: string): Character | undefined {
  return Object.prototype.hasOwnProperty.call(CHARACTERS, id) ? CHARACTERS[id] : undefined;
}

function filled(value: string | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** The session config: the character's filled-in fields over the base defaults. */
export function withCharacter(base: AvatarConfig, character: Character): AvatarConfig {
  const overrides = { ...base.agentOverrides };
  for (const key of ["jevPrompt", "directorPrompt", "directorSuffix"] as const) {
    const value = character.agentOverrides?.[key];
    if (filled(value)) overrides[key] = value;
  }
  const webhookUrl = filled(character.webhookUrl) ? character.webhookUrl : base.webhookUrl;
  return {
    prompt: filled(character.prompt) ? character.prompt : base.prompt,
    voiceId: filled(character.voiceId) ? character.voiceId : base.voiceId,
    agentImageUrl: filled(character.agentImageUrl) ? character.agentImageUrl : base.agentImageUrl,
    ...(webhookUrl ? { webhookUrl } : {}),
    ...(Object.keys(overrides).length ? { agentOverrides: overrides } : {}),
  };
}
