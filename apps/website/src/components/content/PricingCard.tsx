import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { SiteCard } from "../SiteCard";

export function PricingCard({
  title,
  hint,
  amount,
  amountNote,
  secondaryAmount,
  secondaryNote,
  badge,
  featured = false,
  children,
  className,
}: {
  title: string;
  hint?: string;
  amount: ReactNode;
  amountNote?: string;
  secondaryAmount?: ReactNode;
  secondaryNote?: string;
  badge?: string;
  featured?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <SiteCard
      quiet
      className={cn(
        "relative",
        featured && "border-[var(--border-brand)] shadow-[var(--site-shadow-sm)]",
        className,
      )}
    >
      {badge ? (
        <p className="absolute right-4 top-4 rounded-full bg-[var(--site-brand-soft)] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[var(--site-brand)]">
          {badge}
        </p>
      ) : null}
      <p className="text-sm font-semibold">{title}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <p className="mt-4 font-mono text-2xl font-semibold tabular-nums tracking-tight">{amount}</p>
      {amountNote ? <p className="text-xs text-muted-foreground">{amountNote}</p> : null}
      {secondaryAmount ? (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="font-mono tabular-nums font-medium text-foreground">{secondaryAmount}</span>
          {secondaryNote ? <span>{` · ${secondaryNote}`}</span> : null}
        </p>
      ) : null}
      {children}
    </SiteCard>
  );
}
