import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

/** Auth pages shell — stable width and readable text wrapping on all devices. */
export function AuthScreen({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="transport-auth-screen flex min-h-dvh w-full flex-col bg-background px-4 pb-[var(--safe-area-bottom)] pt-[var(--safe-area-top)] sm:px-6">
      <div
        className={cn(
          "mx-auto flex w-full min-w-0 max-w-[var(--width-auth)] flex-1 flex-col justify-center py-8",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AuthHeader({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="mb-8 w-full min-w-0 text-center">
      <div className="mx-auto mb-4 flex justify-center">{icon}</div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {title}
      </h1>
      <p className="transport-form-copy mt-2 text-sm leading-relaxed text-muted-foreground">
        {subtitle}
      </p>
    </header>
  );
}

export function AuthDemoCard({ children }: { children: ReactNode }) {
  return (
    <div className="transport-form-copy mt-8 w-full min-w-0 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-relaxed text-muted-foreground">
      {children}
    </div>
  );
}
