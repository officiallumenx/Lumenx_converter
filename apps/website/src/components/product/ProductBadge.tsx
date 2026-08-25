import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";
import { ProductMark } from "./ProductMark";

export function ProductBadge({
  product,
  children,
  className,
}: {
  product: ProductId;
  children?: ReactNode;
  className?: string;
}) {
  const meta = PRODUCT_FAMILY[product];
  return (
    <span data-product={product} className={cn("site-product-chip", className)}>
      <ProductMark product={product} size="sm" />
      {children ?? meta.shortName}
    </span>
  );
}
