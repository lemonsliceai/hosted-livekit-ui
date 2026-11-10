You are a coding agent working inside an existing React application.

Your task is to integrate the LemonSlice hosted-call avatar package into this application so the user can start and interact with a LemonSlice avatar.

Do not create a separate demo app. Integrate LemonSlice directly into the existing application and follow the application's existing architecture, styling, authentication, package-manager, and routing conventions.

## Before making changes

First inspect the codebase and determine:

- The framework and version being used (Next.js, Vite, React Router, etc.).
- The package manager (`pnpm`, `npm`, `yarn`, etc.).
- Whether the application has a backend/server component where secrets can safely be used.
- How API routes or backend endpoints are structured.
- Where global/root CSS imports live.
- Which page or component is the most appropriate place to render the LemonSlice avatar. Ask user for guidance here if they have not provided a location this component should be used.

Prefer adapting the integration to the existing application rather than introducing new architectural patterns.

## 1. Install LemonSlice

Install in this order. Stop at the first one that applies.

You are in the user's application. This package is not that application. Do not clone/copy the package into the app.

1. If the user provided an npm package name, install that package.

   When they also gave a path to a local checkout, link that checkout so the app runs that code. Build it first so `dist` exists.

   In the checkout:

   ```bash
   npm run build
   npm link
   ```

   In the application:

   ```bash
   npm link <package-name>
   ```

   Use the application's package manager when it is not npm (`pnpm link --global` in the checkout, then `pnpm link --global <package-name>` in the app).

   When there is no local checkout, add the published package at its latest version with the app's package manager:

   ```bash
   pnpm add <package-name>@latest
   ```

   Use `npm install <package-name>@latest` or `yarn add <package-name>@latest` when that is the app's package manager.

2. Otherwise install from the git repo this code lives in.

   ```json
   "@your-org/hosted-lemonslice-call": "github:<owner>/<repo>"
   ```

   `<owner>/<repo>` is the customer's fork, or the repo on the LemonSlice GitHub account (`lemonsliceai/hosted-call-{customer}`). Use the repo the user names. Ask for it when they have not given one.

After it is installed, open that package's `package.json` and read `name`. Use that exact name for every import below. `@your-org/hosted-lemonslice-call` in this document is only a placeholder.

Do not clone or copy the example application into this repository.

## 2. Configure the key — server side only

Put these in the server env file the app already uses. For Next.js that is `.env.local`. Never expose them to client code, and do not commit the key.

```bash
LEMONSLICE_API_KEY=
LEMONSLICE_API_URL=https://lemonslice.com/api/liveai/rooms
```

Ask the user for their LemonSlice API key and set `LEMONSLICE_API_KEY` to it. If they have not given one yet, leave the placeholder and say in the summary that a call cannot connect until they set it. Do not invent a key. Keep `LEMONSLICE_API_URL` unless the user gives a different rooms URL. The start-call route needs both.

## 3. Add a server-side start-call endpoint

Create an endpoint in the application's existing backend/API routing system that starts a LemonSlice call.

For a Next.js App Router application, the preferred location is:

```text
app/api/lemonslice/start-call/route.ts
```

and the implementation should use:

```ts
import { createRoomHandler } from "@your-org/hosted-lemonslice-call/server";
```

The basic configuration is:

```ts
export const POST = createRoomHandler({
  apiKey: process.env.LEMONSLICE_API_KEY!,
  lemonSliceUrl: process.env.LEMONSLICE_API_URL ?? "https://lemonslice.com/api/liveai/rooms",

  // Optional. Sent as livekit_agent_name_override. Leave unset for the default agent.
  livekitAgentNameOverride: process.env.LEMONSLICE_LIVEKIT_AGENT_NAME,

  room: {
    prompt: "You are a friendly product guide. Keep answers to one or two sentences.",
    voiceId: "b545c585f631496c914815291da4e893",
    agentImageUrl: "https://cdn.example.com/avatar.png",
  },
});
```

However, adapt this implementation to the application's existing architecture.

### Authentication

Calls are billed to the LemonSlice account, so the start-call endpoint should only be accessible to users who are allowed to use it.

If the application already has authentication, use its existing authentication mechanism and add an `authorize` callback.

Conceptually:

```ts
authorize: async (request) => {
  const session = await existingAppAuth(request);

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
},
```

Do not invent a fake authentication system.

If the application has no authentication and the desired page is intentionally public, mention this in your completion summary rather than adding arbitrary auth infrastructure.

### Visitor voice

If the visitor picks a voice other than **Suggested**, `createRoomHandler` uses that Fish Audio voice instead of the configured `voiceId`. Choosing **Suggested** keeps the configured voice. When the room has a known voice id, pass that same id as `suggestedVoiceId` on `<LemonSliceCall>` so the Suggested row is labeled with the voice name when it matches a listed voice.

## 4. Configure the avatar

Use these initial values unless the existing application already provides equivalent configuration:

```ts
room: {
  prompt: "You are a friendly product guide. Keep answers to one or two sentences.",
  voiceId: "b545c585f631496c914815291da4e893",
  agentImageUrl: "https://cdn.example.com/avatar.png",
}
```

The `agentImageUrl` above is only a placeholder.

Look through the application's existing assets/configuration for an appropriate avatar image.

If there is an obvious intended avatar image, use its public HTTPS URL if one is available.

Otherwise keep the placeholder clearly marked so the developer knows it must be replaced.

Do not fabricate a production CDN URL.

Supported room values are:

- `prompt`: LLM prompt / knowledge base, maximum 40,000 characters.
- `voiceId`: Fish Audio voice ID.
- `agentImageUrl`: public HTTPS avatar image.

The room configuration can also be dynamic:

```ts
room: async (request) => {
  const user = await existingAppAuth(request);

  return {
    prompt: promptFor(user),
    voiceId: user.voiceId,
    agentImageUrl: user.imageUrl,
  };
},
```

Only use dynamic configuration if doing so naturally fits the existing application.

## 5. Import LemonSlice styles

Import:

```ts
import "@your-org/hosted-lemonslice-call/styles.css";
```

Put this in the application's appropriate global/root entry point.

For a Next.js App Router application this will usually be:

```text
app/layout.tsx
```

Avoid importing the stylesheet repeatedly in individual components.

## 6. Render the LemonSlice component

Import:

```tsx
import { LemonSliceCall } from "@your-org/hosted-lemonslice-call";
```

Render it somewhere appropriate in the existing UI:

```tsx
<LemonSliceCall
  startCallUrl="/api/lemonslice/start-call"
  agentImageUrl="https://cdn.example.com/avatar.png"
/>
```

The component fills its parent. Give that parent a height, or the call collapses. A full-page call can use `style={{ height: "100dvh" }}`. A panel should use the height that region already has.

`<LemonSliceCall>` already has a pre-call screen and a **Start call** button. Do not add a second one.

In the Next.js App Router, render it from a Client Component. Add `"use client"` to the file that contains `<LemonSliceCall>`, or render it from a small client wrapper that a Server Component page imports.

Use the SAME avatar image for the client-side `agentImageUrl` and the server-side room `agentImageUrl`.

| Prop | |
| --- | --- |
| `startCallUrl` | The application's start-call endpoint from step 3. |
| `agentImageUrl` | Portrait shown before the video starts, and as the glow behind the stage. Use the same URL as `agentImageUrl` on the room. |
| `onEnded` | Optional. Called when the call ends. |
| `suggestedVoiceId` | Optional. The voice the room uses for **Suggested**; names that row when it matches a listed voice. |
| `models` | Optional. Video models in dropdown order; the first is the default. Each entry is `"standard"` or `"premium"`, or `{ model, label?, description? }`. `description` is a short subtitle; the menu clips the rest. Repeats and unknown ids are dropped. One entry hides the dropdown. Omit it to offer Standard then Premium. |
| `theme` | `"system"` (default), `"light"`, or `"dark"`. |
| `drift` | Slow float of the portrait. Off by default. |
| `glint` | Sparkles in front of the portrait. Off by default. |
| `edgeFade` | Dissolves the frame into the backdrop. Off by default. |
| `className` | Optional positioning/styling hook. |

Match the existing application's design with these props. Do not substantially redesign surrounding pages just to add LemonSlice. Do not edit files inside `node_modules` or the installed package.

Only when you linked a local checkout may you change that checkout: `src/styles.css` for colors and fonts, `src/ui/` for layout. Leave `src/core/` and `src/server/` alone. Then rebuild the checkout and restart the app:

```bash
pnpm build
cd ../your-app && rm -rf .next && pnpm dev
```

## 7. Validate the integration

After making the changes:

1. Run the appropriate dependency installation command if needed.
2. Run type checking if the project supports it.
3. Run linting if available.
4. Run the project's build.
5. Fix any integration-related errors you introduced.

Do not modify unrelated code just to make pre-existing lint/test failures disappear.

Verify that:

- `LEMONSLICE_API_KEY` is only in the server env file, never in client code.
- `LEMONSLICE_API_URL` is set, or the route falls back to `https://lemonslice.com/api/liveai/rooms`.
- The frontend calls the application's `/api/lemonslice/start-call` endpoint rather than LemonSlice directly.
- Imports use the installed package's `name`, including `./server` and `./styles.css`.
- The styles import is loaded once, from the root layout, using the real package name.
- `LemonSliceCall` is rendered from a Client Component and has a parent with a usable height.
- The client `agentImageUrl` and the room `agentImageUrl` are the same URL.
- Existing authentication is respected.
- The project still builds successfully.
- If `LEMONSLICE_API_KEY` is still empty, the summary says a call cannot connect until the user sets it.

## Important constraints

- Never expose `LEMONSLICE_API_KEY` to the client.
- Never call the LemonSlice room API directly from browser code.
- Do not introduce a new framework or authentication system.
- Do not clone the LemonSlice example application.
- Do not replace the application's existing styling architecture.
- Do not make broad unrelated refactors.
- Prefer the smallest clean integration that follows the existing application's conventions.
- Preserve existing functionality.

## Completion response

When finished, provide a concise summary containing:

1. Files changed.
2. Where the LemonSlice component was added.