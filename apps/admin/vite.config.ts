import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { ConfigEnv, Plugin, UserConfig } from "vite";

const adminRoot = path.dirname(fileURLToPath(import.meta.url));
const lumenxUiChartStub = path.resolve(adminRoot, "src/shims/lumenx-ui-chart-stub.tsx");

/** Matches the resolved workspace chart module on Windows and POSIX. */
const lumenxUiChartPathRe =
  /[\\/]packages[\\/]ui[\\/]src[\\/]components[\\/]ui[\\/]chart\.tsx$/;

const lumenxUiSrcPathRe = /[\\/]packages[\\/]ui[\\/]src[\\/]/;

function isLumenxUiChartRelativeId(source: string): boolean {
  return (
    source === "./components/ui/chart" ||
    source === "./components/ui/chart.tsx" ||
    source === "../components/ui/chart" ||
    source === "../components/ui/chart.tsx" ||
    source.endsWith("/components/ui/chart") ||
    source.endsWith("/components/ui/chart.tsx")
  );
}

/**
 * Vite's resolve.alias only sees the raw importee. The `@lumenx/ui` barrel uses
 * `export * from "./components/ui/chart"`, so this pre-resolve hook stubs that
 * relative id (and absolute chart paths) during `vite serve` only.
 */
function adminLumenxUiChartStubResolve(): Plugin {
  return {
    name: "admin-lumenx-ui-chart-stub-resolve",
    enforce: "pre",
    resolveId(source, importer) {
      if (lumenxUiChartPathRe.test(source)) {
        return lumenxUiChartStub;
      }
      if (importer && lumenxUiSrcPathRe.test(importer) && isLumenxUiChartRelativeId(source)) {
        return lumenxUiChartStub;
      }
      return null;
    },
  };
}

const createConfig = defineConfig({
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

export default async (env: ConfigEnv): Promise<UserConfig> => {
  const config = await createConfig(env);

  // Dev-only: keep production builds on the real chart module (already tree-shaken
  // out of the Admin Home entry). Do not alias the `recharts` package itself.
  if (env.command === "serve") {
    const chartStubAlias = {
      find: lumenxUiChartPathRe,
      replacement: lumenxUiChartStub,
      // Regex aliases only replace the matched suffix; always return the absolute stub.
      customResolver() {
        return lumenxUiChartStub;
      },
    };

    config.resolve ??= {};
    const existing = config.resolve.alias;
    if (!existing) {
      config.resolve.alias = [chartStubAlias];
    } else if (Array.isArray(existing)) {
      config.resolve.alias = [...existing, chartStubAlias];
    } else {
      config.resolve.alias = [
        ...Object.entries(existing).map(([find, replacement]) => ({ find, replacement })),
        chartStubAlias,
      ];
    }

    config.plugins = [adminLumenxUiChartStubResolve(), ...(config.plugins ?? [])];
  }

  return config;
};
