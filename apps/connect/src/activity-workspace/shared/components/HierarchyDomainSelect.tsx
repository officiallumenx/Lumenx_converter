import { cn } from "@lumenx/ui";
import { domainLabel, type ActivityDomain } from "@/lib/activity/hierarchy";

const SHORT: Record<ActivityDomain, string> = {
  sports: "Sports",
  eca: "ECA",
};

/** Sports vs ECA — large chips instead of a dropdown to cut a tap. */
export function HierarchyDomainSelect({
  value,
  onChange,
  hideLabel,
}: {
  value: ActivityDomain;
  onChange: (domain: ActivityDomain) => void;
  /** When parent already shows a step label (e.g. "1 · Sports or ECA"). */
  hideLabel?: boolean;
}) {
  return (
    <div>
      {hideLabel ? null : (
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Area</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {(["sports", "eca"] as const).map((d) => {
          const active = value === d;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              aria-pressed={active}
              title={domainLabel(d)}
              className={cn(
                "activity-list-row flex flex-col items-start justify-center rounded-xl border px-3 py-2 text-left shadow-soft",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:border-primary/30",
              )}
            >
              <span className="text-sm font-medium">{SHORT[d]}</span>
              <span
                className={cn(
                  "mt-0.5 text-[10px] leading-tight",
                  active ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {d === "sports" ? "Teams" : "Groups"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
