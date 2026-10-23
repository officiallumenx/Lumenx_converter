import { ModuleHelpControl as Base } from "@lumenx/module-help";
import { getModuleHelp } from "@/lib/module-help/registry";

export function ModuleHelpControl({ helpKey }: { helpKey: string }) {
  return <Base helpKey={helpKey} resolve={getModuleHelp} />;
}
