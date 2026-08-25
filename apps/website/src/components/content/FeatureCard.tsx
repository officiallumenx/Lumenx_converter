import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import { SiteCard } from "../SiteCard";
import { AnimatedIcon } from "../visual/AnimatedIcon";

export function FeatureCard({
  product,
  icon,
  title,
  children,
  className,
}: {
  product?: ProductId;
  icon?: LucideIcon;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <SiteCard product={product} quiet className={cn("px-4 py-3", className)}>
      {icon ? <AnimatedIcon icon={icon} product={product} className="mb-2" /> : null}
      <p className="font-medium">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted-foreground">{children}</div> : null}
    </SiteCard>
  );
}
