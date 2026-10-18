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

/** Official product artwork when available (overrides Lucide marks). */
const LOGO_SRC: Partial<Record<ProductId, string>> = {
  admin: "/brand/products/admin.png",
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
  const logoSrc = LOGO_SRC[product];
  const Icon = ICONS[product];
  const imgClass =
    size === "lg" ? "size-6" : size === "sm" ? "size-3.5" : "size-5";

  return (
    <span
      data-product={product}
      className={cn(
        "site-product-mark",
        size === "sm" && "site-product-mark--sm",
        size === "lg" && "site-product-mark--lg",
        logoSrc && "site-product-mark--logo",
        className,
      )}
      aria-hidden
    >
      {logoSrc ? (
        <img src={logoSrc} alt="" className={cn(imgClass, "rounded-sm object-cover")} />
      ) : (
        <Icon className={imgClass} />
      )}
    </span>
  );
}
