import { X } from "lucide-react";
import { Button } from "@lumenx/ui-admin";

/**
 * Class chips — unselected: white; selected: blue with X to remove.
 * Select all / Clear at top-right of the chip card.
 */
export function FeesClassChecklist({
  classKeys,
  selected,
  onChange,
}: {
  classKeys: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const selectedSet = new Set(selected);
  const allSelected = classKeys.length > 0 && classKeys.every((ck) => selectedSet.has(ck));

  const select = (ck: string) => {
    if (selectedSet.has(ck)) return;
    onChange([...selected, ck]);
  };

  const remove = (ck: string) => {
    onChange(selected.filter((x) => x !== ck));
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-border/70 bg-background/60">
        <p className="text-xs text-muted-foreground min-w-0">
          <span className="font-medium text-foreground">{selected.length}</span> of{" "}
          {classKeys.length} selected
          {selected.length === 0 ? (
            <span className="text-destructive"> · pick at least one</span>
          ) : null}
        </p>
        <div className="flex shrink-0 gap-1.5">
          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange([...classKeys]);
            }}
            disabled={allSelected}
          >
            Select all
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChange([]);
            }}
            disabled={selected.length === 0}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-2.5">
        {classKeys.map((ck) => {
          const on = selectedSet.has(ck);
          if (on) {
            return (
              <div
                key={ck}
                className="inline-flex items-center gap-0.5 rounded-md border border-primary/40 bg-primary text-primary-foreground pl-2.5 pr-0.5 py-0.5 text-[11px] font-medium shadow-sm"
              >
                <span className="py-0.5">{ck}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    remove(ck);
                  }}
                  aria-label={`Remove ${ck}`}
                  title="Remove"
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded hover:bg-primary-foreground/20"
                >
                  <X className="size-3.5" strokeWidth={2.5} />
                </button>
              </div>
            );
          }
          return (
            <button
              key={ck}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                select(ck);
              }}
              aria-pressed={false}
              className="rounded-md border border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground px-2.5 py-1 text-[11px] font-medium transition-colors"
            >
              {ck}
            </button>
          );
        })}
      </div>
    </div>
  );
}
