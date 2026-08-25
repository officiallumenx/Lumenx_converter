import { cn } from "@lumenx/ui";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";
import { ProductMark } from "../product/ProductMark";

export function EcosystemNode({
  product,
  title,
  role,
  className,
}: {
  product: ProductId;
  title?: string;
  role?: string;
  className?: string;
}) {
  const meta = PRODUCT_FAMILY[product];
  return (
    <div data-product={product} className={cn("site-card site-card--product site-card--quiet site-card--row", className)}>
      <div className="site-eco-node">
        <ProductMark product={product} />
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight">{title ?? meta.shortName}</p>
          <p className="text-xs text-muted-foreground">{role ?? meta.role}</p>
        </div>
      </div>
    </div>
  );
}
