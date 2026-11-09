// Creates characters/characters.local.ts from the tracked example if it is missing, so
// the static import in characters/index.ts always resolves. Runs before dev and build.
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "characters");
const target = join(dir, "characters.local.ts");
if (!existsSync(target)) {
  copyFileSync(join(dir, "characters.local.example.ts"), target);
  console.log("[characters] created characters/characters.local.ts from the example");
}
