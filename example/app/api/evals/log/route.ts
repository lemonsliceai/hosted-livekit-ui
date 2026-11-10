import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

// Development only. Appends one JSON line per record to logs/<session>.jsonl, where
// `session` is the page's key for the call: <start stamp>-<LemonSlice session id>.
// Records keep the shape companion-demo's harness_report.py reads. logs/ is gitignored.
const LOG_DIR = path.join(process.cwd(), "logs");

export async function POST(request: Request) {
  let record: unknown;
  try {
    record = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (record == null || typeof record !== "object" || Array.isArray(record)) {
    return Response.json({ error: "Record must be an object" }, { status: 400 });
  }
  const { session, ...rest } = record as { session?: unknown } & Record<string, unknown>;
  // The page only knows a character from the URL; the env default lives here.
  if (rest.kind === "page" && rest.character == null) {
    rest.character = process.env.LEMONSLICE_CHARACTER?.trim() || null;
    if (rest.character) rest.character_source = "env";
  }
  const key = (typeof session === "string" ? session : "unknown").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 120) || "unknown";
  await mkdir(LOG_DIR, { recursive: true });
  await appendFile(path.join(LOG_DIR, `${key}.jsonl`), `${JSON.stringify(rest)}\n`, "utf8");
  return Response.json({ ok: true });
}
