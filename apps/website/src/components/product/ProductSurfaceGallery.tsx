import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductShot } from "@/content/product-pages";
import type { ProductId } from "@/theme/products";
import { ProductScreenshot } from "./ProductScreenshot";
import { PreviewPanel } from "./previews";

export function ProductSurfaceGallery({
  product,
  shots,
  defaultDevice,
}: {
  product: ProductId;
  shots: readonly ProductShot[];
  defaultDevice: "phone" | "tablet" | "browser";
}) {
  const [index, setIndex] = useState(0);
  if (shots.length === 0) return null;

  const safeIndex = ((index % shots.length) + shots.length) % shots.length;
  const shot = shots[safeIndex]!;
  const total = shots.length;

  function go(delta: number) {
    setIndex((current) => current + delta);
  }

  return (
    <div className="product-surface-gallery">
      <div className="product-surface-gallery__stage">
        <button
          type="button"
          className="product-surface-gallery__nav product-surface-gallery__nav--prev"
          aria-label="Previous screen"
          disabled={total <= 1}
          onClick={() => go(-1)}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>

        <div key={shot.title} className="product-surface-gallery__frame site-crossfade">
          <ProductScreenshot
            product={product}
            title={shot.title}
            caption={shot.caption}
            device={shot.device ?? (defaultDevice === "browser" ? "tablet" : defaultDevice)}
            image={shot.image}
          >
            {shot.panel ? <PreviewPanel id={shot.panel} /> : null}
          </ProductScreenshot>
        </div>

        <button
          type="button"
          className="product-surface-gallery__nav product-surface-gallery__nav--next"
          aria-label="Next screen"
          disabled={total <= 1}
          onClick={() => go(1)}
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <div className="product-surface-gallery__meta">
        <p className="product-surface-gallery__title">{shot.title}</p>
        <p className="product-surface-gallery__count" aria-live="polite">
          {safeIndex + 1} / {total}
        </p>
      </div>

      {total > 1 ? (
        <div className="product-surface-gallery__dots" role="tablist" aria-label="Screens">
          {shots.map((item, i) => (
            <button
              key={item.title}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Show ${item.title}`}
              className="product-surface-gallery__dot"
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
