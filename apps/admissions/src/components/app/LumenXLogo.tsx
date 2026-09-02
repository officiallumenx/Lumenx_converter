import logo from "@/assets/lumenx-logo.png";
import { cn } from "@lumenx/ui";

const HEIGHT = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
  hero: "h-20",
} as const;

export function LumenXLogo({
  className,
  size = "md",
  alt = "LumenX",
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
