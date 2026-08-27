/**
 * Minimal API-mode institute indicator + switcher for Admin chrome.
 * Hidden entirely in demo mode.
 */
import { Building2, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { useInstituteContext } from "@/lib/institutes";
import { cn } from "@lumenx/ui";

export function ApiInstituteSwitcher({ className }: { className?: string }) {
  const ctx = useInstituteContext();
  const { applyApiActiveInstitute, clearApiActiveInstitutePresentation } = useAuth();
  const [open, setOpen] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  // Sync AuthUser institute presentation with validated context (never demo fallback).
  useEffect(() => {
    if (!ctx.isApiMode) return;

    if (ctx.status === "ready" && ctx.activeInstitute) {
      applyApiActiveInstitute(ctx.activeInstitute.id, ctx.activeInstitute.name);
      return;
    }

    if (
      ctx.status === "error" ||
      ctx.status === "forbidden" ||
      ctx.status === "empty" ||
      ctx.status === "needs_selection"
    ) {
      clearApiActiveInstitutePresentation();
    }
  }, [
    ctx.isApiMode,
    ctx.status,
    ctx.activeInstitute,
    applyApiActiveInstitute,
    clearApiActiveInstitutePresentation,
  ]);

  if (!ctx.isApiMode) return null;

  const onSelect = async (instituteId: string) => {
    setSelectError(null);
    try {
      const chosen = await ctx.selectInstitute(instituteId);
      applyApiActiveInstitute(chosen.id, chosen.name);
      setOpen(false);
    } catch (err) {
      setSelectError(err instanceof Error ? err.message : "Selection failed");
    }
  };

  if (ctx.status === "loading") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-[10px] text-muted-foreground",
          className,
        )}
        aria-live="polite"
      >
        <Building2 className="size-3 shrink-0 opacity-60" aria-hidden />
        <span>Loading institute…</span>
      </div>
    );
  }

  if (ctx.status === "empty") {
    return (
      <div
        className={cn("text-[10px] text-muted-foreground", className)}
        title="No active institute membership"
      >
        No institute access
      </div>
    );
  }

  if (ctx.status === "forbidden") {
    return (
      <div
        className={cn("text-[10px] text-amber-700 dark:text-amber-400", className)}
        title={ctx.errorMessage ?? "Forbidden"}
      >
        Institute access denied
      </div>
    );
  }

  if (ctx.status === "error") {
    return (
      <div
        className={cn("text-[10px] text-destructive", className)}
        title={ctx.errorMessage ?? "Error"}
      >
        Institute unavailable
      </div>
    );
  }

  const needsSelection = ctx.status === "needs_selection";
  const canSwitch = ctx.institutes.length > 1;

  return (
    <div className={cn("relative min-w-0", className)}>
      <button
        type="button"
        disabled={!canSwitch && !needsSelection}
        onClick={() => {
          if (canSwitch || needsSelection) setOpen((v) => !v);
        }}
        className={cn(
          "flex max-w-full items-center gap-1 truncate text-left text-[10px] uppercase tracking-[0.12em]",
          needsSelection
            ? "font-semibold text-amber-700 dark:text-amber-400"
            : "text-muted-foreground",
          (canSwitch || needsSelection) && "hover:text-foreground",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
        title={
          needsSelection
            ? "Select an institute to continue"
            : (ctx.displayLabel ?? undefined)
        }
      >
        <Building2 className="size-3 shrink-0 opacity-70" aria-hidden />
        <span className="truncate normal-case tracking-normal">
          {needsSelection
            ? "Select institute…"
            : (ctx.displayLabel ?? "Institute")}
        </span>
        {(canSwitch || needsSelection) && (
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        )}
      </button>

      {open && (canSwitch || needsSelection) && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] max-w-[18rem] rounded-md border border-border bg-popover py-1 shadow-md"
        >
          {ctx.institutes.map((inst) => (
            <button
              key={inst.id}
              type="button"
              role="option"
              aria-selected={inst.id === ctx.activeInstituteId}
              className={cn(
                "flex w-full flex-col px-3 py-2 text-left text-xs hover:bg-muted",
                inst.id === ctx.activeInstituteId && "bg-muted/60",
              )}
              onClick={() => void onSelect(inst.id)}
            >
              <span className="font-medium text-foreground">{inst.name}</span>
              <span className="text-[10px] text-muted-foreground">{inst.code}</span>
            </button>
          ))}
          {selectError && (
            <div className="border-t border-border px-3 py-2 text-[10px] text-destructive">
              {selectError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
