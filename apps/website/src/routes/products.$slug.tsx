import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { isProductPageSlug } from "@/content/product-pages";

export const Route = createFileRoute("/products/$slug")({
  beforeLoad: ({ params }) => {
    if (params.slug === "nexus") {
      throw redirect({ to: "/about" });
    }
    if (isProductPageSlug(params.slug) && params.slug !== "nexus") {
      throw redirect({
        to: "/platform/$slug",
        params: { slug: params.slug },
      });
    }
    throw notFound();
  },
  component: function ProductsSlugRedirect() {
    return null;
  },
});
