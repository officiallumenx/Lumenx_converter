import { ArrowLeft } from "lucide-react";
import { cn } from "@lumenx/ui";

export function SportsBackBar({
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
        "inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-sm font-medium text-primary",
        "hover:bg-primary/10 touch-manipulation",
        className,
      )}
    >
      <ArrowLeft className="size-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
