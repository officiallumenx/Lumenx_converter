import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Force Nitro cloudflare-module output so `wrangler deploy` works outside Lovable.
  nitro: true,
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    ssr: {
      noExternal: [/^@lumenx\//],
    },
  },
});
