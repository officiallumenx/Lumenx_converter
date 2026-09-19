import logo from "@/assets/lumenx-admin-logo.png";
import { cn } from "@lumenx/ui";

const HEIGHT = {
  xs: "h-7",
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
  hero: "h-20",
} as const;

/** LumenX Admin brand mark (graduation cap + A + wordmark). */
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
      className={cn("w-auto max-w-full object-contain shrink-0", HEIGHT[size], className)}
      decoding="async"
    />
  );
}
