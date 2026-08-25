import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronRight, Filter, X } from "lucide-react";
import { MonthCalendar } from "./themed-date-input";

export type CascadingFilterOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type CascadingFilterGroup = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** list (default) | date calendar | free text */
  kind?: "list" | "date" | "text";
  options?: CascadingFilterOption[];
  /** Values treated as “not filtering” for the active badge (default: all, empty). */
  clearValues?: string[];
  placeholder?: string;
  min?: string;
  max?: string;
};

function formatDateLabel(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function isActiveValue(group: CascadingFilterGroup): boolean {
  const kind = group.kind ?? "list";
  if (kind === "date" || kind === "text") {
    return Boolean(group.value?.trim());
  }
  const clears = group.clearValues ?? ["all", ""];
  return !clears.includes(group.value);
}

function selectedLabel(group: CascadingFilterGroup): string | null {
  if (!isActiveValue(group)) return null;
  const kind = group.kind ?? "list";
  if (kind === "date") return formatDateLabel(group.value);
  if (kind === "text") return group.value;
  return group.options?.find((o) => o.value === group.value)?.label ?? group.value;
}

function clearTarget(group: CascadingFilterGroup): string {
  if (group.clearValues && group.clearValues.length > 0) return group.clearValues[0]!;
  if ((group.kind ?? "list") === "list") return "all";
  return "";
}

/**
 * One compact “Filters” control for every filter (class, section, date, teacher, status…).
 * Keep Search outside — only filter groups belong here.
 */
export function CascadingFiltersMenu({
  groups,
  label = "Filters",
  className = "",
  disabled,
}: {
  groups: CascadingFilterGroup[];
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const autoId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties>({});
  const [isNarrow, setIsNarrow] = useState(false);

  const activeCount = useMemo(() => groups.filter(isActiveValue).length, [groups]);
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;
  const flyoutWide = activeGroup?.kind === "date";

  useEffect(() => {
    if (!open) return;
    if (!activeGroupId || !groups.some((g) => g.id === activeGroupId)) {
      setActiveGroupId(groups[0]?.id ?? null);
    }
  }, [open, activeGroupId, groups]);

  const updateLayout = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 6;
    const panelW = 180;
    const flyoutW = flyoutWide ? 288 : 220;
    const narrow = window.innerWidth < 640;
    setIsNarrow(narrow);

    const spaceRight = window.innerWidth - rect.left - 8;
    const placeLeft = !narrow && spaceRight < panelW + flyoutW + 12;

    const top = Math.min(rect.bottom + gap, window.innerHeight - 24);
    const maxH = Math.max(160, window.innerHeight - top - 12);

    if (narrow) {
      setPanelStyle({
        position: "fixed",
        left: 8,
        right: 8,
        top,
        maxHeight: maxH,
        zIndex: 10050,
      });
      setFlyoutStyle({});
      return;
    }

    const left = placeLeft
      ? Math.max(8, rect.right - panelW)
      : Math.min(rect.left, window.innerWidth - panelW - 8);

    setPanelStyle({
      position: "fixed",
      left,
      top,
      width: panelW,
      maxHeight: maxH,
      zIndex: 10050,
    });

    const flyLeft = placeLeft ? left - flyoutW - 4 : left + panelW + 4;
    setFlyoutStyle({
      position: "fixed",
      left: Math.max(8, Math.min(flyLeft, window.innerWidth - flyoutW - 8)),
      top,
      width: flyoutW,
      maxHeight: maxH,
      zIndex: 10051,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updateLayout();
  }, [open, activeGroupId, flyoutWide]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        panelRef.current?.contains(t) ||
        flyoutRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    const onReposition = () => updateLayout();
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  const clearAll = () => {
    for (const g of groups) {
      const next = clearTarget(g);
      if (g.value !== next) g.onChange(next);
    }
  };

  const summaryChips = groups
    .map((g) => {
      const text = selectedLabel(g);
      if (!text) return null;
      return {
        id: g.id,
        label: g.label,
        text,
        onClear: () => g.onChange(clearTarget(g)),
      };
    })
    .filter(Boolean) as { id: string; label: string; text: string; onClear: () => void }[];

  const renderGroupBody = (group: CascadingFilterGroup) => (
    <GroupBody group={group} />
  );

  let menu: ReactNode = null;
  if (open && typeof document !== "undefined") {
    menu = createPortal(
      <>
        <div
          ref={panelRef}
          role="menu"
          aria-label={label}
          style={panelStyle}
          className="lx-themed-menu flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] font-medium text-primary hover:underline"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {groups.map((group) => {
              const active = group.id === activeGroupId;
              const sel = selectedLabel(group);
              return (
                <div key={group.id}>
                  <button
                    type="button"
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={active}
                    onMouseEnter={() => !isNarrow && setActiveGroupId(group.id)}
                    onFocus={() => setActiveGroupId(group.id)}
                    onClick={() => setActiveGroupId(group.id)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? "bg-primary/12 text-primary"
                        : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{group.label}</span>
                    {sel ? (
                      <span className="max-w-[5.5rem] truncate text-[10px] text-muted-foreground">
                        {sel}
                      </span>
                    ) : null}
                    <ChevronRight className="size-3.5 shrink-0 opacity-60" aria-hidden />
                  </button>

                  {isNarrow && active && activeGroup ? (
                    <div className="border-y border-border bg-background/80 py-1">
                      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {activeGroup.label}
                      </div>
                      {renderGroupBody(activeGroup)}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {!isNarrow && activeGroup ? (
          <div
            ref={flyoutRef}
            role="menu"
            aria-label={activeGroup.label}
            style={flyoutStyle}
            className="lx-themed-menu flex flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop"
            onMouseEnter={() => setActiveGroupId(activeGroup.id)}
          >
            <div className="border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {activeGroup.label}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-1">{renderGroupBody(activeGroup)}</div>
          </div>
        ) : null}
      </>,
      document.body,
    );
  }

  return (
    <div className={`flex min-w-0 flex-wrap items-center gap-1.5 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={autoId}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50 sm:h-9 ${
          open || activeCount > 0 ? "border-primary/40 bg-primary/5 text-primary" : ""
        }`}
      >
        <Filter className="size-3.5 shrink-0" aria-hidden />
        <span>{label}</span>
        {activeCount > 0 ? (
          <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </button>

      {summaryChips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onClear}
          className="inline-flex max-w-[10rem] items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-[10px] text-foreground hover:bg-muted"
          title={`Clear ${chip.label}`}
        >
          <span className="truncate">
            <span className="text-muted-foreground">{chip.label}: </span>
            {chip.text}
          </span>
          <X className="size-3 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      ))}

      {menu}
    </div>
  );
}

function GroupBody({ group }: { group: CascadingFilterGroup }) {
  const kind = group.kind ?? "list";
  const [month, setMonth] = useState(() => {
    if (group.kind === "date" && /^\d{4}-\d{2}-\d{2}$/.test(group.value)) {
      return new Date(`${group.value}T12:00:00`);
    }
    return new Date();
  });

  useEffect(() => {
    if (kind !== "date") return;
    if (/^\d{4}-\d{2}-\d{2}$/.test(group.value)) {
      setMonth(new Date(`${group.value}T12:00:00`));
    }
  }, [kind, group.value]);

  if (kind === "date") {
    return (
      <MonthCalendar
        month={month}
        selectedIso={group.value || undefined}
        min={group.min}
        max={group.max}
        onMonthChange={setMonth}
        onSelect={(iso) => group.onChange(iso)}
      />
    );
  }

  if (kind === "text") {
    return (
      <div className="p-2">
        <input
          type="text"
          value={group.value}
          placeholder={group.placeholder ?? "Enter…"}
          onChange={(e) => group.onChange(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
    );
  }

  const options = group.options ?? [];
  return (
    <>
      {options.map((opt) => {
        const selected = opt.value === group.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="menuitemradio"
            aria-checked={selected}
            disabled={opt.disabled}
            onClick={() => group.onChange(opt.value)}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-40 ${
              selected
                ? "bg-primary/12 font-medium text-primary"
                : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            <span className="min-w-0 flex-1 truncate">{opt.label}</span>
            {selected ? <Check className="size-3.5 shrink-0 text-primary" aria-hidden /> : null}
          </button>
        );
      })}
      {options.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground">No options</div>
      ) : null}
    </>
  );
}
