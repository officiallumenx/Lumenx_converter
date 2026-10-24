import type { HTMLAttributes, ReactNode } from "react";
import { Card, cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";

export function SiteCard({
  product,
  quiet = false,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  product?: ProductId;
  quiet?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      data-product={product}
      className={cn(
        "site-card",
        product && "site-card--product",
        quiet && "site-card--quiet",
        className,
      )}
      {...props}
    >
      {children}
    </Card>
  );
}
