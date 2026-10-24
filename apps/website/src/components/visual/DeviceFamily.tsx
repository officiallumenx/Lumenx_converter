import { cn } from "@lumenx/ui";
import { LaptopMockup } from "./LaptopMockup";
import { TabletMockup } from "./TabletMockup";
import { PhoneMockup } from "./PhoneMockup";

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="block h-auto w-full object-cover object-top"
      loading="lazy"
      decoding="async"
    />
  );
}

/** Admin — large laptop with tablet + phone beside it. */
export function DeviceFamily({
  title = "Product preview",
  src,
  alt,
  compact = false,
  className,
}: {
  title?: string;
  src: string;
  alt: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("site-device-family", compact && "site-device-family--compact", className)}>
      <p className="site-device-family__label">{title}</p>
      <div className="site-device-family__stage">
        <div className="site-device-family__laptop">
          <LaptopMockup>
            <Shot src={src} alt={`${alt} — laptop`} />
          </LaptopMockup>
        </div>
        <div className="site-device-family__companions">
          <div className="site-device-family__tablet">
            <TabletMockup>
              <Shot src={src} alt={`${alt} — tablet`} />
            </TabletMockup>
          </div>
          <div className="site-device-family__phone">
            <PhoneMockup>
              <Shot src={src} alt={`${alt} — mobile`} />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </div>
  );
}
