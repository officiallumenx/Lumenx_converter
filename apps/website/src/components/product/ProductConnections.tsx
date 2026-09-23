import { Link } from "@tanstack/react-router";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import type { ProductPageConnection } from "@/content/product-pages";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";
import { Grid } from "../layout/Grid";
import { SiteCard } from "../SiteCard";
import { ProductMark } from "./ProductMark";

const HUB_ORDER: readonly ProductId[] = ["connect", "transport", "admissions", "careers"];

function Satellite({
  product,
  body,
}: {
  product: ProductId;
  body?: string;
}) {
  const meta = PRODUCT_FAMILY[product];
  return (
    <Link
      to="/platform/$slug"
      params={{ slug: product }}
      className="product-hub__satellite"
      data-product={product}
    >
      <ProductMark product={product} size="sm" />
      <span className="min-w-0">
        <span className="product-hub__name">{meta.shortName}</span>
        {body ? <span className="product-hub__hint">{body}</span> : null}
      </span>
    </Link>
  );
}

function HubMap({
  hub,
  items,
}: {
  hub: ProductId;
  items: readonly ProductPageConnection[];
}) {
  const byId = new Map(items.map((item) => [item.product, item]));
  const satellites = HUB_ORDER.filter((id) => id !== hub && byId.has(id)).map((id) => ({
    product: id,
    body: byId.get(id)?.body,
  }));
  const hubMeta = PRODUCT_FAMILY[hub];

  // Place up to four satellites: top, right, bottom, left
  const [top, right, bottom, left] = [
    satellites[0],
    satellites[1],
    satellites[2],
    satellites[3],
  ];

  return (
    <div className="product-hub">
      <p className="product-hub__lede">
        {hubMeta.shortName} sits at the centre. Connect, Transport, Admissions, and Careers
        exchange the same institute record both ways — so teams work together in one place,
        without duplicate data or conflicting updates.
      </p>

      <div className="product-hub__map" aria-label={`${hubMeta.shortName} connected to the other LumenX apps`}>
        <div className="product-hub__cell product-hub__cell--top">
          {top ? <Satellite product={top.product} body={top.body} /> : null}
        </div>

        <div className="product-hub__cell product-hub__cell--arrow-v" aria-hidden>
          {top ? <ArrowLeftRight className="product-hub__arrow product-hub__arrow--v" /> : null}
        </div>

        <div className="product-hub__mid">
          <div className="product-hub__cell product-hub__cell--left">
            {left ? <Satellite product={left.product} body={left.body} /> : null}
          </div>
          <div className="product-hub__cell product-hub__cell--arrow-h" aria-hidden>
            {left ? <ArrowLeftRight className="product-hub__arrow" /> : null}
          </div>

          <div className="product-hub__core" data-product={hub}>
            <ProductMark product={hub} />
            <p className="product-hub__core-name">{hubMeta.shortName}</p>
            <p className="product-hub__core-role">Shared institute record</p>
          </div>

          <div className="product-hub__cell product-hub__cell--arrow-h" aria-hidden>
            {right ? <ArrowLeftRight className="product-hub__arrow" /> : null}
          </div>
          <div className="product-hub__cell product-hub__cell--right">
            {right ? <Satellite product={right.product} body={right.body} /> : null}
          </div>
        </div>

        <div className="product-hub__cell product-hub__cell--arrow-v" aria-hidden>
          {bottom ? <ArrowLeftRight className="product-hub__arrow product-hub__arrow--v" /> : null}
        </div>

        <div className="product-hub__cell product-hub__cell--bottom">
          {bottom ? <Satellite product={bottom.product} body={bottom.body} /> : null}
        </div>
      </div>
    </div>
  );
}

export function ProductConnections({
  items,
  hub,
}: {
  items: readonly ProductPageConnection[];
  /** When set, render a hub diagram (Nexus is always excluded). */
  hub?: ProductId;
}) {
  const visible = items.filter((item) => item.product !== "nexus");

  if (hub) {
    return <HubMap hub={hub} items={visible} />;
  }

  return (
    <Grid columns={2} stagger>
      {visible.map((item) => {
        const meta = PRODUCT_FAMILY[item.product];
        return (
          <SiteCard key={item.product} product={item.product}>
            <ProductMark product={item.product} />
            <h3 className="mt-4 text-base font-semibold tracking-tight">{meta.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            <Link
              to="/platform/$slug"
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
