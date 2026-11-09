# @lemonslice/hosted-call-ui

A React component that puts a talking LemonSlice avatar on your site.

```
<LemonSliceCall>  ──▶  your /start-call route  ──▶  LemonSlice
```

**You need:** a LemonSlice API key and React 18+.

---

## 1. See it in action (spin up the example)

```bash
git clone git@github.com:lemonsliceai/hosted-call-xyz.git lemonslice
cd lemonslice

pnpm i                      # build the package
cd example && pnpm i        # Build the example
cp .env.example .env.local  # paste your LEMONSLICE_API_KEY
pnpm dev
```

Open <http://localhost:3001> and play with your UI.

`example/` is a demo app. It stays in this repo but is never installed into your app.

## 2. Install it into your app

```json
{
  "dependencies": {
    "@lemonslice/hosted-call": "github:lemonsliceai/hosted-call-xyz#v1.0.0"
  }
}
```

Pin the tag. It builds itself on install.

If your CI builds from a private repo, give it read access — a deploy key, or:

```bash
git config --global url."https://x-access-token:${GITHUB_TOKEN}@github.com/".insteadOf "git@github.com:"
```

## 3. Set your key — server side only

```bash
LEMONSLICE_API_KEY=sk_lemon_...
LEMONSLICE_API_URL=https://lemonslice.com/api/liveai/rooms

# Optional. Points the room at a specific LiveKit agent.
# LEMONSLICE_LIVEKIT_AGENT_NAME=lemonslice-hosted-agent-dev
```

## 4. Add the start-call endpoint on your backend server

Copy this from `example/app/api/lemonslice/start-call/route.ts`:

```ts
// app/api/lemonslice/start-call/route.ts
import { createRoomHandler } from "@lemonslice/hosted-call/server";
import { auth } from "@/lib/auth";

export const POST = createRoomHandler({
  apiKey: process.env.LEMONSLICE_API_KEY!,
  lemonSliceUrl: process.env.LEMONSLICE_API_URL!,

  // Optional: receive usage and session-end events (see below).
  webhookUrl: "https://your-app.com/api/lemonslice/webhook",

  // Optional. Sent as livekit_agent_name_override. Leave unset for the default agent.
  livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,

  room: {
    prompt: "You are a friendly product guide. Keep answers to one or two sentences.",
    voiceId: "b545c585f631496c914815291da4e893",
    agentImageUrl: "https://cdn.example.com/avatar.png",
  },

  // Calls bill to your account — only let your own users start one.
  authorize: async (request) => {
    const session = await auth(request);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  },
});
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
| `voiceId` | Fish Audio voice ID. |
| `agentImageUrl` | Public `https://` image of the avatar. |
| `webhookUrl` | Optional. Overrides the handler's `webhookUrl` for this visitor. |

If the visitor picks a voice other than **Suggested**, `createRoomHandler` uses
that Fish Audio voice instead of the configured `voiceId`. Choosing **Suggested**
keeps the configured voice.

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
  "occurred_at": "2026-10-15T18:03:21.512165+00:00"
}

// session.ended
{
  "event": "session.ended",
  "session_id": "0f4c1a9e-5b77-4d21-9d0e-8c3b1f2a6e55",
  "credits_used_total": 41.75,
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

Add one line to your root layout (usually **`app/layout.tsx`**):

```tsx
// app/layout.tsx
import "@lemonslice/hosted-call/styles.css";
```

The CSS is prebuilt and scoped to the component, so it doesn't touch the rest of your
site — with or without Tailwind in your app.

## 6. Render it

`<LemonSliceCall>` opens with a pre-call screen. The visitor can choose a voice
and video model, then start the session with **Start call**. **Standard** uses
`cwm-1-lite`; **Premium** uses `cwm-1`. Hanging up ends the session, returns to
that screen, and calls `onEnded`.

Without a `models` prop the dropdown offers Standard and Premium, Standard first.
Pass `models` to pick the order, the default (first in the list), and a subtitle
for each row.

```tsx
<LemonSliceCall
  startCallUrl="/api/lemonslice/start-call"
  agentImageUrl="https://cdn.example.com/avatar.png"
  models={[
    { model: "premium", description: "Sharper video" },
    "standard",
  ]}
/>
```

Each entry is an id (`"standard"` or `"premium"`) or `{ model, label?, description? }`.
Keep descriptions to a few words; the menu is narrow and clips the rest. Repeats and
unknown ids are dropped. A single entry hides the dropdown.

The component fills its parent. Give that parent a height.

```tsx
"use client";

import { useState } from "react";
import { LemonSliceCall } from "@lemonslice/hosted-call";

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
| `suggestedVoiceId` | Optional. The voice your room uses for **Suggested**; names that row when it matches a listed voice. |
| `models` | Optional. Video models in dropdown order, first is default. Ids or `{ model, label?, description? }`. Defaults to `["standard", "premium"]`. |
| `startCallBody` | Optional. Extra fields merged into the start-call POST body, for your route to read (for example a character id your server resolves). Never send prompt text from the browser. |
| `onRoom` | Optional. Called with the LiveKit room when the call connects and with null when it ends, for listening to the room's data topics. |
| `theme` | `system` (default), `light`, or `dark`. |
| `drift` | Slow float of the portrait. Off by default. |
| `glint` | Sparkles in front of the portrait. Off by default. |
| `edgeFade` | Dissolves the frame into the backdrop. Off by default. |
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
