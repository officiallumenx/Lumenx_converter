import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";

export type ProductNavItem = {
  id: ProductId;
  label?: string;
};

export function ProductNavigation({
  products,
  active,
  onSelect,
  stacked = false,
  className,
}: {
  products: readonly ProductNavItem[];
  active?: ProductId;
  onSelect?: (id: ProductId) => void;
  stacked?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("site-product-nav", stacked && "site-product-nav--stack", className)}
      role={onSelect ? "tablist" : "navigation"}
      aria-label="Products"
    >
      {products.map((item) => {
        const label = item.label ?? PRODUCT_FAMILY[item.id].shortName;
        const selected = item.id === active;
        const classNameItem = cn("site-product-nav__item");
        if (onSelect) {
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={classNameItem}
              onClick={() => onSelect(item.id)}
            >
              {label}
            </button>
          );
        }
        return (
          <Link
            key={item.id}
            to="/products/$slug"
            params={{ slug: item.id }}
            aria-current={selected ? "page" : undefined}
            className={classNameItem}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
