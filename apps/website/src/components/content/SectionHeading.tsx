import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function SectionHeading({
  eyebrow,
  title,
  lede,
  as: Tag = "h2",
  align = "start",
  className,
}: {
  eyebrow?: string;
  title?: ReactNode;
  lede?: ReactNode;
  as?: "h1" | "h2" | "h3";
  align?: "start" | "center";
  className?: string;
}) {
  if (!eyebrow && !title && !lede) return null;
  return (
    <header className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow ? <p className="site-kicker mb-2">{eyebrow}</p> : null}
      {title ? (
        <Tag className={Tag === "h1" ? "site-hero-display" : "site-section-title text-foreground"}>{title}</Tag>
      ) : null}
      {lede ? <p className={cn("site-lede", align === "center" && "mx-auto")}>{lede}</p> : null}
    </header>
  );
}
