import { TEMPLATE_VARIABLES } from "@/lib/template-management/categories";
import { Button } from "@lumenx/ui-admin";
import { Braces } from "lucide-react";

export function VariablePicker({ onInsert }: { onInsert: (token: string) => void }) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-3">
      <div className="flex items-center gap-2 mb-3">
        <Braces className="size-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground">Dynamic variables</span>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto lx-sidebar-scroll">
        {TEMPLATE_VARIABLES.map((v) => (
          <Button
            key={v.key}
            size="sm"
            type="button"
            onClick={() => onInsert(`{{${v.key}}}`)}
            title={`Sample: ${v.sample}`}
          >
            {v.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
