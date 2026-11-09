import type { AvatarConfig } from "@lemonslice/hosted-call/server";

// Copied to characters.local.ts on `pnpm dev` if that file is missing. That file and any
// *.local.ts beside it are gitignored. List characters you do not want committed here,
// keyed by the id used in ?character=<id>.
//
//   import { mia } from "./mia.local";
//   export const localCharacters: Record<string, Partial<AvatarConfig>> = { mia };

export const localCharacters: Record<string, Partial<AvatarConfig>> = {};
