import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

const inputBase =
  "w-full px-2.5 sm:px-3 rounded-md bg-background text-foreground border border-border text-xs sm:text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors appearance-none";
const inputSizes = {
  md: "h-9 sm:h-10",
  compact: "h-8 text-xs sm:h-9",
} as const;
type FieldSize = keyof typeof inputSizes;

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectGroup = {
  label?: string;
  options: SelectOption[];
};

function optionLabel(child: ReactElement): string {
  const props = child.props as { children?: ReactNode; label?: string; value?: string | number };
  if (typeof props.children === "string" || typeof props.children === "number") {
    return String(props.children);
  }
  if (props.label != null) return String(props.label);
  if (props.value != null) return String(props.value);
  return "";
}

function parseSelectChildren(children: ReactNode): SelectGroup[] {
  const groups: SelectGroup[] = [];
  let loose: SelectOption[] = [];

  const flushLoose = () => {
    if (loose.length) {
      groups.push({ options: loose });
      loose = [];
    }
  };

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const typeName = typeof child.type === "string" ? child.type : "";

    if (typeName === "optgroup") {
      flushLoose();
      const props = child.props as { label?: string; children?: ReactNode; disabled?: boolean };
      const options: SelectOption[] = [];
      Children.forEach(props.children, (opt) => {
        if (!isValidElement(opt)) return;
        if ((typeof opt.type === "string" ? opt.type : "") !== "option") return;
        const op = opt.props as { value?: string | number; children?: ReactNode; disabled?: boolean; label?: string };
        options.push({
          value: op.value != null ? String(op.value) : optionLabel(opt),
          label: optionLabel(opt),
          disabled: Boolean(props.disabled || op.disabled),
        });
      });
      groups.push({ label: props.label, options });
      return;
    }

    if (typeName === "option") {
      const op = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean; label?: string };
      loose.push({
        value: op.value != null ? String(op.value) : optionLabel(child),
        label: optionLabel(child),
        disabled: Boolean(op.disabled),
      });
    }
  });

  flushLoose();
  return groups;
}

function flattenOptions(groups: SelectGroup[]): SelectOption[] {
  return groups.flatMap((g) => g.options);
}

export function ThemedSelect({
  children,
  fieldSize = "compact",
  className = "",
  value,
  defaultValue,
  onChange,
  onBlur,
  disabled,
  id,
  name,
  required,
  multiple,
  size,
  onClick,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { fieldSize?: FieldSize }) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(() =>
    defaultValue != null ? String(defaultValue) : "",
  );
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const groups = useMemo(() => parseSelectChildren(children), [children]);
  const options = useMemo(() => flattenOptions(groups), [groups]);
  const controlled = value !== undefined;
  const current = controlled ? String(value ?? "") : uncontrolled;
  const selected = options.find((o) => o.value === current);
  const displayLabel = selected?.label ?? "";

  // Native multi-select / listbox — OS chrome is unavoidable; keep native.
  if (multiple || (typeof size === "number" && size > 1)) {
    return (
      <select
        {...rest}
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        multiple={multiple}
        size={size}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onBlur={onBlur}
        className={`${inputBase} ${inputSizes[fieldSize]} ${className}`}
      >
        {children}
      </select>
    );
  }

  const commit = (next: string) => {
    if (!controlled) setUncontrolled(next);
    if (onChange) {
      const synthetic = {
        target: { value: next, name: name ?? "" },
        currentTarget: { value: next, name: name ?? "" },
      } as ChangeEvent<HTMLSelectElement>;
      onChange(synthetic);
    }
    setOpen(false);
  };

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 4;
    const maxH = Math.min(280, window.innerHeight - 16);
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const placeAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
    const height = Math.min(maxH, placeAbove ? spaceAbove : spaceBelow);
    setMenuStyle({
      position: "fixed",
      left: Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 160) - 8)),
      width: Math.max(rect.width, 140),
      maxHeight: Math.max(120, height),
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
    const onPointer = (e: MouseEvent | PointerEvent) => {
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

  return (
    <div className={`relative min-w-0 ${className.includes("w-") ? "" : "w-full"}`.trim()}>
      {name ? <input type="hidden" name={name} value={current} required={required} /> : null}
      <button
        {...(rest as object)}
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onBlur={onBlur as never}
        onClick={(e) => {
          onClick?.(e as never);
          if (disabled) return;
          setOpen((v) => !v);
        }}
        className={`${inputBase} ${inputSizes[fieldSize]} relative flex w-full min-w-0 items-center justify-between gap-2 pr-8 text-left ${className}`}
      >
        <span className={`min-w-0 truncate ${!displayLabel ? "text-muted-foreground" : ""}`}>
          {displayLabel || "Select…"}
        </span>
        <ChevronDown
          className={`pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={listboxId}
              role="listbox"
              aria-labelledby={id}
              style={menuStyle}
              className="lx-themed-menu overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-pop"
            >
              {groups.map((group, gi) => (
                <div key={group.label ?? `g-${gi}`} className="py-1">
                  {group.label ? (
                    <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </div>
                  ) : null}
                  {group.options.map((opt) => {
                    const active = opt.value === current;
                    return (
                      <button
                        key={`${gi}-${opt.value}`}
                        type="button"
                        role="option"
                        aria-selected={active}
                        disabled={opt.disabled}
                        onClick={() => commit(opt.value)}
                        className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-xs sm:text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                          active
                            ? "bg-primary/12 font-medium text-primary"
                            : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                        {active ? <Check className="size-3.5 shrink-0 text-primary" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
              {options.length === 0 ? (
                <div className="px-2.5 py-2 text-xs text-muted-foreground">No options</div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
