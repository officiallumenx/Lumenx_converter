import { useState } from "react";
import { Card, CardBody, CardHeader, PageStack } from "@lumenx/ui-admin";
import {
  INITIAL_PROMOTION_WORKFLOW,
  type PromotionWorkflow,
} from "@/lib/academic-management-data";
import { AttendanceConfigurationPanel } from "@/components/academic-management/views/AttendanceConfigurationPanel";
import { AttendanceNotificationConfigPanel } from "@/components/academic-management/views/AttendanceNotificationConfigPanel";

export function AcademicSettingsView() {
  const [workflow, setWorkflow] = useState<PromotionWorkflow>(INITIAL_PROMOTION_WORKFLOW);

  return (
    <PageStack>
      <AttendanceConfigurationPanel />
      <AttendanceNotificationConfigPanel />

      <Card>
        <CardHeader
          title="Promotion workflow"
          hint="When students may be promoted relative to result publication"
        />
        <CardBody className="space-y-3">
          <WorkflowOption
            selected={workflow === "before_result"}
            title="Promote Before Result Publication"
            description="Allow promotion decisions before final results are published."
            onSelect={() => setWorkflow("before_result")}
          />
          <WorkflowOption
            selected={workflow === "after_result"}
            title="Promote After Result Publication"
            description="Promote only after results are published for the current year."
            onSelect={() => setWorkflow("after_result")}
          />
          <p className="text-xs text-muted-foreground pt-1">
            UI preference only — not connected to a backend.
          </p>
        </CardBody>
      </Card>
    </PageStack>
  );
}

function WorkflowOption({
  selected,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
        selected
          ? "border-primary/40 bg-primary/[0.06] ring-1 ring-primary/20"
          : "border-border bg-card hover:bg-muted/30"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
        <span
          className={`mt-0.5 size-4 shrink-0 rounded-full border-2 ${
            selected ? "border-primary bg-primary" : "border-muted-foreground/40"
          }`}
          aria-hidden
        />
      </div>
    </button>
  );
}
