import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays } from "lucide-react";
import {
  MonthCalendar,
  parseIsoDateLocal,
  resolveCalendarMonthBounds,
} from "@lumenx/ui";

const inputBase =
  "w-full px-2.5 sm:px-3 rounded-md bg-background text-foreground border border-border text-xs sm:text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors appearance-none";
const inputSizes = {
  md: "h-9 sm:h-10",
  compact: "h-8 text-xs sm:h-9",
} as const;
type FieldSize = keyof typeof inputSizes;

function formatDisplay(iso: string): string {
  const d = parseIsoDateLocal(iso);
  if (!d) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export { MonthCalendar } from "@lumenx/ui";

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
  const minIso = typeof min === "string" ? min : undefined;
  const maxIso = typeof max === "string" ? max : undefined;
  const [month, setMonth] = useState<Date>(() => {
    const parsed = parseIsoDateLocal(current);
    if (parsed) return parsed;
    const { endMonth } = resolveCalendarMonthBounds(minIso, maxIso);
    return maxIso ? parseIsoDateLocal(maxIso) ?? endMonth : new Date();
  });

  useEffect(() => {
    if (!open) return;
    const parsed = parseIsoDateLocal(current);
    if (parsed) {
      setMonth(parsed);
      return;
    }
    const { endMonth } = resolveCalendarMonthBounds(minIso, maxIso);
    setMonth(maxIso ? parseIsoDateLocal(maxIso) ?? endMonth : new Date());
  }, [open, current, minIso, maxIso]);

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
    const panelH = 360;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const placeAbove = spaceBelow < panelH && rect.top > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
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
        className={`${inputBase} ${inputSizes[fieldSize]} relative flex w-full min-w-0 items-center gap-2 text-left touch-manipulation ${className}`}
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
              className="lx-themed-menu max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-pop"
            >
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Calendar
              </div>
              <MonthCalendar
                month={month}
                selectedIso={current || undefined}
                min={minIso}
                max={maxIso}
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
