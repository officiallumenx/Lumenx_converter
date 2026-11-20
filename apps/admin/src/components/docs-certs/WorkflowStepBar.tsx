import { CheckCircle2, ChevronRight } from "lucide-react";

export function WorkflowStepBar({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <div
      className="flex items-center gap-0 overflow-x-auto lx-sidebar-scroll pb-1"
      role="list"
      aria-label="Generation steps"
    >
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center shrink-0" role="listitem">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : done
                    ? "text-emerald-600"
                    : "text-muted-foreground"
              }`}
            >
              <div
                className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? <CheckCircle2 className="size-3" /> : idx}
              </div>
              {label}
            </div>
            {i < steps.length - 1 ? (
              <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
