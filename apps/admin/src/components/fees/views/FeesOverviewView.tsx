import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  KpiGrid,
  Kpi,
  Button,
  Pill,
  PageStack,
} from "@lumenx/ui-admin";
import {
  formatInr,
  isPublished,
  listKnownClassKeys,
  summarizeFeesOverview,
  type FeesSnapshot,
} from "@lumenx/module-fees";
import type { FeesHubView } from "@/routes/fees";
import type { FeesStudentOption } from "@/lib/fees-students";

function compactInr(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)} L`;
  return formatInr(amount);
}

export function FeesOverviewView({
  snapshot,
  onNavigate,
  studentOptions,
  studentsPickerReady = true,
}: {
  snapshot: FeesSnapshot;
  onNavigate: (v: FeesHubView) => void;
  studentOptions: FeesStudentOption[];
  studentsPickerReady?: boolean;
}) {
  const published = isPublished(snapshot);
  const classKeys = listKnownClassKeys(snapshot);
  const customCount = snapshot.categories.filter((c) => c.key === "custom").length;
  const overrideCount = snapshot.overrides.length;

  const totals = useMemo(
    () =>
      studentsPickerReady
        ? summarizeFeesOverview(
            snapshot,
            studentOptions.map((s) => ({
              studentId: s.id,
              classKey: s.classKey,
            })),
          )
        : null,
    [snapshot, studentOptions, studentsPickerReady],
  );

  const countLabel = (value: number) =>
    studentsPickerReady ? String(value) : "…";
  const amountLabel = (value: number) =>
    studentsPickerReady ? compactInr(value) : "…";

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi
          label="Total fees"
          value={totals ? amountLabel(totals.totalFees) : "…"}
          delta={`${countLabel(totals?.studentCount ?? 0)} students`}
        />
        <Kpi
          label="Paid"
          value={totals ? amountLabel(totals.paid) : "…"}
          tone="up"
          delta={`${countLabel(totals?.fullyPaidCount ?? 0)} cleared`}
        />
        <Kpi
          label="Due"
          value={totals ? amountLabel(totals.due) : "…"}
          tone={totals && totals.due > 0 ? "down" : "neutral"}
          delta={`${countLabel((totals?.unpaidCount ?? 0) + (totals?.partiallyPaidCount ?? 0))} pending`}
        />
        <Kpi
          label="Collection rate"
          value={totals ? `${totals.collectionRate}%` : "…"}
          tone={totals && totals.collectionRate >= 70 ? "up" : "neutral"}
          delta={published ? "Published" : "Draft"}
        />
      </KpiGrid>

      <KpiGrid cols={4}>
        <Kpi label="Classes" value={String(classKeys.length)} />
        <Kpi label="Extra categories" value={String(customCount)} />
        <Kpi label="Concessions" value={String(overrideCount)} />
        <Kpi
          label="Partial payments"
          value={countLabel(totals?.partiallyPaidCount ?? 0)}
          delta="Office collections"
        />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Fee structure"
          hint="Class fees → transport → extras → publish → student concessions"
        />
        <CardBody className="space-y-3 text-sm text-muted-foreground">
          <p>
            Parents in Connect see <span className="text-foreground font-medium">published</span>{" "}
            class amounts. A concession for one student appears only on that child’s parent
            account.
          </p>
          <p>
            Totals above use assigned fees minus offline office collections. Parents pay at
            school; Admin records payment and staff can print the receipt at the counter.
          </p>
          {published && snapshot.publish.publishedAt ? (
            <p className="text-xs">
              Last published{" "}
              <span className="font-mono text-foreground">
                {snapshot.publish.publishedAt.slice(0, 10)}
              </span>
              {" · "}
              {snapshot.publish.scope.type === "institute" ? (
                <Pill tone="success">Entire institute</Pill>
              ) : (
                <Pill tone="neutral">
                  {snapshot.publish.scope.classKeys.length} classes
                </Pill>
              )}
            </p>
          ) : null}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">Billed</div>
              <div className="font-mono text-foreground mt-0.5">
                {totals ? formatInr(totals.totalFees) : "…"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">Collected</div>
              <div className="font-mono text-foreground mt-0.5">
                {totals ? formatInr(totals.paid) : "…"}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="text-muted-foreground">Outstanding</div>
              <div className="font-mono text-foreground mt-0.5">
                {totals ? formatInr(totals.due) : "…"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="primary" onClick={() => onNavigate("class-fees")}>
              Class fees
            </Button>
            <Button size="sm" onClick={() => onNavigate("transport")}>
              Transport fees
            </Button>
            <Button size="sm" onClick={() => onNavigate("publish")}>
              Publish
            </Button>
            <Button size="sm" onClick={() => onNavigate("students")}>
              Student concessions
            </Button>
          </div>
        </CardBody>
      </Card>
    </PageStack>
  );
}
