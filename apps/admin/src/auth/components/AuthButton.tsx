/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthButton
 *  Primary / outline / ghost variants for auth forms.
 * ───────────────────────────────────────────────────────────── */

import { Children, isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";

interface AuthButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md";
  children: ReactNode;
}

/** Prefer plain text for the loading label so icons (e.g. ArrowRight) do not wrap/shift. */
function loadingLabelFromChildren(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return `${String(children).trim()}…`;
  }
  const text = Children.toArray(children)
    .filter((child) => typeof child === "string" || typeof child === "number")
    .join("")
    .trim();
  if (text) return `${text}…`;
  const first = Children.toArray(children)[0];
  if (isValidElement<{ children?: ReactNode }>(first) && first.props.children != null) {
    return loadingLabelFromChildren(first.props.children);
  }
  return "Please wait…";
}

export function AuthButton({
  variant   = "primary",
  loading   = false,
  fullWidth = true,
  size      = "md",
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}: AuthButtonProps) {
  const base = [
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:opacity-60 disabled:cursor-not-allowed",
    "whitespace-nowrap",
    fullWidth ? "w-full" : "",
    size === "sm" ? "h-9 text-xs px-4" : "h-10 text-sm px-5",
  ].join(" ");

  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 shadow-sm",
    outline:
      "border border-border bg-background hover:bg-surface-hover hover:border-border-strong active:bg-accent",
    ghost:
      "hover:bg-surface-hover active:bg-accent text-foreground",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${base} ${variants[variant]} motion-safe:active:scale-[0.99] duration-200 ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <span
            className={[
              "size-4 rounded-full border-2 animate-spin shrink-0",
              variant === "primary"
                ? "border-primary-foreground/30 border-t-primary-foreground"
                : "border-muted-foreground/30 border-t-foreground",
            ].join(" ")}
            aria-hidden
          />
          <span>{loadingLabelFromChildren(children)}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
