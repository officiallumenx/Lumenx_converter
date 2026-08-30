import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  PageStack,
  Pill,
} from "@lumenx/ui-admin";
import {
  isPublished,
  listKnownClassKeys,
  publishFees,
  unpublishFees,
  type FeesSnapshot,
} from "@lumenx/module-fees";
import {
  notifyFeeDue,
  notifyFeeDueReminder,
  notifyFeeOverdue,
  pushFeesParentInbox,
} from "@lumenx/notifications";
import { useAdminToast } from "@/components/AdminActionToast";
import { prependAdminNotification } from "@/lib/notification-center-store";
import { FeesClassChecklist } from "@/components/fees/FeesClassChecklist";
import { publishFeePlan, unpublishFeePlan } from "@/lib/fees";

export function FeesPublishView({
  snapshot,
  onChange,
  writesEnabled = true,
  apiMode = false,
  feePlanId = null,
  classIdByLabel = {},
  onApiReload,
}: {
  snapshot: FeesSnapshot;
  onChange: (next: FeesSnapshot) => void;
  writesEnabled?: boolean;
  apiMode?: boolean;
  feePlanId?: string | null;
  classIdByLabel?: Record<string, string>;
  onApiReload?: () => void;
}) {
  const notify = useAdminToast();
  const classKeys = useMemo(() => listKnownClassKeys(snapshot), [snapshot]);
  const published = isPublished(snapshot);
  const [scopeAll, setScopeAll] = useState(
    snapshot.publish.scope.type === "institute",
  );
  const [selected, setSelected] = useState<string[]>(() =>
    snapshot.publish.scope.type === "classes"
      ? [...snapshot.publish.scope.classKeys]
      : [],
  );

  const doPublish = () => {
    if (!writesEnabled) return;
    if (!scopeAll && selected.length === 0) {
      notify("Select at least one class");
      return;
    }
    if (apiMode) {
      if (!feePlanId) {
        notify("No fee plan available");
        return;
      }
      const publishedClassIds = scopeAll
        ? undefined
        : selected.map((ck) => classIdByLabel[ck]).filter(Boolean);
      if (!scopeAll && (!publishedClassIds || publishedClassIds.length === 0)) {
        notify("Select classes with valid class ids");
        return;
      }
      void publishFeePlan(feePlanId, {
        publishScope: scopeAll ? "institute" : "classes",
        publishedClassIds,
      })
        .then(() => {
          onApiReload?.();
          notify(
            scopeAll
              ? "Fees published for entire institute"
              : `Fees published for ${selected.length} classes`,
          );
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to publish fees");
        });
      return;
    }
    const next = publishFees(
      snapshot,
      scopeAll ? { type: "institute" } : { type: "classes", classKeys: selected },
    );
    onChange(next);
    try {
      const dueDate = new Date().toISOString().slice(0, 10);
      const due = notifyFeeDue({
        feeLabel: "Published fee structure",
        amount: "See Fees",
        dueDate,
      });
      const reminder = notifyFeeDueReminder({
        feeLabel: "Fee structure",
        amount: "See Fees",
        dueDate,
      });
      const overdue = notifyFeeOverdue({
        feeLabel: "Outstanding published fees",
        amount: "See Fees",
        dueDate,
      });
      pushFeesParentInbox(due.appNotification);
      pushFeesParentInbox(reminder.appNotification);
      // Overdue is available for parents with past-due balances; emit once on publish cycle.
      pushFeesParentInbox(overdue.appNotification);
      prependAdminNotification({
        id: due.appNotification.id,
        title: due.appNotification.title,
        desc: due.appNotification.desc,
        time: "Just now",
        type: "info",
        category: "fees",
        unread: true,
        priority: "high",
        createdAt: new Date().toISOString(),
        href: "/fees",
        templateId: due.foundation.templateId,
      });
    } catch {
      /* best-effort */
    }
    notify(
      scopeAll
        ? "Fees published for entire institute"
        : `Fees published for ${selected.length} classes`,
    );
  };

  const doUnpublish = () => {
    if (!writesEnabled) return;
    if (apiMode) {
      if (!feePlanId) {
        notify("No fee plan available");
        return;
      }
      void unpublishFeePlan(feePlanId)
        .then(() => {
          onApiReload?.();
          notify("Fees set to draft — parents will not see dues until republished");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to unpublish fees");
        });
      return;
    }
    onChange(unpublishFees(snapshot));
    notify("Fees set to draft — parents will not see dues until republished");
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Publish fee structure"
          hint="Parents in Connect see amounts only after publish"
          action={
            published ? (
              <Pill tone="success">Published</Pill>
            ) : (
              <Pill tone="warning">Draft</Pill>
            )
          }
        />
        <CardBody className="space-y-4">
          <div className="space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Publish to
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!writesEnabled}
                onMouseDown={(e) => {
                  if (!writesEnabled) return;
                  e.preventDefault();
                  setScopeAll(true);
                }}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  scopeAll
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Entire institute
                <div className="mt-0.5 text-[10px] font-normal opacity-80">All classes</div>
              </button>
              <button
                type="button"
                disabled={!writesEnabled}
                onMouseDown={(e) => {
                  if (!writesEnabled) return;
                  e.preventDefault();
                  setScopeAll(false);
                  setSelected([]);
                }}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  !scopeAll
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Selected classes
                <div className="mt-0.5 text-[10px] font-normal opacity-80">
                  Pick which classes
                </div>
              </button>
            </div>
          </div>

          {!scopeAll ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Classes <span className="text-destructive">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Click to select · X to remove
                </span>
              </div>
              <FeesClassChecklist
                classKeys={classKeys}
                selected={selected}
                onChange={setSelected}
              />
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
            Publishing makes class defaults (and assigned extras) visible to parents. Per-student
            concessions still apply only to that student’s parent account.
          </div>

          <div className="flex flex-wrap gap-2">
            {writesEnabled ? (
            <>
            <Button size="sm" variant="primary" onClick={doPublish}>
              Publish
            </Button>
            {published ? (
              <Button size="sm" onClick={doUnpublish}>
                Revert to draft
              </Button>
            ) : null}
            </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Publish and unpublish are not enabled in API read-only mode.
              </p>
            )}
          </div>
        </CardBody>
      </Card>
    </PageStack>
  );
}
