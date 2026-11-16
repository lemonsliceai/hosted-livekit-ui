# @lemonslice/hosted-call

A React component that puts a talking LemonSlice avatar on your site.

This repo exposes both the Roleplay and FaceTime experiences.

```
<LemonSliceCall>  ──▶  your /start-call route  ──▶  LemonSlice
```

**You need:** a LemonSlice API key and React 18+.

---

## 1. See it in action (spin up the example)

```bash
git clone git@github.com:lemonsliceai/hosted-call-{customer}.git lemonslice
cd lemonslice

pnpm i                      # build the package
cd example && pnpm i        # Build the example
cp .env.example .env.local  # paste your LEMONSLICE_API_KEY
pnpm dev
```

Open <http://localhost:3001> and play with your UI.

`example/` is a demo app. It stays in this repo but is never installed into your app.

To customize the roleplay experience, update the default prompts in `example/call-config.ts`. These are used to trigger and describe actions. Look at `example/call-config-examples.ts` for example prompts.

## 2. Install it into your app

### 1. Fork this repository into your GitHub account

1. On GitHub, click **Fork**.
2. Choose your personal account or organization as the owner and keep it private.
3. Clone your fork locally alongside your application:

```bash
git clone git@github.com:<your-org>/<your-fork>.git hosted-lemonslice-call
cd hosted-lemonslice-call
pnpm install
pnpm build
```

4. In `package.json`, update the package `name` to your own scope, for example `@your-org/hosted-lemonslice-call`.

### 2. Use package locally

While developing, link the package directly into your app without publishing:

**In `hosted-lemonslice-call/`:**

```bash
pnpm build
pnpm link --global
```

*(You can also run `pnpm dev` in `hosted-lemonslice-call/` so `tsup --watch` rebuilds on save).*

**In your app:**

```bash
pnpm link --global @your-org/hosted-lemonslice-call
```

*(If you use `npm`, run `npm link` inside `hosted-lemonslice-call/` and `npm link @your-org/hosted-lemonslice-call` in your app).*

Your app now reads the local `hosted-lemonslice-call/dist` bundle directly.

### 3. Deploy npm package for production

When you are ready to release, publish from your `hosted-lemonslice-call/` directory:

```bash
npm login
pnpm build
```

> **Bump the version before every publish**:
>
> ```bash
> npm version patch   # bug fixes: 1.0.0 → 1.0.1
> npm version minor   # new features, backwards compatible: 1.0.0 → 1.1.0
> npm version major   # breaking changes: 1.0.0 → 2.0.0
> ```

Then publish your package:

- **Private package (recommended):** keeps your code restricted to your npm organization.

  ```bash
  npm publish --access restricted
  ```

  *(Requires an npm paid organization plan or private registry).*

- **Public package:** visible and installable by anyone who knows the package name.

  ```bash
  npm publish --access public
  ```

### 4. Run in production pointing to your npm package

In your app's `package.json`, install your published package:

```json
{
  "dependencies": {
    "@your-org/hosted-lemonslice-call": "^1.0.0"
  }
}
```

Run `pnpm install` (or `npm install`) and commit `package.json` plus your lockfile.

#### CI / Hosting environment variable for private packages: `NPM_TOKEN`

If you published as a **private** npm package, your build environment (Vercel, Docker, AWS, etc.) needs access to install it:

1. Generate a read-only granular access token on npm ([npmjs.com/settings/tokens](https://www.npmjs.com/settings/tokens)) scoped to read `@your-org/hosted-lemonslice-call`.
2. Add an environment variable / secret named `NPM_TOKEN` in your hosting platform or CI provider with that token as the value.
3. Most platforms (like Vercel and Netlify) automatically detect `NPM_TOKEN` and authenticate npm installs. For custom CI or Docker builds, create or check in an `.npmrc` file at the root of your application:

   ```ini
   //registry.npmjs.org/:_authToken=${NPM_TOKEN}
   ```

*(If your package is public, you do not need `NPM_TOKEN` — platforms install it without authentication).*

### 5. (As necessary) Pull updates from LemonSlice

LemonSlice ships updates to `lemonsliceai/hosted-call-{customer}`. Pull them into your fork to pick them up.

```bash
git remote add upstream git@github.com:lemonsliceai/hosted-call-{customer}.git   # once
git fetch upstream
git checkout main
git merge upstream/main
pnpm install
pnpm build
git push origin main
```

## 3. Set your key — server side only

```bash
LEMONSLICE_API_KEY=sk_lemon_...
LEMONSLICE_API_URL=https://lemonslice.com/api/liveai/rooms

# Optional. Points the room at a specific LiveKit agent.
# Only needed for custom agent deploys.
# LEMONSLICE_LIVEKIT_AGENT_NAME=lemonslice-hosted-agent
```

## 4. Add the start-call endpoint on your backend server

Copy this from `example/app/api/lemonslice/start-call/route.ts`:

```ts
// app/api/lemonslice/start-call/route.ts
import { createRoomHandler } from "@your-org/hosted-lemonslice-call/server";
import { auth } from "@/lib/auth";

const handler = createRoomHandler({
  apiKey: process.env.LEMONSLICE_API_KEY!,
  lemonSliceUrl: process.env.LEMONSLICE_API_URL!,

  // Optional: receive usage and session-end events (see below).
  webhookUrl: "https://your-app.com/api/lemonslice/webhook",

  // Optional. Sent as livekit_agent_name_override. Leave unset for the default agent.
  livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,

  room: {
    prompt: "You are June, a small-town baker who moved to the city after calling off your wedding.",
    voiceId: "0984f8581bbb4e5e980a990abb865874",
    agentImageUrl: "https://cdn.example.com/avatar.png",

    // Roleplay only. Empty keeps the backend's default prompt.
    // See example/call-config-examples.ts for example prompts.
    agentOverrides: {
      actionDetectorPrompt: "",
      directorPrompt: "",
      actionDescriptionSuffix: "",
    },
  },

  // Calls bill to your account — only let your own users start one.
  authorize: async (request) => {
    const session = await auth(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  },
});

export { handler as GET, handler as POST };
```

To vary the avatar per visitor, pass a function instead:

```ts
room: async (request) => {
  const user = await auth(request);
  return { prompt: promptFor(user), voiceId: user.voiceId, agentImageUrl: user.imageUrl };
},
```

| `/room` param | description |
| --- | --- |
| `prompt` | Prompt for the LLM to be used as the avatar's knowledge base. Max 40,000 characters. |
| `voiceId` | Optional. Fish Audio voice ID. Leave it out to have LemonSlice pick a voice that fits the image. |
| `agentImageUrl` | Public `https://` image of the avatar. |
| `webhookUrl` | Optional. Overrides the handler's `webhookUrl` for this visitor. |
| `agentOverrides` | Optional, Roleplay only. `actionDetectorPrompt`, `directorPrompt`, and `actionDescriptionSuffix`, each up to 40,000 characters. An empty string keeps the backend's default. |

**Suggested** is the configured `voiceId`. Without one, LemonSlice picks a voice that fits the
avatar image and keeps it, so the same image always gets the same voice. The call setup asks
the route for that voice with a GET and shows its name on **Suggested**; without the `GET`
export, Suggested shows no name. If the visitor picks a voice other than **Suggested**,
`createRoomHandler` uses that Fish Audio voice instead.

### Webhook events

If `webhookUrl` is set (it must be `https://`), LemonSlice POSTs JSON to it for each call:

| Event | When |
| --- | --- |
| `session.usage` | Every 60 seconds |
| `session.ended` | Once, when the session ends |

Each event carries the `session_id` returned when the call started, so you can match it
to your user.

**What we POST**

```jsonc
// session.usage
{
  "event": "session.usage",
  "session_id": "0f4c1a9e-5b77-4d21-9d0e-8c3b1f2a6e55",
  "credits_used_total": 12.5,
  "total_billable_duration_sec": 76.4,
  "occurred_at": "2026-10-15T18:03:21.512165+00:00"
}

// session.ended
{
  "event": "session.ended",
  "session_id": "0f4c1a9e-5b77-4d21-9d0e-8c3b1f2a6e55",
  "credits_used_total": 41.75,
  "total_billable_duration_sec": 254.2,
  "full_transcript": [
    { "role": "user",   "text": "Hey, what can you do?",      "occurred_at": "2026-10-15T18:02:05.118431+00:00" },
    { "role": "avatar", "text": "I can walk you through it.", "occurred_at": "2026-10-15T18:02:07.904772+00:00" }
  ]
}
```

**What we expect back**

Any `2xx` acknowledges the event. For `session.usage`, return `{ "terminate": true }` to
end the call right away — useful for cutting a visitor off at your own credit limit.

| Event | Timeout | If you don't ack |
| --- | --- | --- |
| `session.usage` | 10s | Failed messages will be skipped |
| `session.ended` | 20s | Will arrive at least once |

## 5. Import the styles

Add one line to your root layout (usually `app/layout.tsx`):

```tsx
// app/layout.tsx
import "@your-org/hosted-lemonslice-call/styles.css";
```

The CSS is prebuilt and scoped to the component, so it doesn't touch the rest of your
site — with or without Tailwind in your app.

## 6. Render it

`<LemonSliceCall>` opens with a pre-call screen. The visitor can choose a voice
and video model, then start the session with **Start call**. **FaceTime Lite** uses
`cwm-1-lite`; **FaceTime** uses `cwm-1`; **Roleplay** adds on-camera actions. Hanging
up ends the session, returns to that screen, and calls `onEnded`.

Without a `models` prop the dropdown offers FaceTime Lite and FaceTime.
Pass `models` to pick the order, the default (first in the list), and a subtitle
for each row.

```tsx
<LemonSliceCall
  startCallUrl="/api/lemonslice/start-call"
  agentImageUrl="https://cdn.example.com/avatar.png"
  models={[
    "roleplay",
    { model: "premium", description: "Sharper video" },
    "standard",
  ]}
/>
```

Each entry is an id (`"roleplay"`, `"premium"`, or `"standard"`) or `{ model, label?, description? }`.
Keep descriptions to a few words; the menu is narrow and clips the rest. Repeats and
unknown ids are dropped. A single entry hides the dropdown.

Before a call, the portrait is re-framed so it suits the video model. The crop for the
selected model is prepared once per image through your `/api/lemonslice/avatar-variant` route
(copy it from `example/app/api/lemonslice/avatar-variant/route.ts`) and cached by LemonSlice.
If the image has no face, the call setup shows a warning. Pass `avatarVariants={false}` to use
the image as is.

The component fills its parent. Give that parent a height.

```tsx
"use client";

import { useState } from "react";
import { LemonSliceCall } from "@your-org/hosted-lemonslice-call";

export default function Page() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return <button onClick={() => setOpen(true)}>Video call</button>;
  }

  return (
    <div style={{ height: "100dvh" }}>
      <LemonSliceCall
        startCallUrl="/api/lemonslice/start-call"
        agentImageUrl="https://cdn.example.com/avatar.png"
      />
    </div>
  );
}
```

If the room request fails, the component shows **Try again** and calls `onEnded`. It does not retry on its own.

| Prop | |
| --- | --- |
| `startCallUrl` | Your start-call endpoint from step 4. |
| `agentImageUrl` | Portrait shown before the video starts, and as the glow behind the stage. Use the same URL as `agentImageUrl` on the room. |
| `onEnded` | Optional. Called when the call ends. |
| `models` | Optional. Video models in dropdown order, first is default. Ids or `{ model, label?, description? }`. Defaults to `["standard", "premium"]`. |
| `theme` | `system` (default), `light`, or `dark`. |
| `drift` | Slow float of the portrait. Off by default. |
| `glint` | Sparkles in front of the portrait. Off by default. |
| `edgeFade` | Dissolves the frame into the backdrop. Off by default. |
| `captions` | Shows what the visitor is saying on the video while the transcript is closed. On by default. |
| `suggestions` | Optional. Roleplay only. Pills on the video once it is live; omit for none. A string, or `{ label, turns?, image?, prompt? }`: `turns` hides the pill after that many visitor messages (omit to keep it); `image` makes it a scene change ending on that public `https://` image, which then stays as the reference; `prompt` replaces the default scene clip prompt. The pill for the current image is hidden, and all pills are disabled while an action is in flight. |
| `avatarVariants` | Optional. Re-frames the portrait for the video model, once per image, then cached. On by default; `false` uses the image as is. |
| `className` | Optional, for positioning. |

That's it. You're done.

---

## Making it look the way you want

| Edit | |
| --- | --- |
| `src/styles.css` | Colors and fonts. |
| `src/ui/` | Layout, buttons, icons. Plain Tailwind. |
| `src/core/`, `src/server/` | Interface files. No edits necessary. |

After editing, rebuild and restart your dev server:

```bash
pnpm build
cd ../your-app && rm -rf .next && pnpm dev
```

---

## Moderation

`src/ui/moderation.ts` provides hooks for real-time moderation of user and agent speech:

- `onUserTranscript(transcript, sessionId)`
- `onAgentTranscript(transcript, sessionId)`

If your moderation service determines that a call needs to be terminated, call the LemonSlice [Control a session](https://lemonslice.com/docs/api-reference/control-session) endpoint from your server with the LemonSlice `session_id` and a `terminate` event:

```bash
curl --request POST \
  --url https://lemonslice.com/api/liveai/sessions/{session_id}/control \
  --header 'Content-Type: application/json' \
  --header 'X-API-Key: <api-key>' \
  --data '{
    "event": "terminate"
  }'
```
