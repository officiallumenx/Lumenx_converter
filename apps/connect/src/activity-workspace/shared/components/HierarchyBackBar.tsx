import { ChevronLeft } from "lucide-react";
import { cn } from "@lumenx/ui";

/** Touch-friendly back control for hierarchy drills. */
export function HierarchyBackBar({
  label,
  onBack,
  className,
}: {
  label: string;
  onBack: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={cn(
        "activity-section-link -ml-2 inline-flex max-w-full items-center gap-0.5 px-2 py-1.5 text-sm font-medium",
        className,
      )}
    >
      <ChevronLeft className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </button>
  );
}
