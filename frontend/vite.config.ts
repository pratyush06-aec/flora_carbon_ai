// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Target Vercel's Node.js runtime instead of the default cloudflare-module.
  nitro: {
    preset: "vercel",
  },
  vite: {
    ssr: {
      // Prevent leaflet/react-leaflet from being bundled into the SSR server.
      // These packages reference `window` at the module scope and crash Node.js.
      // Marking them external means Node.js will try to require() them at runtime,
      // but since MapView is only dynamically imported client-side (inside useEffect),
      // the server never actually reaches these imports.
      noExternal: [],
      external: ["leaflet", "react-leaflet", "@react-leaflet/core"],
    },
  },
});
