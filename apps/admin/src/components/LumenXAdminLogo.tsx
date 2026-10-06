import logo from "@/assets/lumenx-admin-logo.png";
import { cn } from "@lumenx/ui";

const HEIGHT = {
  xs: "h-7",
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
  hero: "h-24",
} as const;

/** LumenX Admin brand mark (transparent corners). */
export function LumenXAdminLogo({
  className,
  size = "md",
  alt = "LumenX Admin",
}: {
  className?: string;
  size?: keyof typeof HEIGHT;
  alt?: string;
}) {
  return (
    <img
      src={logo}
      alt={alt}
      className={cn(
        "w-auto max-w-full shrink-0 object-contain bg-transparent",
        HEIGHT[size],
        className,
      )}
      decoding="async"
    />
  );
}
