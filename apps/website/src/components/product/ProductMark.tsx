import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";
import {
  Briefcase,
  Building2,
  Bus,
  Radar,
  Smartphone,
  UserCheck,
} from "lucide-react";
import type { ProductId } from "@/theme/products";

const ICONS: Record<ProductId, LucideIcon> = {
  admin: Building2,
  connect: Smartphone,
  transport: Bus,
  admissions: UserCheck,
  careers: Briefcase,
  nexus: Radar,
};

export function ProductMark({
  product,
  className,
  size = "md",
}: {
  product: ProductId;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = ICONS[product];
  return (
    <span
      data-product={product}
      className={cn(
        "site-product-mark",
        size === "sm" && "site-product-mark--sm",
        size === "lg" && "site-product-mark--lg",
        className,
      )}
      aria-hidden
    >
      <Icon className={size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-5"} />
    </span>
  );
}
