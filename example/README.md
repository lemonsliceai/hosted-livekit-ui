# Example app

A tiny Next.js app that runs `<LemonSliceCall>` so you can see it working. It is the
quickest way to test the component and any changes you make to it.

## Run it

From the repo root:

```bash
pnpm i                      # installs and builds the package if changes were made
cd example
pnpm i                      # installs the example
cp .env.example .env.local  # paste your LEMONSLICE_API_KEY
pnpm dev
```

Open <http://localhost:3001> and click **Video call**. The call connects as soon as it opens, and hanging up returns you here.

> Run `pnpm i` in the repo root first. This app depends on the package via `file:..`, so
> the package has to be built before the app can use it.

## After changing the component

```bash
cd .. && pnpm build
cd example && rm -rf .next && pnpm dev
```

## Characters

A character is one file: a session config with the prompt, voice, reference image, and
the Roleplay prompt overrides (`jevPrompt`, `directorPrompt`, `directorSuffix`). The
route replaces its defaults with whatever the file fills in; blank fields keep them.

- `characters/template.ts` is a blank one with every field explained. Copy it to
  `characters/<name>.local.ts` and list it in `characters/characters.local.ts`.
- `characters.local.ts` and any `*.local.ts` beside it are gitignored. `pnpm dev`
  creates `characters.local.ts` from `characters.local.example.ts` if it is missing.
- A file with every field filled in is a complete `AvatarConfig`, so it can be shared
  and passed straight to `createRoomHandler({ room: ... })` in any app using the package.

Pick one with `?character=<name>` on the page, e.g. <http://localhost:3001/?character=elise>.
Without the query, `LEMONSLICE_CHARACTER` in `.env.local` applies; unset, the route's
defaults run. Unknown ids get a 400 listing the known ones.

The pre-call screen still shows the portrait and voice from `agent.ts`; the character
takes effect once the call connects. The route logs `[lemonslice] session=<id> character=<name>`
on every call, which is the only record of which config a session ran.

## Evals (development only)

Set `NEXT_PUBLIC_EVALS=1` in `.env.local` (or open <http://localhost:3001/?evals=1> for one
visit; `?evals=0` hides it). The call then shares the page with a panel on the left that
lists what the agent made of each user line: the Jev score, the decision, the prompt, and
the prompt as sent to the pipeline. The agent must run with `ACTION_EVALS=1`
(see `hosted-livekit-agent`), or nothing arrives.

Per line: mark it **action** or **no action**, add a **note**, or **replay** the prompt,
edited or not, with a duration; the agent plays it silently and reports what it actually
sent. A note on the whole call sits at the top. The header shows the agent's session
record: session id, model, and which prompt overrides were set.

Each call gets its own log, `logs/<start stamp>-<session id>.jsonl`, written by
`app/api/evals/log`. It opens with what you need to replicate the call: a `page` record
(the character asked for), the agent's `session` record, and its `prompts` record with the
Jev question, director prompt, suffix, and character prompt the director ran with, the
model names, threshold, and agent commit (texts over 12,000 characters are cut and
flagged; a SHA-256 of each full text is included). Then every verdict, and every label,
note, and replay, in the record shape companion-demo's `harness_report.py` reads. `logs/` is
gitignored. The code is under `evals/`; the page only passes `onRoom` and wraps the call
in `EvalsLayout`, both behind the flag.
