import { PageHeader } from "@/components/app/PageHeader";
import { LayoutGrid } from "lucide-react";

type ModulePlaceholderProps = {
  title: string;
  subtitle?: string;
};

/**
 * Routing scaffold only — full module UI is implemented in later phases.
 */
export function ModulePlaceholder({ title, subtitle }: ModulePlaceholderProps) {
  const message =
    subtitle ?? "Activity module scaffold — implementation will be added in a dedicated phase.";

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title={title} />
      <div className="activity-empty-state flex flex-col items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <LayoutGrid className="size-6" aria-hidden />
        </div>
        <p className="max-w-md">{message}</p>
      </div>
    </div>
  );
}
