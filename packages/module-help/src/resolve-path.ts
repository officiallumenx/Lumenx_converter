import type { ModuleHelpResolver } from "./types";
import { normalizeModuleHelpKey } from "./lookup";

/**
 * Map a URL pathname to a registry help key.
 * Tries full path, dashed path, then prefixes/suffixes — longest match wins.
 * `home` is only used as a final fallback.
 */
export function resolveModuleHelpKeyFromPath(
  pathname: string,
  resolve: ModuleHelpResolver,
): string | null {
  const bare = normalizeModuleHelpKey(pathname);
  const candidates = new Set<string>();
  if (bare && bare !== "home") {
    candidates.add(bare);
    candidates.add(bare.replace(/\//g, "-"));
  }

  const parts = (bare || "").split("/").filter(Boolean);
  for (let i = parts.length; i >= 1; i -= 1) {
    const joinedDash = parts.slice(0, i).join("-");
    const joinedSlash = parts.slice(0, i).join("/");
    if (joinedDash && joinedDash !== "home") candidates.add(joinedDash);
    if (joinedSlash && joinedSlash !== "home") candidates.add(joinedSlash);
  }
  // Trailing segments: `/more/bus-information` → `bus-information`
  for (let i = 0; i < parts.length; i += 1) {
    const joinedDash = parts.slice(i).join("-");
    const joinedSlash = parts.slice(i).join("/");
    if (joinedDash && joinedDash !== "home") candidates.add(joinedDash);
    if (joinedSlash && joinedSlash !== "home") candidates.add(joinedSlash);
  }

  const ranked = [...candidates].sort((a, b) => b.length - a.length);
  for (const key of ranked) {
    const normalized = normalizeModuleHelpKey(key).replace(/\//g, "-");
    const content = resolve(normalized) ?? resolve(key);
    if (content) return content.id;
  }

  if (!bare || bare === "home" || pathname === "/" || pathname === "") {
    const home = resolve("home");
    if (home) return home.id;
  }
  return null;
}
