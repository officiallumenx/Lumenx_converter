import { useState } from "react";
import { ModuleHelpButton } from "./ModuleHelpButton";
import { ModuleHelpModal } from "./ModuleHelpModal";
import type { ModuleHelpResolver } from "./types";

export function ModuleHelpControl({
  helpKey,
  resolve,
}: {
  helpKey: string;
  resolve: ModuleHelpResolver;
}) {
  const content = resolve(helpKey);
  const [open, setOpen] = useState(false);
  if (!content) return null;

  return (
    <>
      <ModuleHelpButton title={content.title} onClick={() => setOpen(true)} />
      <ModuleHelpModal open={open} onClose={() => setOpen(false)} content={content} />
    </>
  );
}
