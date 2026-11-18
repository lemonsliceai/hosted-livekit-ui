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

If the app is not React 18 or newer, stop and say so. If it has no server where a secret can stay, stop. Do not invent a backend, and do not put `LEMONSLICE_API_KEY` in client code.

Prefer adapting the integration to the existing application rather than introducing new architectural patterns.

## 1. Install LemonSlice

Install in this order. Stop at the first one that applies.

You are in the user's application. This package is not that application. Do not clone/copy the package into the app.

1. If the user provided an npm package name, install that package.

   When they also gave a path to a local checkout, still record a deployable dependency first, then link that checkout over it. `npm link` only overrides `node_modules`. It does not give CI or a deployment a package to install.

   Add the published package with the app's package manager so `package.json` and the lockfile record it:

   ```bash
   pnpm add <package-name>@latest
   ```

   Use `npm install <package-name>@latest` or `yarn add <package-name>@latest` when that is the app's package manager. If the package is not on npm, record the git dependency from step 2 instead.

   Then build the checkout and link it as a local override:

   ```bash
   npm run build
   npm link
   ```

   In the application:

   ```bash
   npm link <package-name>
   ```

   Use the application's package manager when it is not npm (`pnpm link --global` in the checkout, then `pnpm link --global <package-name>` in the app). If the link command rewrites the dependency to `link:` or `file:`, put back the registry or git specifier before committing. Commit `package.json` and the lockfile with that specifier, not the link.

   When there is no local checkout, add the published package at its latest version with the app's package manager:

   ```bash
   pnpm add <package-name>@latest
   ```

   Use `npm install <package-name>@latest` or `yarn add <package-name>@latest` when that is the app's package manager.

2. Otherwise install from the git repo this code lives in.

   Read the `name` field in that repo's `package.json` before you add the dependency. Use the local checkout when you have one. Otherwise read `https://github.com/<owner>/<repo>/raw/HEAD/package.json`. That `name` is the dependency key and the import path. Do not write a placeholder key.

   ```json
   "<name>": "github:<owner>/<repo>"
   ```

   `<owner>/<repo>` is the customer's fork, or the repo on the LemonSlice GitHub account (`lemonsliceai/hosted-call-{customer}`). Use the repo the user names. Ask for it when they have not given one.

   If that install fails because the repo or npm package is private, stop and ask the user for access. Do not copy the package source into the app, and do not make the package public.

Use that same `name` for every import below. `@your-org/hosted-lemonslice-call` in the samples is only a stand-in. Replace it.

Do not clone or copy the example application into this repository.

## 2. Configure the key — server side only

Put these in the server env file the app already uses. For Next.js that is `.env.local`. Never expose them to client code, and do not commit the key.

```bash
LEMONSLICE_API_KEY=
```

Ask the user for their LemonSlice API key and set `LEMONSLICE_API_KEY` to it. If they have not given one yet, leave the placeholder and say in the summary that a call cannot connect until they set it. Do not invent a key.

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
const handler = createRoomHandler({
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

export { handler as GET, handler as POST };
```

However, adapt this implementation to the application's existing architecture.

`createRoomHandler` returns `(request: Request) => Promise<Response>`. On the Next.js App Router, export that function as both `GET` and `POST`. On any other server, adapt it to the route style the app already uses. Do not reimplement the LemonSlice request, and do not change the app's framework so this route can exist.

`startCallUrl` must be a path the browser can GET and POST. Include the app's existing API prefix or `basePath` when it has one.

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

**Suggested** is the configured `voiceId`. Without one, LemonSlice picks a voice that fits the avatar image and keeps it for that image. When it is a listed voice, the call setup shows its name on **Suggested**. Passing `voiceId` to `<LemonSliceCall>` sets **Suggested** in the page instead; it is sent when the call starts, so it overrides the room's `voiceId`. If the visitor picks a voice other than **Suggested**, `createRoomHandler` uses that Fish Audio voice instead.

## 4. Configure the avatar

Use these initial values unless the existing application already provides equivalent configuration:

```ts
room: {
  prompt: "You are a friendly product guide. Keep answers to one or two sentences.",
  voiceId: "b545c585f631496c914815291da4e893",
  agentImageUrl: "https://cdn.example.com/avatar.png",
}
```

The `agentImageUrl` above is only a placeholder. The room value must be a public `https://` URL that LemonSlice's servers can fetch. A site path such as `/avatar.png`, or a `localhost` URL, does not work.

Look through the application's existing assets/configuration for an appropriate avatar image.

If there is an obvious intended avatar image and it already has a public HTTPS URL, use that URL.

Otherwise keep the placeholder clearly marked so the developer knows it must be replaced.

Do not fabricate a production CDN URL. Keep the `voiceId` above unless the user provides a Fish Audio voice id. Do not invent one.

Supported room values are:

- `prompt`: LLM prompt / knowledge base, maximum 40,000 characters.
- `voiceId`: Optional. Fish Audio voice ID. Leave it out to have LemonSlice pick a voice that fits the image.
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

For a Next.js App Router application this will usually be `app/layout.tsx`. For Vite and other bundlers, import it once from the client entry, usually `src/main.tsx`.

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

The page must be served over `https` or `localhost` so the browser can grant the microphone. If the call is inside an iframe, that iframe must allow the microphone.

Use the SAME avatar image for the client-side `agentImageUrl` and the server-side room `agentImageUrl`.

| Prop | |
| --- | --- |
| `startCallUrl` | The application's start-call endpoint from step 3. |
| `agentImageUrl` | Portrait shown before the video starts, and as the glow behind the stage. Use the same URL as `agentImageUrl` on the room. |
| `voiceId` | Optional. Fish Audio voice for **Suggested**. Sent when the call starts, so it overrides the room's `voiceId`. |
| `onEnded` | Optional. Called when the call ends. |
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
3. The start-call route path.
4. Whether `LEMONSLICE_API_KEY` is set, or still a placeholder.