import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Lighter dev server — skip SSR/server-fn transform hooks used for Lovable sandbox tooling
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
    cacheDir: "../../node_modules/.vite-connect",
    ssr: {
      noExternal: [/^@lumenx\//],
    },
    server: {
      warmup: {
        clientFiles: [
          "./src/routes/__root.tsx",
          "./src/router.tsx",
          "./src/styles.css",
        ],
      },
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
        "zod",
        "react-hook-form",
        "@hookform/resolvers/zod",
      ],
    },
  },
});
