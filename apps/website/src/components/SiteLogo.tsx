import { cn } from "@lumenx/ui";

export function SiteLogo({
  className,
  markOnly = false,
}: {
  className?: string;
  markOnly?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/brand/lumenx-logo.png"
        alt="LumenX"
        width={256}
        height={256}
        decoding="async"
        fetchPriority="low"
        className={cn("h-10 w-auto object-contain object-left", markOnly && "h-9")}
      />
      {markOnly ? <span className="sr-only">LumenX</span> : null}
    </span>
  );
}
