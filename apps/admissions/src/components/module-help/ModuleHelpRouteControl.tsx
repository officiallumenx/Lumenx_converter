import { useRouterState } from "@tanstack/react-router";
import { ModuleHelpControl, resolveModuleHelpKeyFromPath } from "@lumenx/module-help";
import { getModuleHelp } from "@/lib/module-help/registry";

/** Chrome-level help for the current Admissions route. */
export function ModuleHelpRouteControl() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const helpKey = resolveModuleHelpKeyFromPath(pathname, getModuleHelp);
  if (!helpKey) return null;
  return <ModuleHelpControl helpKey={helpKey} resolve={getModuleHelp} />;
}
