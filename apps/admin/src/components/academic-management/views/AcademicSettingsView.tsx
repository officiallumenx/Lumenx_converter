import { useEffect, useRef, useState } from "react";
import { Card, CardBody, CardHeader, PageStack } from "@lumenx/ui-admin";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  INITIAL_PROMOTION_WORKFLOW,
  type PromotionWorkflow,
} from "@/lib/academic-management-data";
import { AttendanceConfigurationPanel } from "@/components/academic-management/views/AttendanceConfigurationPanel";
import { AttendanceNotificationConfigPanel } from "@/components/academic-management/views/AttendanceNotificationConfigPanel";
import {
  getInstituteSettings,
  updateInstituteSettings,
  useInstituteContext,
} from "@/lib/institutes";

function parsePromotionWorkflow(value: unknown): PromotionWorkflow {
  return value === "before_result" || value === "after_result"
    ? value
    : INITIAL_PROMOTION_WORKFLOW;
}

export function AcademicSettingsView() {
  if (isApiAuthMode()) {
    return <AcademicSettingsApiView />;
  }
  return <AcademicSettingsDemoView />;
}

function AcademicSettingsDemoView() {
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

function AcademicSettingsApiView() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [workflow, setWorkflow] = useState<PromotionWorkflow>(INITIAL_PROMOTION_WORKFLOW);
  const [existingSettings, setExistingSettings] = useState<Record<string, unknown>>({});
  const [loadHint, setLoadHint] = useState<string | null>("Loading institute settings…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setLoadHint("Loading institute settings…");
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setLoadHint(instituteCtx.errorMessage ?? "Unable to load institute settings.");
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setLoadHint("Select an institute to manage promotion workflow.");
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadHint("Loading institute settings…");

    void getInstituteSettings(requestInstituteId)
      .then((settings) => {
        if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
        const bag =
          settings.settings && typeof settings.settings === "object"
            ? { ...settings.settings }
            : {};
        setExistingSettings(bag);
        setWorkflow(parsePromotionWorkflow(bag.promotionWorkflow));
        setLoadHint(null);
      })
      .catch((err) => {
        if (cancelled || activeInstituteIdRef.current !== requestInstituteId) return;
        setLoadHint(err instanceof Error ? err.message : "Failed to load institute settings.");
      });

    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  const persistWorkflow = (next: PromotionWorkflow) => {
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId || saving) return;
    const previous = workflow;
    setWorkflow(next);
    setSaving(true);
    void updateInstituteSettings(instituteId, {
      settings: { ...existingSettings, promotionWorkflow: next },
    })
      .then((settings) => {
        const bag =
          settings.settings && typeof settings.settings === "object"
            ? { ...settings.settings }
            : { ...existingSettings, promotionWorkflow: next };
        setExistingSettings(bag);
        setWorkflow(parsePromotionWorkflow(bag.promotionWorkflow));
        notify("Promotion workflow saved");
      })
      .catch((err) => {
        setWorkflow(previous);
        notify(err instanceof Error ? err.message : "Failed to save promotion workflow");
      })
      .finally(() => {
        setSaving(false);
      });
  };

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
          {loadHint ? (
            <p className="text-xs text-muted-foreground">{loadHint}</p>
          ) : (
            <>
              <WorkflowOption
                selected={workflow === "before_result"}
                title="Promote Before Result Publication"
                description="Allow promotion decisions before final results are published."
                onSelect={() => persistWorkflow("before_result")}
              />
              <WorkflowOption
                selected={workflow === "after_result"}
                title="Promote After Result Publication"
                description="Promote only after results are published for the current year."
                onSelect={() => persistWorkflow("after_result")}
              />
              <p className="text-xs text-muted-foreground pt-1">
                Saved to institute settings
                {saving ? " · saving…" : ""}.
              </p>
            </>
          )}
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
