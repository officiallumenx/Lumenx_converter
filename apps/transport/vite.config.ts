import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  serverFnErrorLogger: false,
  ssrErrorLogger: false,
  tanstackStart: {
    server: { entry: "server" },
    router: {
      autoCodeSplitting: true,
    },
    importProtection: {
      behavior: {
        dev: "mock",
        build: "error",
      },
    },
  },
  vite: {
    cacheDir: "../../node_modules/.vite-transport",
    server: {
      // Firebase Phone Auth rejects hostname `localhost`.
      host: "127.0.0.1",
      port: 5175,
      strictPort: false,
      open: "http://127.0.0.1:5175/",
      warmup: {
        clientFiles: [
          "./src/routes/__root.tsx",
          "./src/router.tsx",
          "./src/styles.css",
          "./src/routes/_app.tsx",
          "./src/routes/_app/index.tsx",
        ],
      },
    },
    ssr: {
      noExternal: [/^@lumenx\//],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-router",
        "@tanstack/react-query",
        "lucide-react",
        "sonner",
      ],
    },
  },
});
