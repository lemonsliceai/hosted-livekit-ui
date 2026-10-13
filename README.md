# @lemonslice/hosted-call

A React component that puts a talking LemonSlice avatar on your site.

```
<LemonSliceCall>  ──▶  your /start-call route  ──▶  LemonSlice
```

**You need:** a LemonSlice API key and React 18+.

---

## 1. See it in action (spin up the example)

```bash
git clone git@github.com:<your-org>/hosted-call-xyz.git lemonslice
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
    "@lemonslice/hosted-call": "github:<your-org>/hosted-call-xyz#v0.1.0"
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

## 5. Import the styles

Add one line to your root layout (usually **`app/layout.tsx`**):

```tsx
// app/layout.tsx
import "@lemonslice/hosted-call/styles.css";
```

The CSS is prebuilt and scoped to the component, so it doesn't touch the rest of your
site — with or without Tailwind in your app.

## 6. Render it

```tsx
import { LemonSliceCall } from "@lemonslice/hosted-call";

export default function Page() {
  return <LemonSliceCall startCallUrl="/api/lemonslice/start-call" />;
}
```

| Prop | |
| --- | --- |
| `startCallUrl` | Your start-call endpoint 4. |
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
