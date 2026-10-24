import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import { SiteCard } from "../SiteCard";
import { SiteButton } from "../SiteButton";
import { ProductMark } from "../product/ProductMark";
import { TiltSurface } from "../experience/TiltSurface";

export function ProductCard({
  product,
  name,
  tagline,
  points,
  action,
  className,
}: {
  product: ProductId;
  name: string;
  tagline: string;
  points?: readonly string[];
  action?: ReactNode;
  className?: string;
}) {
  return (
    <TiltSurface className="h-full">
      <SiteCard product={product} className={cn("h-full", className)}>
        <ProductMark product={product} />
        <h3 className="site-card-title mt-4">{name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{tagline}</p>
        {points && points.length > 0 ? (
          <ul className="mt-4 flex-1 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
            {points.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {action ?? (
          product === "nexus" ? (
            <SiteButton asChild variant="ghost" className="mt-4 h-auto justify-start px-0">
              <Link to="/about">
                About LumenX
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </SiteButton>
          ) : (
            <SiteButton asChild variant="ghost" className="mt-4 h-auto justify-start px-0">
              <Link to="/platform/$slug" params={{ slug: product }}>
                Explore {name}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </SiteButton>
          )
        )}
      </SiteCard>
    </TiltSurface>
  );
}
