/**
 * Helpers for Create Account / Register institute navigation.
 * Nested <button> inside <Link> is invalid HTML and causes first-click
 * navigation to fail or bounce in several browsers (second click "works").
 */

/** True when a click target is (or is inside) an interactive control other than an anchor. */
export function isNestedInteractiveTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as { closest?: (sel: string) => unknown };
  if (typeof el.closest !== "function") return false;
  return Boolean(
    el.closest("button, input, select, textarea, [role='button'], [role='link']"),
  );
}

/**
 * Build props for a primary CTA that navigates without nesting a <button> in <a>.
 * Use on a <Link> (or <a>) directly — do not wrap AuthButton/Button inside Link.
 */
export function linkCtaClassName(options?: {
  fullWidth?: boolean;
  size?: "sm" | "md";
  variant?: "primary" | "outline";
}): string {
  const fullWidth = options?.fullWidth !== false;
  const size = options?.size ?? "md";
  const variant = options?.variant ?? "primary";
  const base = [
    "inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "whitespace-nowrap no-underline",
    fullWidth ? "w-full" : "",
    size === "sm" ? "h-9 text-xs px-4" : "h-10 text-sm px-5",
  ].join(" ");
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 shadow-sm",
    outline:
      "border border-border bg-background hover:bg-surface-hover hover:border-border-strong active:bg-accent text-foreground",
  };
  return `${base} ${variants[variant]} motion-safe:active:scale-[0.99] duration-200`;
}
