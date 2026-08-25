import { cn } from "@lumenx/ui";

/** Single helper or error line under form fields — no character counters. */
export function FieldMessage({
  id,
  error,
  hint,
  className,
}: {
  id?: string;
  error?: string | null;
  hint?: string;
  className?: string;
}) {
  const message = error?.trim() || hint?.trim();
  if (!message) return null;

  return (
    <p
      id={id}
      role={error ? "alert" : undefined}
      className={cn(
        "text-sm leading-normal",
        error ? "text-destructive" : "text-muted-foreground",
        className,
      )}
    >
      {message}
    </p>
  );
}
