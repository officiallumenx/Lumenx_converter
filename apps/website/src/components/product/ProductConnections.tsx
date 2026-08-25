import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ProductPageConnection } from "@/content/product-pages";
import { PRODUCT_FAMILY } from "@/theme/products";
import { Grid } from "../layout/Grid";
import { SiteCard } from "../SiteCard";
import { ProductMark } from "./ProductMark";

export function ProductConnections({ items }: { items: readonly ProductPageConnection[] }) {
  return (
    <Grid columns={2} stagger>
      {items.map((item) => {
        const meta = PRODUCT_FAMILY[item.product];
        return (
          <SiteCard key={item.product} product={item.product}>
            <ProductMark product={item.product} />
            <h3 className="mt-4 text-base font-semibold tracking-tight">{meta.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            <Link
              to="/products/$slug"
              params={{ slug: item.product }}
              className="site-btn site-btn--ghost mt-4 h-auto justify-start px-0 text-foreground"
            >
              Explore {meta.shortName}
              <ArrowRight className="size-4" />
            </Link>
          </SiteCard>
        );
      })}
    </Grid>
  );
}
