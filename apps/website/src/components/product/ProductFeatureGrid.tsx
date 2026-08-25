import type { CSSProperties } from "react";
import type { ProductId } from "@/theme/products";
import { Grid } from "../layout/Grid";
import { FeatureCard } from "../content/FeatureCard";

export function ProductFeatureGrid({
  product,
  features,
  columns,
}: {
  product?: ProductId;
  features: readonly string[];
  columns?: 2 | 3 | 4;
}) {
  if (!columns) {
    return (
      <div className="grid gap-3">
        {features.map((feature, i) => (
          <div
            key={feature}
            className="site-stagger__item"
            style={{ "--i": Math.min(i, 5) } as CSSProperties}
          >
            <FeatureCard product={product} title={feature} />
          </div>
        ))}
      </div>
    );
  }
  return (
    <Grid columns={columns} stagger>
      {features.map((feature) => (
        <FeatureCard key={feature} product={product} title={feature} />
      ))}
    </Grid>
  );
}
