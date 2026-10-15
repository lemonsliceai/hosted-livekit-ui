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

Open <http://localhost:3001> and click **Start call**.

> Run `pnpm i` in the repo root first. This app depends on the package via `file:..`, so
> the package has to be built before the app can use it.

## After changing the component

```bash
cd .. && pnpm build
cd example && rm -rf .next && pnpm dev
```
