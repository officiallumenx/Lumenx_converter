import { createFileRoute, notFound } from "@tanstack/react-router";
import { ProductPage } from "@/components/product/ProductPage";
import { PRODUCT_PAGES, isProductPageSlug } from "@/content/product-pages";
import { PRODUCT_SEO, breadcrumbJsonLd, pageHead, productJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export const Route = createFileRoute("/products/$slug")({
  beforeLoad: ({ params }) => {
    if (!isProductPageSlug(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const slug = isProductPageSlug(params.slug) ? params.slug : null;
    if (!slug) {
      return pageHead({ title: "Product — LumenX", description: "LumenX product.", path: "/products" });
    }
    return pageHead(PRODUCT_SEO[slug]);
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  if (!isProductPageSlug(slug)) return null;
  const content = PRODUCT_PAGES[slug];
  return (
    <>
      <JsonLd data={productJsonLd(slug)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Products", path: "/products" },
          { name: content.shortName, path: `/products/${slug}` },
        ])}
      />
      <ProductPage content={content} />
    </>
  );
}
