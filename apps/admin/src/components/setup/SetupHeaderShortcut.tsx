import { Link } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { useSetupChecklist } from "@/lib/institute-setup-checklist";

/**
 * Compact header shortcut to /setup — replaces the offline "Synced" chip.
 */
export function SetupHeaderShortcut() {
  const { state } = useSetupChecklist();
  const next = state.steps.find((step) => step.state === "todo");

  let hint = "…";
  if (state.status === "needs_institute") {
    hint = "Select institute";
  } else if (state.status === "error") {
    hint = "Retry";
  } else if (state.status === "ready") {
    hint = state.coreComplete
      ? "Done"
      : state.coreTotal > 0
        ? `${state.coreDone}/${state.coreTotal}`
        : "Open";
  }

  const title =
    state.status === "ready" && next && !state.coreComplete
      ? `Setup — next: ${next.title}`
      : state.coreComplete
        ? "Institute setup complete — open checklist"
        : "Open institute setup checklist";

  return (
    <Link
      to="/setup"
      title={title}
      className="inline-flex max-w-[12rem] items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 text-[11px] transition-colors hover:bg-surface-hover hover:border-primary/30"
    >
      <ListChecks
        className={`size-3.5 shrink-0 ${
          state.coreComplete ? "text-emerald-600" : "text-primary"
        }`}
        aria-hidden
      />
      <span className="font-medium text-foreground">Setup</span>
      <span
        className={`truncate tabular-nums ${
          state.coreComplete
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-muted-foreground"
        }`}
      >
        {hint}
      </span>
    </Link>
  );
}
