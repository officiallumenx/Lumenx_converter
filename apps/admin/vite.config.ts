import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      // Firebase Phone Auth rejects hostname `localhost`.
      host: "127.0.0.1",
    },
    ssr: {
      noExternal: [/^@lumenx\//],
    },
  },
});
