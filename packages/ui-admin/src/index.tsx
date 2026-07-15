import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type HTMLAttributes, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, X, BarChart3 } from "lucide-react";

const inputBase =
  "w-full px-3 rounded-md bg-background text-foreground border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors appearance-none";
const inputSizes = { md: "h-10", compact: "h-9 text-xs" } as const;
type FieldSize = keyof typeof inputSizes;

export function Card({ children, className = "", interactive = false, ...props }: { children: ReactNode; className?: string; interactive?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`lx-card bg-surface border border-border rounded-xl shadow-elevated relative z-0 overflow-hidden transition-[box-shadow,transform,border-color,background-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${interactive ? "hover:-translate-y-0.5 hover:shadow-pop cursor-pointer hover:border-border-strong" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, hint }: { title: string; action?: ReactNode; hint?: string }) {
  return (
    <div className="lx-card-header flex flex-wrap items-start justify-between gap-3 border-b border-border/60">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold tracking-tight text-foreground leading-snug">{title}</h3>
        {hint && <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{hint}</p>}
      </div>
      {action && <div className="shrink-0 max-w-full lx-btn-group">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = "", noPadding = false }: { children: ReactNode; className?: string; noPadding?: boolean }) {
  return (
    <div className={noPadding ? className : `lx-card-body ${className}`.trim()}>
      {children}
    </div>
  );
}

export function KpiGrid({ children, cols = 4, className = "" }: { children: ReactNode; cols?: 4 | 5 | 6; className?: string }) {
  const variant =
    cols === 5 ? " lx-kpi-grid--5" : cols === 6 ? " lx-kpi-grid--6" : "";
  return (
    <div className={`lx-kpi-grid${variant} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function PageStack({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`lx-page-stack ${className}`}>{children}</div>;
}

export function Kpi({ label, value, delta, tone = "neutral", footer, icon }: {
  label: string; value: string; delta?: string; tone?: "up" | "down" | "neutral"; footer?: ReactNode; icon?: ReactNode;
}) {
  const toneCls = tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "text-muted-foreground";
  const toneBg = tone === "up" ? "bg-success/10 border-success/20" : tone === "down" ? "bg-destructive/10 border-destructive/20" : "bg-muted border-border";
  return (
    <div className="lx-kpi-card group h-full w-full min-w-0">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent opacity-60 pointer-events-none" />
      <div className="lx-kpi-card__body">
        <div className="lx-kpi-card__head">
          <p className="lx-kpi-card__label">{label}</p>
          <div className="lx-kpi-card__icon" aria-hidden>
            {icon ?? <BarChart3 />}
          </div>
        </div>
        <p className="lx-kpi-card__value">{value}</p>
        {delta && (
          <span className={`lx-kpi-card__delta ${toneCls} ${toneBg}`}>
            {delta}
          </span>
        )}
        {footer && <div className="lx-kpi-card__footer">{footer}</div>}
      </div>
    </div>
  );
}

export function Pill({ children, tone = "neutral", pulse = false }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" | "neutral"; pulse?: boolean }) {
  const map = {
    success: "bg-success/10 text-success border-success/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-primary/10 text-primary border-primary/20",
    neutral: "bg-muted text-muted-foreground border-border",
  } as const;
  const dotMap = { success: "bg-success", warning: "bg-warning", danger: "bg-destructive", info: "bg-primary", neutral: "bg-muted-foreground" } as const;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border leading-none ${map[tone]}`}>
      {pulse && <span className={`size-1.5 rounded-full ${dotMap[tone]} pulse-ring`} />}
      {children}
    </span>
  );
}

export function Button({ children, variant = "default", size = "md", loading = false, className = "", disabled, ...rest }: {
  children: ReactNode;
  variant?: "default" | "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const map = {
    default: "bg-surface border border-border hover:bg-surface-hover text-foreground hover:border-border-strong",
    primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-glow border border-primary/40 hover:shadow-pop",
    ghost: "bg-transparent hover:bg-surface-hover text-muted-foreground hover:text-foreground border border-transparent",
    danger: "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20",
    outline: "bg-transparent border border-border hover:bg-surface text-foreground",
  } as const;
  const sizes = {
    sm: "h-8 min-h-8 px-2.5 text-[11px] [&_svg]:size-3.5",
    md: "h-9 min-h-9 px-3.5 text-xs [&_svg]:size-3.5",
    lg: "h-10 min-h-10 px-4 text-sm [&_svg]:size-4",
  } as const;
  const gapSizes = { sm: "gap-1", md: "gap-1.5", lg: "gap-2" } as const;
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${map[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <span className="lx-spinner shrink-0" aria-hidden />}
      <span className={`inline-flex items-center ${gapSizes[size]} transition-opacity duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${loading ? "opacity-75" : "opacity-100"}`}>
        {children}
      </span>
    </button>
  );
}

export function IconButton({ label, children, size = "md", className = "", ...rest }: {
  label: string;
  children: ReactNode;
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizes = { sm: "size-8 min-w-8 min-h-8", md: "size-9 min-w-9 min-h-9" } as const;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex items-center justify-center rounded-md border border-border bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ---------- Form primitives ---------- */

export function Field({ label, hint, children, required, className = "" }: { label: string; hint?: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <label className={`block ${className}`.trim()}>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground leading-none">
          {label}{required && <span className="text-destructive ml-0.5" aria-hidden>*</span>}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground text-right leading-snug">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function FormStack({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`lx-form-stack ${className}`.trim()}>{children}</div>;
}

export function FormGrid({ children, cols = 2, className = "" }: { children: ReactNode; cols?: 1 | 2; className?: string }) {
  return (
    <div className={`lx-form-grid ${cols === 2 ? "lx-form-grid--2" : ""} ${className}`.trim()}>
      {children}
    </div>
  );
}

export function TextInput({ fieldSize = "md", className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { fieldSize?: FieldSize }) {
  return (
    <input
      {...props}
      className={`${inputBase} ${inputSizes[fieldSize]} ${className}`}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full min-h-[88px] px-3 py-2 rounded-md bg-background border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors resize-y ${props.className ?? ""}`}
    />
  );
}

export function Select({ children, fieldSize = "md", className = "", ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { fieldSize?: FieldSize }) {
  return (
    <select
      {...rest}
      className={`${inputBase} ${inputSizes[fieldSize]} ${className}`}
    >
      {children}
    </select>
  );
}

export function SearchInput({ className = "", inputClassName = "", fieldSize = "compact", ...props }: InputHTMLAttributes<HTMLInputElement> & { inputClassName?: string; fieldSize?: FieldSize }) {
  return (
    <div className={`relative min-w-[200px] ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" aria-hidden />
      <input
        {...props}
        className={`${inputBase} ${inputSizes[fieldSize]} w-full pl-9 pr-3 ${inputClassName}`}
      />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}) {
  return (
    <div className={`lx-segmented-scroll ${className}`}>
    <div
      role="tablist"
      aria-label="Filter"
      className="flex flex-wrap sm:flex-wrap gap-1 p-1 bg-background rounded-md border border-border"
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={`px-3 h-8 min-h-8 shrink-0 rounded text-[11px] font-medium tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selected ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground hover:bg-surface-hover/80"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
    </div>
  );
}

export function PageToolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-4 sm:px-5 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end bg-background/30 ${className}`}>
      {children}
    </div>
  );
}

export function ToolbarGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-end gap-2 sm:gap-3 ${className}`}>{children}</div>;
}

export function ToolbarSpacer() {
  return <div className="flex-1 min-w-[1rem]" />;
}

export function ToolbarMeta({ children }: { children: ReactNode }) {
  return <div className="text-xs text-muted-foreground font-mono self-center shrink-0">{children}</div>;
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const bodyMaxHeight = footer ? "min(calc(75vh - 9.5rem), 22rem)" : "min(calc(75vh - 5.5rem), 26rem)";

  const sizeClass = { sm: "lx-modal-dialog--sm", md: "lx-modal-dialog--md", lg: "lx-modal-dialog--lg", xl: "lx-modal-dialog--xl" }[size];

  return createPortal(
    <div
      className="lx-modal-overlay lx-modal-backdrop sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lx-modal-title"
        aria-describedby={subtitle ? "lx-modal-subtitle" : undefined}
        className={`lx-modal-dialog lx-modal-panel ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 id="lx-modal-title" className="text-base font-semibold tracking-tight">{title}</h2>
            {subtitle && <p id="lx-modal-subtitle" className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="size-9 shrink-0 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        </div>

        <div
          className="lx-modal-body lx-form-stack px-4 py-4 sm:px-5 sm:py-5"
          style={{ maxHeight: bodyMaxHeight }}
        >
          {children}
        </div>

        {footer && (
          <div className="px-4 sm:px-5 py-3 border-t border-border bg-elevated rounded-b-xl flex flex-wrap items-center justify-end gap-2 shrink-0 lx-btn-group">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/* ---------- Empty / loading ---------- */
export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="lx-empty-state flex flex-col items-center justify-center text-center animate-entrance">
      {icon && (
        <div className="size-12 rounded-xl bg-accent border border-border/60 flex items-center justify-center mb-4 text-muted-foreground shadow-xs" aria-hidden>
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold text-foreground tracking-tight">{title}</div>
      {hint && <p className="text-xs text-muted-foreground mt-2 max-w-md leading-relaxed">{hint}</p>}
      {action && <div className="mt-5 lx-btn-group justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function PageLoadingSkeleton() {
  return (
    <div className="space-y-5 animate-entrance">
      <div className="lx-kpi-grid">
        <Skeleton className="lx-kpi-card rounded-xl w-full min-h-[5rem]" />
        <Skeleton className="lx-kpi-card rounded-xl w-full min-h-[5rem]" />
        <Skeleton className="lx-kpi-card rounded-xl w-full min-h-[5rem]" />
        <Skeleton className="lx-kpi-card rounded-xl w-full min-h-[5rem]" />
      </div>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <Skeleton className="h-12 rounded-none" />
        <div className="p-5 space-y-3">
          <Skeleton className="h-4 w-[66%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[83%]" />
          <Skeleton className="h-4 w-[50%]" />
        </div>
      </div>
    </div>
  );
}

/* ---------- Premium DataTable wrapper ---------- */

export function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`lx-table-wrap overflow-auto max-h-[min(640px,70vh)] rounded-b-xl -mx-px ${className}`}>
      <table className="w-full min-w-[min(100%,520px)] sm:min-w-[640px] text-left border-collapse border-separate border-spacing-0">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "", align = "left" }: { children: ReactNode; className?: string; align?: "left" | "right" | "center" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`lx-table-th sticky top-0 z-10 px-4 sm:px-5 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground bg-background/95 backdrop-blur-sm border-b border-border ${alignCls} ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "", mono, align = "left" }: { children: ReactNode; className?: string; mono?: boolean; align?: "left" | "right" | "center" }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td className={`px-4 sm:px-5 py-3.5 text-xs sm:text-sm text-foreground ${alignCls} ${mono ? "font-mono tabular-nums" : ""} ${className}`}>
      {children}
    </td>
  );
}

export function Tr({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <tr className={`lx-table-tr transition-colors duration-150 ${className}`}>{children}</tr>;
}
