import { useSyncExternalStore } from "react";
import { useRouterState } from "@tanstack/react-router";
import { ModuleHelpControl, resolveModuleHelpKeyFromPath } from "@lumenx/module-help";
import { getModuleHelp } from "@/lib/module-help/registry";

function subscribeNoop() {
  return () => {};
}

function useIsClient() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
}

/** Chrome-level help for the current Admissions route. */
export function ModuleHelpRouteControl() {
  const isClient = useIsClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!isClient) return null;
  const helpKey = resolveModuleHelpKeyFromPath(pathname, getModuleHelp);
  if (!helpKey) return null;
  return <ModuleHelpControl helpKey={helpKey} resolve={getModuleHelp} />;
}
