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
- Which page or component is the most appropriate place to render the LemonSlice avatar.

Prefer adapting the integration to the existing application rather than introducing new architectural patterns.

## 1. Install LemonSlice

Add this dependency:

```json
"@lemonslice/hosted-call": "github:lemonsliceai/hosted-livekit-ui#v1.0.0"
```

Use the application's existing package manager to install/update dependencies.

Keep the package pinned to `v1.0.0`.

Do not clone or copy the example application into this repository.

## 3. Add a server-side start-call endpoint

Create an endpoint in the application's existing backend/API routing system that starts a LemonSlice call.

For a Next.js App Router application, the preferred location is:

```text
app/api/lemonslice/start-call/route.ts
```

and the implementation should use:

```ts
import { createRoomHandler } from "@lemonslice/hosted-call/server";
```

The basic configuration is:

```ts
export const POST = createRoomHandler({
  apiKey: process.env.LEMONSLICE_API_KEY!,
  lemonSliceUrl: process.env.LEMONSLICE_API_URL!,

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
- `webhookUrl`: optional per-user webhook override.

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
import "@lemonslice/hosted-call/styles.css";
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
import { LemonSliceCall } from "@lemonslice/hosted-call";
```

Render it somewhere appropriate in the existing UI:

```tsx
<LemonSliceCall
  startCallUrl="/api/lemonslice/start-call"
  agentImageUrl="https://cdn.example.com/avatar.png"
/>
```

The component fills its parent, so make sure its parent has an appropriate explicit or constrained height.

Use the SAME avatar image for the client-side `agentImageUrl` and the server-side room `agentImageUrl`.

Available component props include:

```ts
startCallUrl
agentImageUrl
models
theme
drift
glint
edgeFade
className
```

where:

- `models`: optional. Video models in dropdown order; the first is the default. Each entry is `"standard"` or `"premium"`, or `{ model, label?, description? }` where `description` is a subtitle under the row. Omit it to offer Standard then Premium.
- `theme`: `"system"`, `"light"`, or `"dark"`; default is `"system"`.
- `drift`: enables slow avatar movement.
- `glint`: enables foreground sparkles.
- `edgeFade`: fades the stage edges into its backdrop.
- `className`: optional positioning/styling hook.

Match the existing application's design. Do not substantially redesign surrounding pages just to add LemonSlice.

## 8. Validate the integration

After making the changes:

1. Run the appropriate dependency installation command if needed.
2. Run type checking if the project supports it.
3. Run linting if available.
4. Run the project's build.
5. Fix any integration-related errors you introduced.

Do not modify unrelated code just to make pre-existing lint/test failures disappear.

Verify that:

- `LEMONSLICE_API_KEY` is never included in client-side code.
- The frontend calls the application's `/api/lemonslice/start-call` endpoint rather than LemonSlice directly.
- `@lemonslice/hosted-call/styles.css` is loaded.
- `LemonSliceCall` has a parent with usable dimensions.
- Existing authentication is respected.
- The project still builds successfully.

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