import type { ReactNode } from "react";
import { Label, cn } from "@lumenx/ui";

import { FieldMessage } from "@/components/ui/field-message";

/** Full-width labeled form control — prevents cramped one-word-per-line wrapping. */
export function FormField({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  const messageId = `${id}-message`;

  return (
    <div className={cn("transport-form-field w-full min-w-0", className)}>
      <Label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
      <FieldMessage
        id={messageId}
        error={error}
        hint={hint}
        className="mt-2 w-full text-sm leading-normal"
      />
    </div>
  );
}
