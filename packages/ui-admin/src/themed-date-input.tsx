import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

const inputBase =
  "w-full px-2.5 sm:px-3 rounded-md bg-background text-foreground border border-border text-xs sm:text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors appearance-none";
const inputSizes = {
  md: "h-9 sm:h-10",
  compact: "h-8 text-xs sm:h-9",
} as const;
type FieldSize = keyof typeof inputSizes;

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIso(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDisplay(iso: string): string {
  const d = parseIso(iso);
  if (!d) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function MonthCalendar({
  month,
  selectedIso,
  min,
  max,
  onMonthChange,
  onSelect,
}: {
  month: Date;
  selectedIso?: string;
  min?: string;
  max?: string;
  onMonthChange: (d: Date) => void;
  onSelect: (iso: string) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const todayIso = toIsoDate(new Date());

  const cells = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const total = Math.ceil((lead + daysInMonth) / 7) * 7;
    const list: ({ iso: string; day: number } | null)[] = [];
    for (let i = 0; i < total; i++) {
      const dayNum = i - lead + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        list.push(null);
        continue;
      }
      list.push({
        day: dayNum,
        iso: toIsoDate(new Date(year, monthIndex, dayNum)),
      });
    }
    return list;
  }, [year, monthIndex]);

  const label = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="w-[272px] select-none p-3">
      <div className="mb-3 flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1 text-center text-sm font-semibold tracking-tight text-foreground">
          {label}
        </div>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="flex h-7 items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`e-${i}`} className="size-8" aria-hidden />;
          const isSelected = cell.iso === selectedIso;
          const isToday = cell.iso === todayIso;
          const disabled =
            (min != null && cell.iso < min) || (max != null && cell.iso > max);

          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell.iso)}
              className={[
                "flex size-8 items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                disabled ? "cursor-not-allowed text-muted-foreground/30" : "",
                !disabled && !isSelected ? "text-foreground hover:bg-muted" : "",
                !disabled && !isSelected && isToday
                  ? "font-semibold text-primary ring-1 ring-primary/35"
                  : "",
                isSelected ? "bg-primary font-semibold text-primary-foreground hover:bg-primary" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemedDateInput({
  fieldSize = "md",
  className = "",
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  id,
  name,
  required,
  min,
  max,
  placeholder = "Select date",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { fieldSize?: FieldSize }) {
  const autoId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(() =>
    defaultValue != null ? String(defaultValue) : "",
  );
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const controlled = value !== undefined;
  const current = controlled ? String(value ?? "") : uncontrolled;
  const [month, setMonth] = useState<Date>(() => parseIso(current) ?? new Date());

  useEffect(() => {
    if (!open) return;
    setMonth(parseIso(current) ?? new Date());
  }, [open, current]);

  const commit = (iso: string) => {
    if (!controlled) setUncontrolled(iso);
    if (onChange) {
      const synthetic = {
        target: { value: iso, name: name ?? "" },
        currentTarget: { value: iso, name: name ?? "" },
      } as ChangeEvent<HTMLInputElement>;
      onChange(synthetic);
    }
    setOpen(false);
  };

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const panelH = 320;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const placeAbove = spaceBelow < panelH && rect.top > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 288)),
      zIndex: 10050,
      ...(placeAbove
        ? { bottom: window.innerHeight - rect.top + gap, top: "auto" }
        : { top: rect.bottom + gap, bottom: "auto" }),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onReposition = () => updatePosition();
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

  const display = current ? formatDisplay(current) : "";

  return (
    <div className="relative min-w-0 w-full">
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}
      <button
        {...(rest as object)}
        ref={triggerRef}
        type="button"
        id={id ?? autoId}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onBlur={onBlur as never}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`${inputBase} ${inputSizes[fieldSize]} relative flex w-full min-w-0 items-center gap-2 text-left ${className}`}
      >
        <CalendarDays className="size-3.5 shrink-0 text-primary" aria-hidden />
        <span className={`min-w-0 truncate ${!display ? "text-muted-foreground" : ""}`}>
          {display || placeholder}
        </span>
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="dialog"
              aria-label="Choose date"
              style={menuStyle}
              className="lx-themed-menu overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop"
            >
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Calendar
              </div>
              <MonthCalendar
                month={month}
                selectedIso={current || undefined}
                min={typeof min === "string" ? min : undefined}
                max={typeof max === "string" ? max : undefined}
                onMonthChange={setMonth}
                onSelect={commit}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
