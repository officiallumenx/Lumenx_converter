import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { ProductId } from "@/theme/products";
import { SiteCard } from "../SiteCard";

export function SolutionCard({
  product,
  icon: Icon,
  title,
  outcome,
  points,
  action,
}: {
  product: ProductId;
  icon?: LucideIcon;
  title: string;
  outcome: string;
  points?: readonly string[];
  action?: ReactNode;
}) {
  return (
    <SiteCard product={product} quiet>
      {Icon ? <Icon className="size-5 text-foreground" aria-hidden strokeWidth={1.75} /> : null}
      <h2 className="mt-3 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{outcome}</p>
      {points && points.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
          {points.map((p) => (
            <li key={p}>· {p}</li>
          ))}
        </ul>
      ) : null}
      {action}
    </SiteCard>
  );
}
