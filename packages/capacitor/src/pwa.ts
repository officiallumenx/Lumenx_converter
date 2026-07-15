import type { LumenXMobileApp } from "./types.ts";

/** Base Web App Manifest fields shared by Capacitor shells and future installable PWAs. */
export interface LumenXPwaManifestBase {
  name: string;
  short_name: string;
  start_url: string;
  display: "standalone";
  background_color: string;
  theme_color: string;
  scope: string;
}

export interface LumenXPwaManifestOptions {
  app: LumenXMobileApp;
  appName: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  startUrl?: string;
  scope?: string;
}

/**
 * Returns manifest metadata for a LumenX app.
 * Not wired into Connect yet — prepares the same `dist/` output for a future PWA layer
 * without changing current UI or routes.
 */
export function createPwaManifestBase(options: LumenXPwaManifestOptions): LumenXPwaManifestBase {
  return {
    name: options.appName,
    short_name: options.shortName ?? options.appName,
    start_url: options.startUrl ?? "/",
    display: "standalone",
    background_color: options.backgroundColor ?? "#ffffff",
    theme_color: options.themeColor ?? "#0f172a",
    scope: options.scope ?? "/",
  };
}
