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
    cacheDir: "../../node_modules/.vite-admissions",
    server: {
      port: 5177,
      strictPort: false,
      open: "/",
      warmup: {
        clientFiles: [
          "./src/routes/__root.tsx",
          "./src/router.tsx",
          "./src/styles.css",
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
        "zod",
        "react-hook-form",
        "@hookform/resolvers/zod",
      ],
    },
  },
});
