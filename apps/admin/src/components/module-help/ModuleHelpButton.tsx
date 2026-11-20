import { Info } from "lucide-react";

export function ModuleHelpButton({
  title,
  onClick,
}: {
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="lx-module-help-btn"
      aria-label={`Help: ${title}`}
      title={`Help: ${title}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Info className="size-4" aria-hidden />
    </button>
  );
}
