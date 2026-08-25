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
  children,
}: {
  product?: ProductId;
  title?: string;
  caption?: string;
  device?: DeviceKind | "browser";
  children: ReactNode;
}) {
  const label = title ?? (product ? PRODUCT_FAMILY[product].name : "Preview");
  const frame =
    device === "browser" ? (
      <BrowserMockup title={label}>{children}</BrowserMockup>
    ) : (
      <DeviceMockup device={device} title={label}>
        {children}
      </DeviceMockup>
    );
  return (
    <div data-product={product} className="site-crossfade">
      <ScreenshotFrame caption={caption}>{frame}</ScreenshotFrame>
    </div>
  );
}
