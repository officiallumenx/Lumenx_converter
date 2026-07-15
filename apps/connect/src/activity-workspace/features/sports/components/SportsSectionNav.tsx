import { Plus } from "lucide-react";
import { Button, cn } from "@lumenx/ui";
import type { SportsProgramSection } from "../types";
import { SPORTS_SECTION_ENVIRONMENT_LABELS } from "@/lib/activity/sports/sections-types";

export function SportsSectionNav({
  sections,
  activeSectionId,
  onChange,
  onCreateSection,
  className,
}: {
  sections: SportsProgramSection[];
  activeSectionId: string | null;
  onChange: (sectionId: string) => void;
  onCreateSection: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Sport sections</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg gap-1 text-xs"
          onClick={onCreateSection}
        >
          <Plus className="size-3.5" aria-hidden />
          Add section
        </Button>
      </div>
      <nav
        aria-label="Sport sections"
        className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1 -mx-1 px-1 scrollbar-none"
      >
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onChange(section.id)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex shrink-0 flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors touch-manipulation min-w-[7rem]",
                isActive
                  ? "border-primary bg-primary text-primary-foreground shadow-soft"
                  : "border-border bg-card text-foreground hover:border-primary/30 hover:bg-primary/[0.04]",
              )}
            >
              <span className="text-sm font-medium whitespace-nowrap">{section.name}</span>
              <span
                className={cn(
                  "text-[10px] capitalize",
                  isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {SPORTS_SECTION_ENVIRONMENT_LABELS[section.environment]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
