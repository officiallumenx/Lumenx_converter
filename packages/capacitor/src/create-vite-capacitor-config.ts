import { defineConfig } from "@lovable.dev/vite-tanstack-config";

import type { LumenXViteCapacitorOptions } from "./types.ts";

const DEFAULT_OPTIMIZE_DEPS = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@tanstack/react-router",
  "@tanstack/react-query",
  "lucide-react",
] as const;

/**
 * Vite + TanStack Start config for Capacitor and future PWA builds.
 *
 * - Produces a static client bundle in `dist/` with `index.html` at the root.
 * - Disables Nitro / Cloudflare server bundling (web SSR pipeline stays separate).
 * - Does not modify each app's default vite.config.ts (web dev + SSR deploy).
 *
 * Admin and Nexus add their own `vite.config.capacitor.ts` that calls this factory.
 */
export function createViteCapacitorConfig(options: LumenXViteCapacitorOptions) {
  const { appKey, vite: userVite, tanstackStart: userTanstackStart, optimizeDepsInclude = [] } =
    options;

  return defineConfig({
    serverFnErrorLogger: false,
    ssrErrorLogger: false,
    nitro: false,
    tanstackStart: {
      router: {
        autoCodeSplitting: true,
      },
      importProtection: {
        behavior: {
          dev: "mock",
          build: "error",
        },
      },
      /**
       * SPA shell — required for Capacitor WebView and compatible with future PWA
       * service-worker hosting from the same `dist/` output (flattened post-build).
       */
      spa: {
        enabled: true,
        prerender: {
          outputPath: "/index.html",
        },
      },
      ...userTanstackStart,
    },
    vite: {
      cacheDir: `../../node_modules/.vite-${appKey}-capacitor`,
      build: {
        outDir: "dist",
        emptyOutDir: true,
      },
      resolve: {
        dedupe: [
          "react",
          "react-dom",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "@tanstack/react-query",
          "@tanstack/query-core",
        ],
      },
      ssr: {
        noExternal: [/^@lumenx\//],
      },
      optimizeDeps: {
        include: [...DEFAULT_OPTIMIZE_DEPS, ...optimizeDepsInclude],
      },
      ...userVite,
    },
  });
}
