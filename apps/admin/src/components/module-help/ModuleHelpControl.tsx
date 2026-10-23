import { useState } from "react";
import { getModuleHelp } from "@/lib/module-help/registry";
import { ModuleHelpButton } from "./ModuleHelpButton";
import { ModuleHelpModal } from "./ModuleHelpModal";

export function ModuleHelpControl({ helpKey }: { helpKey: string }) {
  const content = getModuleHelp(helpKey);
  const [open, setOpen] = useState(false);
  if (!content) return null;

  return (
    <>
      <ModuleHelpButton title={content.title} onClick={() => setOpen(true)} />
      <ModuleHelpModal
        open={open}
        onClose={() => setOpen(false)}
        content={content}
      />
    </>
  );
}
