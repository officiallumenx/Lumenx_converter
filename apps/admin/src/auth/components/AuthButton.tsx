/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthButton
 *  Primary / outline / ghost variants for auth forms.
 * ───────────────────────────────────────────────────────────── */

import type { ComponentPropsWithoutRef, ReactNode } from "react";

interface AuthButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "className"> {
  variant?: "primary" | "outline" | "ghost";
  loading?: boolean;
  fullWidth?: boolean;
  size?: "sm" | "md";
  children: ReactNode;
}

export function AuthButton({
  variant   = "primary",
  loading   = false,
  fullWidth = true,
  size      = "md",
  children,
  disabled,
  type = "button",
  ...rest
}: AuthButtonProps) {
  const base = [
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "disabled:opacity-60 disabled:cursor-not-allowed",
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
      className={`${base} ${variants[variant]} motion-safe:active:scale-[0.99] duration-200`}
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
          <span>{typeof children === "string" ? `${children}…` : children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
