import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type FocusEvent,
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

/** Auto-insert dashes while typing digits → YYYY-MM-DD. */
export function maskIsoDateTyping(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

/** Accept ISO or common typed dates (YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY). */
export function parseFlexibleDateInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const toValidIso = (year: number, month: number, day: number): string | null => {
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const parsed = parseIsoDateLocal(iso);
    if (!parsed) return null;
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() + 1 !== month ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return iso;
  };

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    return toValidIso(y!, m!, d!);
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("/").map(Number);
    return toValidIso(y!, m!, d!);
  }
  const slash = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (!slash) return null;
  return toValidIso(Number(slash[3]), Number(slash[2]), Number(slash[1]));
}

function defaultMonth(current: string, minIso?: string, maxIso?: string): Date {
  const parsed = parseIsoDateLocal(current);
  if (parsed) return parsed;
  // Empty field → open on today's month/year (exams, schedules, etc.).
  const fallback = new Date();
  fallback.setDate(1);
  const { startMonth, endMonth } = resolveCalendarMonthBounds(minIso, maxIso);
  if (fallback < startMonth) return startMonth;
  if (fallback > endMonth) return endMonth;
  return fallback;
}

export { MonthCalendar } from "@lumenx/ui";

/**
 * One date field: type YYYY-MM-DD (dashes auto-inserted) or open the calendar icon.
 */
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
  placeholder = "YYYY-MM-DD",
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { fieldSize?: FieldSize }) {
  const autoId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(() =>
    defaultValue != null ? String(defaultValue) : "",
  );
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [textDraft, setTextDraft] = useState("");

  const controlled = value !== undefined;
  const current = controlled ? String(value ?? "") : uncontrolled;
  const minIso = typeof min === "string" ? min : undefined;
  const maxIso = typeof max === "string" ? max : undefined;
  const [month, setMonth] = useState<Date>(() => defaultMonth(current, minIso, maxIso));

  useEffect(() => {
    if (!focused) setTextDraft(current);
  }, [current, focused]);

  useEffect(() => {
    if (!open) return;
    setMonth(defaultMonth(current, minIso, maxIso));
  }, [open, current, minIso, maxIso]);

  const emit = (iso: string) => {
    if (!controlled) setUncontrolled(iso);
    setTextDraft(iso);
    if (onChange) {
      const synthetic = {
        target: { value: iso, name: name ?? "" },
        currentTarget: { value: iso, name: name ?? "" },
      } as ChangeEvent<HTMLInputElement>;
      onChange(synthetic);
    }
  };

  const commit = (iso: string, closeCalendar: boolean) => {
    if (iso && minIso && iso < minIso) return;
    if (iso && maxIso && iso > maxIso) return;
    emit(iso);
    if (closeCalendar) setOpen(false);
  };

  const applyTypedValue = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      emit("");
      return;
    }
    const iso = parseFlexibleDateInput(trimmed);
    if (iso) {
      commit(iso, false);
      return;
    }
    setTextDraft(current);
  };

  const updatePosition = () => {
    const anchor = rootRef.current;
    const menu = menuRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const margin = 12;
    const panelW = Math.min(300, window.innerWidth - margin * 2);
    const panelH = menu?.offsetHeight || 340;
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
    const spaceAbove = rect.top - gap - margin;

    let top: number;
    if (spaceBelow >= panelH || spaceBelow >= 220) {
      top = rect.bottom + gap;
    } else if (spaceAbove >= panelH) {
      top = rect.top - gap - panelH;
    } else {
      // Not enough room either side (typical modal) — center in the viewport.
      top = Math.max(margin, (window.innerHeight - panelH) / 2);
    }

    const maxTop = Math.max(margin, window.innerHeight - panelH - margin);
    top = Math.max(margin, Math.min(top, maxTop));
    const left = Math.max(
      margin,
      Math.min(rect.left, window.innerWidth - panelW - margin),
    );

    setMenuStyle({
      position: "fixed",
      top,
      left,
      width: panelW,
      zIndex: 10050,
      maxHeight: window.innerHeight - margin * 2,
      overflowY: "auto",
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = window.requestAnimationFrame(() => updatePosition());
    return () => window.cancelAnimationFrame(id);
  }, [open, month]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      const path = e.composedPath();
      for (const node of path) {
        if (!(node instanceof Node)) continue;
        if (rootRef.current?.contains(node) || menuRef.current?.contains(node)) {
          return;
        }
      }
      // Native <select> option lists are OS-rendered outside the menu DOM. Closing
      // on that pointerdown would discard month/year changes (looks "not editable").
      const active = document.activeElement;
      if (
        active instanceof HTMLSelectElement &&
        menuRef.current?.contains(active)
      ) {
        return;
      }
      // Defer: option selection may focus/blur asynchronously across browsers.
      window.requestAnimationFrame(() => {
        if (!menuRef.current) return;
        const still = document.activeElement;
        if (
          still instanceof HTMLSelectElement &&
          menuRef.current.contains(still)
        ) {
          return;
        }
        setOpen(false);
      });
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

  const onTextKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyTypedValue(textDraft);
      inputRef.current?.blur();
    }
  };

  const onTextFocus = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    // Edit as ISO with auto-dashes, not the pretty display string.
    setTextDraft(current);
    rest.onFocus?.(event);
  };

  const onTextBlur = (event: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    applyTypedValue(event.target.value);
    onBlur?.(event);
  };

  const shownValue = focused ? textDraft : current ? formatDisplay(current) : textDraft;

  return (
    <div ref={rootRef} className="relative min-w-0 w-full">
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}
      <div className="relative min-w-0 w-full">
        <input
          {...rest}
          ref={inputRef}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          id={id ?? autoId}
          disabled={disabled}
          required={required && !name}
          placeholder={placeholder}
          value={shownValue}
          aria-label={rest["aria-label"] ?? "Date"}
          onChange={(event) => {
            setFocused(true);
            const masked = maskIsoDateTyping(event.target.value);
            setTextDraft(masked);
            // Commit as soon as a full valid YYYY-MM-DD is typed.
            if (/^\d{4}-\d{2}-\d{2}$/.test(masked)) {
              const iso = parseFlexibleDateInput(masked);
              if (iso) commit(iso, false);
            }
          }}
          onFocus={onTextFocus}
          onBlur={onTextBlur}
          onKeyDown={onTextKeyDown}
          className={`${inputBase} ${inputSizes[fieldSize]} min-w-0 pr-10 tabular-nums ${className}`}
        />
        <button
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Open calendar"
          title="Open calendar"
          tabIndex={-1}
          onMouseDown={(event) => {
            // Keep input focus / avoid blur-before-click race.
            event.preventDefault();
          }}
          onClick={() => {
            if (disabled) return;
            setOpen((v) => !v);
          }}
          className="absolute right-1 top-1/2 z-[1] flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-primary hover:bg-muted touch-manipulation"
        >
          <CalendarDays className="size-3.5" aria-hidden />
        </button>
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="dialog"
              aria-label="Choose date"
              style={menuStyle}
              className="lx-themed-menu rounded-xl border border-border bg-popover text-popover-foreground shadow-pop"
            >
              <MonthCalendar
                month={month}
                selectedIso={current || undefined}
                min={minIso}
                max={maxIso}
                onMonthChange={setMonth}
                onSelect={(iso) => commit(iso, true)}
              />
              {current ? (
                <div className="border-t border-border px-3 py-2">
                  <button
                    type="button"
                    className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => {
                      commit("", true);
                    }}
                  >
                    Clear date
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
