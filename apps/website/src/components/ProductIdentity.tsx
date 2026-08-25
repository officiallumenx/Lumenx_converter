import type { CSSProperties } from "react";
import { cn } from "@lumenx/ui";
import { PRODUCT_FAMILY_LIST } from "@/theme/products";
import { EcosystemNode } from "./visual/EcosystemNode";

export { ProductMark } from "./product/ProductMark";
export { ProductBadge as ProductChip } from "./product/ProductBadge";

export function ProductFamily({ className }: { className?: string }) {
  return (
    <ul className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {PRODUCT_FAMILY_LIST.map((p, i) => (
        <li
          key={p.id}
          className="site-stagger__item"
          style={{ "--i": Math.min(i, 5) } as CSSProperties}
        >
          <EcosystemNode product={p.id} />
        </li>
      ))}
    </ul>
  );
}
