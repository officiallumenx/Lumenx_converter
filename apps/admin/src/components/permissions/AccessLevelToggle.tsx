import type { AccessPermission } from "@/lib/roles-access";

type Level = Exclude<AccessPermission, "none">;

/** Compact Full / Read segmented control for module access rows. */
export function AccessLevelToggle({
  value,
  onChange,
  ariaLabel,
}: {
  value: Level;
  onChange: (next: Level) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel ?? "Access level"}
      className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-xs"
    >
      {(
        [
          { id: "full", label: "Full" },
          { id: "read", label: "Read" },
        ] as const
      ).map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.id)}
            className={`h-6 min-w-[2.75rem] rounded-md border px-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              selected
                ? "border-border bg-muted/70 text-foreground shadow-xs"
                : "border-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
