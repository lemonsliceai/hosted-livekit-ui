import type { Config } from "tailwindcss";

// Builds `dist/styles.css`, so apps that render the component don't need Tailwind.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  important: ".lemonslice-call",
  corePlugins: { preflight: false },
};

export default config;
