import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ProductPage } from "@/components/product/ProductPage";
import { PRODUCT_PAGES, isProductPageSlug } from "@/content/product-pages";
import { PRODUCT_SEO, breadcrumbJsonLd, pageHead, productJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import type { ProductId } from "@/theme/products";

const PLATFORM_PRODUCT_IDS = ["admin", "connect", "transport", "admissions", "careers"] as const;
type PlatformProductId = (typeof PLATFORM_PRODUCT_IDS)[number];

function isPlatformProductId(value: string): value is PlatformProductId {
  return (PLATFORM_PRODUCT_IDS as readonly string[]).includes(value);
}

export const Route = createFileRoute("/platform/$slug")({
  beforeLoad: ({ params }) => {
    if (params.slug === "nexus") {
      throw redirect({ to: "/about" });
    }
    if (!isPlatformProductId(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    if (!isPlatformProductId(params.slug)) {
      return pageHead({ title: "Product — LumenX", description: "LumenX product.", path: "/platform" });
    }
    return pageHead(PRODUCT_SEO[params.slug]);
  },
  component: PlatformProductPage,
});

function PlatformProductPage() {
  const { slug } = Route.useParams();
  if (!isPlatformProductId(slug) || !isProductPageSlug(slug)) return null;
  const content = PRODUCT_PAGES[slug as ProductId];
  return (
    <>
      <JsonLd data={productJsonLd(slug)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Platform", path: "/platform" },
          { name: content.shortName, path: `/platform/${slug}` },
        ])}
      />
      <ProductPage content={content} />
    </>
  );
}
