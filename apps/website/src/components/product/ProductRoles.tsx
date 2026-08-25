import { useState } from "react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import type { ProductPageRole } from "@/content/product-pages";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";
import { ProductMark } from "./ProductMark";

export function ProductRoles({
  product,
  roles,
}: {
  product: ProductId;
  roles: readonly ProductPageRole[];
}) {
  const [active, setActive] = useState(roles[0]?.title ?? "");
  const ids = roles.map((role) => role.title);
  const { setRef, focus } = useTabFocus<string>();
  const role = roles.find((item) => item.title === active) ?? roles[0];
  if (!role) return null;

  return (
    <div>
      <div
        className="home-role-tabs"
        role="tablist"
        aria-label="Roles"
        onKeyDown={(event) => cycleTabKey(event, ids, role.title, setActive, focus)}
      >
        {roles.map((item) => (
          <button
            key={item.title}
            ref={setRef(item.title)}
            type="button"
            role="tab"
            aria-selected={item.title === role.title}
            tabIndex={item.title === role.title ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => setActive(item.title)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <div key={role.title} className="mt-8 site-card site-crossfade" data-product={product}>
        <div className="flex flex-wrap items-start gap-4">
          <ProductMark product={product} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-semibold tracking-tight">{role.title}</h3>
            <p className="mt-2 max-w-2xl text-muted-foreground">{role.outcome}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {role.points.map((point) => (
                <li key={point} className="rounded-lg border bg-muted/40 p-4 text-sm">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
