import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Bell,
  GraduationCap,
  Users,
} from "lucide-react";
import { fees, children as allChildren, feeDuesByChild } from "@/lib/mock-data";
import type { FeeItem, Role } from "@lumenx/types";
import { FeeDuesOverviewCard } from "@/components/app/fees/FeeDuesOverviewCard";
import {
  FEE_CATEGORY_LABELS,
  FEE_CATEGORY_ORDER,
  formatInr,
  inferFeeCategory,
  isOutstandingStatus,
  statusHint,
  summarizeDueRows,
  summarizeFeeItems,
  summarizeHouseholdFees,
} from "@/lib/fees-utils";
import { Badge } from "@lumenx/ui";
import { Button } from "@lumenx/ui";
import { Progress } from "@lumenx/ui";
import { Checkbox } from "@lumenx/ui";
import { Label } from "@lumenx/ui";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { teacherRepository } from "@/lib/teacher/repositories";
import type { TeacherFeeRecord } from "@/lib/teacher/repositories";
import { cn } from "@lumenx/ui";

export const Route = createFileRoute("/fees")({
  head: () => ({
    meta: [
      { title: "Fees — LumenX Connect" },
      { name: "description", content: "Pending dues, payment history and fee receipts." },
    ],
  }),
  component: () => (
    <AppShell>
      <FeesPage />
    </AppShell>
  ),
});

const STATUS: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  paid: { label: "Paid", cls: "bg-success/15 text-success", icon: CheckCircle2 },
  partial: { label: "Partial", cls: "bg-warning/20 text-warning-foreground", icon: Clock },
  overdue: { label: "Overdue", cls: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  upcoming: { label: "Upcoming", cls: "bg-primary/10 text-primary", icon: Clock },
};

function FeesPage() {
  const { role } = useApp();
  if (role === "teacher") return <TeacherFeesContent />;
  if (role === "parent") return <ParentFeesContent />;
  return <StudentFeesContent />;
}

function TeacherFeesContent() {
  const [records, setRecords] = useState<TeacherFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "due" | "overdue">("all");

  useEffect(() => {
    teacherRepository.getClassFees().then((r) => { setRecords(r); setLoading(false); });
  }, []);

  const displayed = useMemo(() => {
    if (filter === "all") return records;
    if (filter === "overdue") return records.filter((r) => r.tuition.status === "overdue" || r.examFee.status === "overdue" || r.transport?.status === "overdue");
    return records.filter((r) => r.totalDue > 0);
  }, [records, filter]);

  const totalDue = records.reduce((s, r) => s + r.totalDue, 0);
  const overdueCount = records.filter((r) => r.tuition.status === "overdue" || r.examFee.status === "overdue").length;
  const clearedCount = records.filter((r) => r.totalDue === 0).length;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader title="Fees" subtitle="Class-wise fee status for your students (class teacher view)" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4 shadow-soft">
          <Users className="mb-2 size-4 text-muted-foreground" />
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total students</div>
          <div className="font-display text-xl font-semibold">{records.length}</div>
        </div>
        <div className="rounded-2xl border bg-destructive/5 p-4 shadow-soft">
          <AlertTriangle className="mb-2 size-4 text-destructive" />
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Overdue</div>
          <div className="font-display text-xl font-semibold text-destructive">{overdueCount}</div>
        </div>
        <div className="rounded-2xl border bg-success/5 p-4 shadow-soft col-span-2 sm:col-span-1">
          <CheckCircle2 className="mb-2 size-4 text-success" />
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Cleared</div>
          <div className="font-display text-xl font-semibold text-success">{clearedCount}</div>
        </div>
      </div>
      {totalDue > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <div className="font-medium text-destructive">₹{totalDue.toLocaleString("en-IN")} total outstanding</div>
            <p className="text-sm text-muted-foreground mt-0.5">Across {overdueCount} students with overdue payments.</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {(["all", "due", "overdue"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} className={cn("rounded-full px-3 py-1.5 text-xs font-medium capitalize", filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {f === "all" ? "All students" : f === "due" ? "Has dues" : "Overdue only"}
          </button>
        ))}
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="overflow-x-auto rounded-2xl border shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 text-left font-medium">Student</th>
                <th className="p-3 text-left font-medium">Tuition</th>
                <th className="p-3 text-left font-medium">Exam fee</th>
                <th className="p-3 text-left font-medium">Transport</th>
                <th className="p-3 text-right font-medium">Total due</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((r) => (
                <tr key={r.studentId} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3">
                    <div className="font-medium">{r.studentName}</div>
                    <div className="text-xs text-muted-foreground">Roll {r.roll} · {r.classLabel}</div>
                  </td>
                  <td className="p-3"><FeeCellBadge amount={r.tuition.amount} status={r.tuition.status} /></td>
                  <td className="p-3"><FeeCellBadge amount={r.examFee.amount} status={r.examFee.status} /></td>
                  <td className="p-3">{r.transport ? <FeeCellBadge amount={r.transport.amount} status={r.transport.status} /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-right font-semibold tabular-nums">
                    {r.totalDue > 0 ? <span className="text-destructive">₹{r.totalDue.toLocaleString("en-IN")}</span> : <span className="text-success">Cleared</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-center text-[11px] text-muted-foreground">Fee data is read-only. Payment processing is handled by admin.</p>
    </div>
  );
}

function FeeCellBadge({ amount, status }: { amount: number; status: "paid" | "due" | "overdue" }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="tabular-nums text-xs">₹{amount.toLocaleString("en-IN")}</span>
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", status === "paid" ? "bg-success/15 text-success" : status === "overdue" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning-foreground")}>
        {status}
      </span>
    </div>
  );
}

function ParentFeesContent() {
  const { activeChildId } = useApp();
  const portal = useParentPortal();

  const activeChild =
    portal.isParent && portal.snapshot
      ? portal.snapshot.child
      : (allChildren.find((c) => c.id === activeChildId) ?? allChildren[0]);

  const household = useMemo(
    () => summarizeHouseholdFees(allChildren, feeDuesByChild),
    [],
  );

  const activeSummary = useMemo(() => {
    const rows = (feeDuesByChild[activeChild.id] ?? []).filter((r) =>
      isOutstandingStatus(r.status),
    );
    return summarizeDueRows(rows);
  }, [activeChild.id]);

  const activeRows = (feeDuesByChild[activeChild.id] ?? []).filter((r) =>
    isOutstandingStatus(r.status),
  );

  const activeByCategory = useMemo(() => {
    const map = new Map<string, typeof activeRows>();
    for (const row of activeRows) {
      const cat = inferFeeCategory(row.title);
      const list = map.get(cat) ?? [];
      list.push(row);
      map.set(cat, list);
    }
    return FEE_CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      rows: map.get(c)!,
    }));
  }, [activeRows]);

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Fees & Payments"
        subtitle="Household dues across all linked children — tuition, exams, transport and more"
      />

      <FeeDuesOverviewCard
        title="Household fee summary"
        subtitle={`${allChildren.length} linked children · ${household.perChild.length} with outstanding dues`}
        summary={household.household}
        perChild={household.perChild}
      />

      <div className="space-y-4" key={activeChild.id}>
        <SectionCard
          title={`${activeChild.name} · ${activeChild.className} ${activeChild.section}`}
          action={
            activeSummary.totalOutstanding > 0 ? (
              <Badge variant="outline" className="tabular-nums">
                {formatInr(activeSummary.totalOutstanding)} due
              </Badge>
            ) : (
              <Badge className="border-0 bg-success/15 text-success">Cleared</Badge>
            )
          }
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Switch the active learner in the header to review another child&apos;s breakdown.
          </p>

          {activeRows.length === 0 ? (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No outstanding dues for {activeChild.name}.
            </p>
          ) : (
            <div className="space-y-4">
              {activeByCategory.map(({ category, rows }) => (
                <div key={category}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {FEE_CATEGORY_LABELS[category]}
                  </h3>
                  <ul className="min-w-0 space-y-2">
                    {rows.map((row) => (
                      <ParentDueRow key={row.id} row={row} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="How payments work">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong className="text-foreground">Tuition</strong> is billed quarterly. Partial
              payments show until the instalment is cleared.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong className="text-foreground">Examination fees</strong> are separate — pay before
              hall tickets and practicals are released.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong className="text-foreground">Transport & activity</strong> fees may have
              different due dates per term.
            </span>
          </li>
        </ul>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Online payment and receipts will appear here once the gateway is enabled.
        </p>
      </SectionCard>
    </div>
  );
}

function ParentDueRow({
  row,
}: {
  row: {
    id: string;
    title: string;
    amount: number;
    due: string;
    status: FeeItem["status"];
  };
}) {
  const s = STATUS[row.status];
  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="font-medium break-words">{row.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{statusHint(row.status, row.due)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-semibold tabular-nums">{formatInr(row.amount)}</span>
        <Badge variant="outline" className={cn("border-0", s.cls)}>
          {s.label}
        </Badge>
        {(row.status === "overdue" || row.status === "partial") && (
          <Button
            size="sm"
            className="rounded-lg"
            onClick={() => toast.info("Payment gateway coming soon")}
          >
            Pay
          </Button>
        )}
      </div>
    </li>
  );
}

function StudentFeesContent() {
  const { role } = useApp();
  const [notifyParents, setNotifyParents] = useState(false);

  const summary = useMemo(() => summarizeFeeItems(fees), []);
  const paidPct = Math.round((summary.totalPaid / Math.max(summary.totalAnnual, 1)) * 100);

  const { examFees, generalFees } = useMemo(() => {
    const exam = fees.filter((f) => f.category === "exam");
    const general = fees.filter((f) => f.category !== "exam");
    return { examFees: exam, generalFees: general };
  }, []);

  const overdue = fees.filter((f) => f.status === "overdue");
  const pendingGeneral = generalFees.filter((f) => isOutstandingStatus(f.status));
  const pendingExam = examFees.filter((f) => isOutstandingStatus(f.status));

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader title="Fees & Payments" subtitle="Your fee status, breakdown and payment history" />

      <FeeDuesOverviewCard
        title="Your fee summary"
        subtitle="Outstanding across tuition, exams, transport and other charges"
        summary={summary}
        showProgress
      />

      {role === "student" && overdue.length > 0 && (
        <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">
                {overdue.length} overdue payment{overdue.length > 1 ? "s" : ""}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatInr(overdue.reduce((s, f) => s + f.amount, 0))} needs immediate attention.
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            className="shrink-0 rounded-xl gap-2"
            onClick={() =>
              toast.success(
                "Reminder queued for your parent/guardian. They will see it in LumenX Connect notifications.",
              )
            }
          >
            <Bell className="size-4" /> Remind parent
          </Button>
        </div>
      )}

      {role === "student" && overdue.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
          <Checkbox
            id="fee-parent-nudge"
            checked={notifyParents}
            onCheckedChange={(v) => {
              const on = v === true;
              setNotifyParents(on);
              if (on) {
                toast.success(
                  "Linked parents will get in-app reminders while any instalment stays overdue.",
                );
              }
            }}
          />
          <Label htmlFor="fee-parent-nudge" className="text-sm font-normal leading-snug">
            Keep reminding my parents automatically until overdue fees are cleared
          </Label>
        </div>
      )}

      {pendingGeneral.length > 0 && (
        <SectionCard
          title="Tuition & school fees"
          action={
            <Badge variant="outline" className="tabular-nums">
              {formatInr(
                pendingGeneral.reduce(
                  (s, f) => s + (f.status === "partial" ? Math.round(f.amount * 0.5) : f.amount),
                  0,
                ),
              )}{" "}
              pending
            </Badge>
          }
        >
          <p className="mb-3 text-sm text-muted-foreground">
            Quarterly tuition, transport, and activity charges billed by the institute.
          </p>
          <div className="space-y-2">
            {generalFees.map((f) => (
              <FeeScheduleRow key={f.id} f={f} role={role} />
            ))}
          </div>
        </SectionCard>
      )}

      {examFees.length > 0 && (
        <SectionCard
          title="Examination fees"
          action={
            pendingExam.length > 0 ? (
              <Badge variant="outline" className="tabular-nums">
                {formatInr(
                  pendingExam.reduce((s, f) => s + f.amount, 0),
                )}{" "}
                pending
              </Badge>
            ) : undefined
          }
        >
          <div className="mb-3 flex min-w-0 items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="min-w-0 leading-snug">
              Separate from tuition. Pay before hall tickets, practicals, or viva slots are confirmed.
            </p>
          </div>
          <div className="space-y-2">
            {examFees.map((f) => (
              <FeeScheduleRow key={f.id} f={f} role={role} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Payment progress">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Paid {paidPct}% of annual fees</span>
          <span className="font-medium tabular-nums">
            {formatInr(summary.totalPaid)} / {formatInr(summary.totalAnnual)}
          </span>
        </div>
        <Progress value={paidPct} className="h-2.5" />
        <p className="mt-3 text-[11px] text-muted-foreground">
          Receipt numbers shown are placeholders until online payments are connected.
        </p>
      </SectionCard>
    </div>
  );
}

function FeeScheduleRow({ f, role }: { f: FeeItem; role: Role | null }) {
  const s = STATUS[f.status];
  const Icon = s.icon;
  const category = inferFeeCategory(f.title, f.category);
  const catLabel = FEE_CATEGORY_LABELS[category];

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:gap-3",
        f.status === "overdue" && "border-destructive/25 bg-destructive/[0.02]",
        f.status === "paid" && "opacity-90",
      )}
    >
      <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", s.cls)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{f.title}</span>
          <Badge variant="outline" className="text-[10px] font-normal">
            {catLabel}
          </Badge>
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{f.term}</div>
        <div className="mt-1 text-xs text-muted-foreground">{statusHint(f.status, f.due)}</div>
        {f.receiptNo && f.status === "paid" && (
          <div className="mt-0.5 text-[10px] text-muted-foreground">Receipt {f.receiptNo}</div>
        )}
      </div>
      <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
        <div className="text-right">
          <div className="font-semibold tabular-nums">{formatInr(f.amount)}</div>
          <Badge className={cn("mt-1 border-0", s.cls)}>{s.label}</Badge>
        </div>
        {f.status === "paid" && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() =>
              toast.success("Receipt download will be available once payments are connected")
            }
            aria-label="Download receipt"
          >
            <Receipt className="size-4" />
          </Button>
        )}
        {(f.status === "overdue" || f.status === "partial" || f.status === "upcoming") &&
          role === "parent" && (
            <Button
              size="sm"
              className="shrink-0 rounded-xl"
              onClick={() => toast.info("Payment gateway coming soon")}
            >
              Pay now
            </Button>
          )}
      </div>
    </div>
  );
}
