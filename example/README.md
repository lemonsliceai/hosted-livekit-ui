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

## Session config

Every option for the call is a constant in `call-config.ts`: the image, voice, prompt, the
three Roleplay prompt overrides, and the suggestion pills. Edit it, or replace the file with
one someone sent you. An empty override keeps the backend's default.

## After changing the component

```bash
cd .. && pnpm build
cd example && rm -rf .next && pnpm dev
```
