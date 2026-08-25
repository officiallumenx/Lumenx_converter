import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";

export function SiteCard({
  product,
  quiet = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement> & {
  product?: ProductId;
  quiet?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      data-product={product}
      className={cn("site-card", product && "site-card--product", quiet && "site-card--quiet", className)}
      {...props}
    >
      {children}
    </article>
  );
}
