import { SiteButton, type SiteButtonProps } from "../SiteButton";

/** Conversion-sized button. Compose with `asChild` + Link for routes. */
export function CTAButton({ size = "lg", ...props }: SiteButtonProps) {
  return <SiteButton size={size} {...props} />;
}
