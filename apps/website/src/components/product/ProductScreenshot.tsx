import type { ReactNode } from "react";
import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";
import { ScreenshotFrame } from "../visual/ScreenshotFrame";
import { DeviceMockup, type DeviceKind } from "../visual/DeviceMockup";
import { BrowserMockup } from "../visual/BrowserMockup";

export function ProductScreenshot({
  product,
  title,
  caption,
  device = "phone",
  image,
  children,
}: {
  product?: ProductId;
  title?: string;
  caption?: string;
  device?: DeviceKind | "browser";
  /** Real screenshot URL under `/public`. */
  image?: string;
  children?: ReactNode;
}) {
  const label = title ?? (product ? PRODUCT_FAMILY[product].name : "Preview");
  const content = image ? (
    <img
      src={image}
      alt={label}
      className="block h-auto w-full object-cover object-top"
      loading="lazy"
      decoding="async"
      onError={(event) => {
        const target = event.currentTarget;
        target.style.display = "none";
        const fallback = target.nextElementSibling;
        if (fallback instanceof HTMLElement) fallback.hidden = false;
      }}
    />
  ) : null;

  const frameBody = (
    <>
      {content}
      <div hidden={Boolean(image)}>{children}</div>
    </>
  );

  const frame =
    device === "browser" ? (
      <BrowserMockup title={label}>{frameBody}</BrowserMockup>
    ) : (
      <DeviceMockup device={device} title={label}>
        {frameBody}
      </DeviceMockup>
    );
  return (
    <div data-product={product} className="site-crossfade">
      <ScreenshotFrame caption={caption}>{frame}</ScreenshotFrame>
    </div>
  );
}
