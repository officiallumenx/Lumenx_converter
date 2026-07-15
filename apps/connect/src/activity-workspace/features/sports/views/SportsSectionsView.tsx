import { ChevronRight } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { SportsProgramSection } from "../types";
import { SPORTS_SECTION_ENVIRONMENT_LABELS } from "@/lib/activity/sports/sections-types";

export function SportsSectionsView({
  sections,
  onOpenSection,
  onCreateSection,
}: {
  sections: SportsProgramSection[];
  onOpenSection: (sectionId: string) => void;
  onCreateSection: () => void;
}) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold">Sport sections</h2>
          <p className="text-xs text-muted-foreground">
            Choose a section to manage teams and assign students.
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateSection}
          className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/30"
        >
          Add section
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onOpenSection(section.id)}
            className={cn(
              "flex min-h-[7.5rem] flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-soft",
              "hover:border-primary/30 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <span className="font-medium text-sm">{section.name}</span>
            <span className="mt-1 text-[10px] capitalize text-muted-foreground">
              {SPORTS_SECTION_ENVIRONMENT_LABELS[section.environment]}
            </span>
            <ChevronRight className="mt-auto size-4 text-muted-foreground" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
}
