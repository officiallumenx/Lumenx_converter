import type { ReactNode } from "react";
import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";
import { ScreenshotFrame } from "../visual/ScreenshotFrame";
import { DeviceMockup, type DeviceKind } from "../visual/DeviceMockup";
import { BrowserMockup } from "../visual/BrowserMockup";
import { LaptopMockup } from "../visual/LaptopMockup";
import { PhoneMockup } from "../visual/PhoneMockup";

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
  const isDesktop = device === "browser";

  if (image) {
    return (
      <div data-product={product} className="site-crossfade">
        <ScreenshotFrame caption={caption}>
          {isDesktop ? (
            <LaptopMockup title={label}>
              <img
                src={image}
                alt={label}
                className="block h-auto w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </LaptopMockup>
          ) : (
            <PhoneMockup title={label}>
              <img
                src={image}
                alt={label}
                className="block h-auto w-full object-cover object-top"
                loading="lazy"
                decoding="async"
              />
            </PhoneMockup>
          )}
        </ScreenshotFrame>
      </div>
    );
  }

  const frameBody = <div>{children}</div>;
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
