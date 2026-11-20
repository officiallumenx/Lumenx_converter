import type { ModuleHelpContent, ModuleHelpRegistry } from "./types";

/** Strip leading slash and normalize path-like keys to bare ids. */
export function normalizeModuleHelpKey(key: string): string {
  return key.trim().replace(/^\/+/, "").replace(/\/+$/, "") || "home";
}

/** Build a lookup that accepts bare ids or path-like keys (`/messages`, `activity/sports`). */
export function createGetModuleHelp(registry: ModuleHelpRegistry) {
  return function getModuleHelp(id: string): ModuleHelpContent | null {
    const bare = normalizeModuleHelpKey(id);
    if (registry[bare]) return registry[bare];
    const dashed = bare.replace(/\//g, "-");
    if (registry[dashed]) return registry[dashed];
    if (bare === "" || bare === "/") return registry.home ?? null;
    return null;
  };
}
