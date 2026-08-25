import type { ReactNode } from "react";
import { SiteCard } from "../SiteCard";

export function TestimonialCard({
  quote,
  name,
  role,
  footer,
}: {
  quote: string;
  name: string;
  role?: string;
  footer?: ReactNode;
}) {
  return (
    <SiteCard quiet>
      <blockquote>
        <p className="text-base leading-relaxed">“{quote}”</p>
        <footer className="mt-4">
          <p className="text-sm font-semibold">{name}</p>
          {role ? <p className="text-xs text-muted-foreground">{role}</p> : null}
          {footer}
        </footer>
      </blockquote>
    </SiteCard>
  );
}
