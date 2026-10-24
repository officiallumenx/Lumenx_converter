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
        src="/brand/lumenx-mark.png"
        alt="LumenX"
        width={160}
        height={160}
        decoding="async"
        fetchPriority="low"
        className={cn("h-10 w-auto object-contain object-left", markOnly && "h-9")}
      />
      {markOnly ? <span className="sr-only">LumenX</span> : null}
    </span>
  );
}
