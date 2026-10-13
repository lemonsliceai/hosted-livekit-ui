import { defineConfig, type Options } from "tsup";

const shared = {
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  external: ["react", "react-dom"],
} satisfies Options;

export default defineConfig([
  {
    ...shared,
    entry: { index: "src/index.ts" },
    // The React entry is client-only; the directive has to survive bundling.
    banner: { js: '"use client";' },
  },
  {
    ...shared,
    entry: { "server/index": "src/server/index.ts" },
  },
]);
