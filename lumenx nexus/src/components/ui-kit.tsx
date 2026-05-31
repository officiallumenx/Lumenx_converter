import { type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, useEffect } from "react";
import { X } from "lucide-react";

export function Card({ children, className = "", interactive = false }: { children: ReactNode; className?: string; interactive?: boolean }) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-elevated relative overflow-hidden ${interactive ? "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, hint }: { title: string; action?: ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function Kpi({ label, value, delta, tone = "neutral", footer, icon }: {
  label: string; value: string; delta?: string; tone?: "up" | "down" | "neutral"; footer?: ReactNode; icon?: ReactNode;
}) {
  const toneCls = tone === "up" ? "text-success" : tone === "down" ? "text-destructive" : "text-muted-foreground";
  const toneBg = tone === "up" ? "bg-success/10" : tone === "down" ? "bg-destructive/10" : "bg-muted";
  return (
    <div className="bg-surface border border-border rounded-xl p-5 relative overflow-hidden hover:bg-surface-hover transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop shadow-elevated group">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-strong to-transparent opacity-60" />
      <div className="flex items-start justify-between">
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
        {icon && <div className="size-7 rounded-md bg-accent flex items-center justify-center text-primary opacity-70 group-hover:opacity-100 transition-opacity">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {delta && <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${toneCls} ${toneBg}`}>{delta}</span>}
      </div>
      {footer && <div className="mt-3">{footer}</div>}
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
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide border ${map[tone]}`}>
      {pulse && <span className={`size-1.5 rounded-full ${dotMap[tone]} pulse-ring`} />}
      {children}
    </span>
  );
}

export function Button({ children, variant = "default", size = "md", className = "", ...rest }: {
  children: ReactNode;
  variant?: "default" | "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const map = {
    default: "bg-surface border border-border hover:bg-surface-hover text-foreground hover:border-border-strong",
    primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-glow border border-primary/40 hover:shadow-pop",
    ghost: "bg-transparent hover:bg-surface-hover text-muted-foreground hover:text-foreground",
    danger: "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20",
    outline: "bg-transparent border border-border hover:bg-surface text-foreground",
  } as const;
  const sizes = { sm: "h-7 px-2.5 text-[11px]", md: "h-9 px-3.5 text-xs" } as const;
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed ${map[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}

/* ---------- Form primitives ---------- */

export function Field({ label, hint, children, required }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </span>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full h-10 px-3 rounded-md bg-background border border-border text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors ${props.className ?? ""}`}
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

export function Select({ children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={`w-full h-10 px-3 rounded-md bg-background border border-border text-sm focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-ring/30 hover:border-border-strong transition-colors ${rest.className ?? ""}`}
    >
      {children}
    </select>
  );
}

/* ---------- Modal ---------- */

export function Modal({ open, onClose, title, subtitle, children, footer, size = "md" }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", h);
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;
  const sizeMap = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" }[size];
  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-md flex items-start justify-center p-4 pt-16 overflow-y-auto animate-entrance" onClick={onClose}>
      <div className={`w-full ${sizeMap} rounded-xl bg-elevated border border-border shadow-pop animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="size-8 rounded-md hover:bg-surface-hover flex items-center justify-center text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-border bg-background/60 rounded-b-xl flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Empty / loading ---------- */
export function EmptyState({ icon, title, hint, action }: { icon?: ReactNode; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="size-12 rounded-xl bg-accent flex items-center justify-center mb-4 text-muted-foreground">{icon}</div>}
      <div className="text-sm font-medium">{title}</div>
      {hint && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ---------- Premium DataTable wrapper ---------- */

export function DataTable({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`overflow-auto max-h-[640px] rounded-b-xl ${className}`}>
      <table className="w-full text-left border-separate border-spacing-0">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <th className={`sticky top-0 z-10 px-5 py-3 font-semibold text-[10px] uppercase tracking-wider text-muted-foreground bg-background/95 backdrop-blur-sm border-b border-border ${className}`}>
      {children}
    </th>
  );
}
