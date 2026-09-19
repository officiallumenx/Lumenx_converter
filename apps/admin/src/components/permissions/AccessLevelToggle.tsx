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
      className="inline-flex shrink-0 rounded-md border border-border bg-muted/40 p-0.5"
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
            className={`h-6 min-w-[2.75rem] rounded px-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
