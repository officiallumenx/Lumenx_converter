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
        alt=""
        width={256}
        height={256}
        decoding="async"
        fetchPriority="low"
        className={cn("h-9 w-auto object-contain object-left", markOnly && "h-8")}
      />
      {markOnly ? <span className="sr-only">LumenX</span> : null}
    </span>
  );
}
