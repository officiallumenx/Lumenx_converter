import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { experienceAllows, useExperienceTier, usePointerField } from "@/experience";

/** Perspective stage for the hero ecosystem — pointer parallax on depth layers. */
export function DepthStage({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const tier = useExperienceTier();
  const parallax = experienceAllows(tier, "parallax");
  const { ref } = usePointerField(parallax, tier === "high" ? 1 : 0.45);

  return (
    <div
      ref={ref}
      className={cn("eco-stage", parallax && "eco-stage--live", className)}
      data-experience={tier}
    >
      <div className="eco-stage__glow" aria-hidden />
      <div className="eco-stage__mesh" aria-hidden />
      <div className="eco-stage__floor" aria-hidden />
      <div className="eco-stage__content">{children}</div>
    </div>
  );
}
