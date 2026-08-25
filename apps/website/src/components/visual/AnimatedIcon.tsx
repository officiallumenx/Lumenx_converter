import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";

export function AnimatedIcon({
  icon: Icon,
  product,
  className,
  size = 20,
}: {
  icon: LucideIcon;
  product?: ProductId;
  className?: string;
  size?: number;
}) {
  return (
    <span data-product={product} className={cn("site-icon-animated", className)} aria-hidden>
      <Icon size={size} strokeWidth={1.75} />
    </span>
  );
}
