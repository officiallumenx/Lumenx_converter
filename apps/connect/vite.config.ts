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
    server: {
      // Firebase Phone Auth rejects hostname `localhost` (invalid-app-credential).
      // Bind to 127.0.0.1 so local SMS OTP works when that domain is authorized.
      host: "127.0.0.1",
      port: 5174,
      strictPort: false,
      open: "http://127.0.0.1:5174/login",
      warmup: {
        clientFiles: [
          "./src/routes/__root.tsx",
          "./src/router.tsx",
          "./src/styles.css",
          "./src/routes/login.tsx",
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
