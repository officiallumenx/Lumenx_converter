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
import { fees } from "@/lib/mock-data";
import type { FeeItem, Role } from "@lumenx/types";
import { FeeDuesOverviewCard } from "@/components/app/fees/FeeDuesOverviewCard";
import {
  FEE_CATEGORY_LABELS,
  formatInr,
  inferFeeCategory,
  isOutstandingStatus,
  outstandingAmount,
  statusHint,
  summarizeFeeItems,
} from "@/lib/fees-utils";
import {
  Badge,
  Button,
  Checkbox,
  Label,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@lumenx/ui";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import { teacherRepository } from "@/lib/teacher/repositories";
import type { TeacherFeeRecord } from "@/lib/teacher/repositories";
import { ParentFeesContent } from "@/parent-portal/features/fees/ParentFeesContent";

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
  const [classNameFilter, setClassNameFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "due" | "overdue">("all");

  useEffect(() => {
    teacherRepository.getClassFees().then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  const classNames = useMemo(
    () =>
      [...new Set(records.map((r) => r.className))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [records],
  );

  const sections = useMemo(() => {
    const pool =
      classNameFilter === "all"
        ? records
        : records.filter((r) => r.className === classNameFilter);
    return [...new Set(pool.map((r) => r.section))].sort();
  }, [records, classNameFilter]);

  useEffect(() => {
    if (sectionFilter !== "all" && !sections.includes(sectionFilter)) {
      setSectionFilter("all");
    }
  }, [sections, sectionFilter]);

  const scopedRecords = useMemo(() => {
    return records.filter((r) => {
      if (classNameFilter !== "all" && r.className !== classNameFilter) return false;
      if (sectionFilter !== "all" && r.section !== sectionFilter) return false;
      return true;
    });
  }, [records, classNameFilter, sectionFilter]);

  const hasOverdue = (r: TeacherFeeRecord) =>
    r.tuition.status === "overdue" ||
    r.examFee.status === "overdue" ||
    r.transport?.status === "overdue";

  const isFullyPaid = (r: TeacherFeeRecord) => r.totalDue === 0;

  const displayed = useMemo(() => {
    if (statusFilter === "all") return scopedRecords;
    if (statusFilter === "paid") return scopedRecords.filter(isFullyPaid);
    if (statusFilter === "overdue") return scopedRecords.filter(hasOverdue);
    return scopedRecords.filter((r) => r.totalDue > 0);
  }, [scopedRecords, statusFilter]);

  const classSummary = useMemo(() => {
    const totalDue = scopedRecords.reduce((s, r) => s + r.totalDue, 0);
    const pendingStudents = scopedRecords.filter((r) => r.totalDue > 0).length;
    const overdueStudents = scopedRecords.filter(hasOverdue).length;
    const clearedStudents = scopedRecords.filter(isFullyPaid).length;
    const dueOnlyStudents = scopedRecords.filter((r) => r.totalDue > 0 && !hasOverdue(r)).length;
    return {
      totalDue,
      pendingStudents,
      overdueStudents,
      clearedStudents,
      dueOnlyStudents,
      studentCount: scopedRecords.length,
    };
  }, [scopedRecords]);

  const scopeLabel =
    classNameFilter === "all" && sectionFilter === "all"
      ? "All classes"
      : sectionFilter === "all"
        ? `Class ${classNameFilter}`
        : `Class ${classNameFilter}-${sectionFilter}`;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Fees"
        subtitle="Class-wise fee status — filter by class, section, and payment status"
      />

      <ClassSectionFilterRow
        classNameFilter={classNameFilter}
        sectionFilter={sectionFilter}
        classNames={classNames}
        sections={sections}
        onClassChange={(v) => {
          setClassNameFilter(v);
          setSectionFilter("all");
        }}
        onSectionChange={setSectionFilter}
      />

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {scopeLabel} summary
            </p>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-destructive">
              {formatInr(classSummary.totalDue)}
            </p>
            <p className="text-sm text-muted-foreground">Total outstanding fees</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryChip label="Students" value={String(classSummary.studentCount)} />
            <SummaryChip label="Pending" value={String(classSummary.pendingStudents)} tone="warning" />
            <SummaryChip label="Overdue" value={String(classSummary.overdueStudents)} tone="danger" />
            <SummaryChip label="Cleared" value={String(classSummary.clearedStudents)} tone="success" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "due" as const, label: "Due" },
            { id: "overdue" as const, label: "Overdue" },
            { id: "paid" as const, label: "Paid / cleared" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium",
              statusFilter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : displayed.length ? (
        <div className="overflow-x-auto rounded-2xl border shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-3 text-left font-medium">Student</th>
                <th className="p-3 text-left font-medium">Class</th>
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
                    <div className="text-xs text-muted-foreground">Roll {r.roll}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.classLabel}</td>
                  <td className="p-3">
                    <FeeCellBadge amount={r.tuition.amount} status={r.tuition.status} />
                  </td>
                  <td className="p-3">
                    <FeeCellBadge amount={r.examFee.amount} status={r.examFee.status} />
                  </td>
                  <td className="p-3">
                    {r.transport ? (
                      <FeeCellBadge amount={r.transport.amount} status={r.transport.status} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold tabular-nums">
                    {r.totalDue > 0 ? (
                      <span className={hasOverdue(r) ? "text-destructive" : "text-warning-foreground"}>
                        {formatInr(r.totalDue)}
                      </span>
                    ) : (
                      <span className="text-success">Cleared</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          No students match these filters.
        </p>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        Fee data is read-only. Payment processing is handled by admin.
      </p>
    </div>
  );
}

function ClassSectionFilterRow({
  classNameFilter,
  sectionFilter,
  classNames,
  sections,
  onClassChange,
  onSectionChange,
}: {
  classNameFilter: string;
  sectionFilter: string;
  classNames: string[];
  sections: string[];
  onClassChange: (value: string) => void;
  onSectionChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Class</label>
        <Select value={classNameFilter} onValueChange={onClassChange}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100]">
            <SelectItem value="all">All classes</SelectItem>
            {classNames.map((c) => (
              <SelectItem key={c} value={c}>
                Class {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Section</label>
        <Select value={sectionFilter} onValueChange={onSectionChange}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue placeholder="All sections" />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[100]">
            <SelectItem value="all">All sections</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s} value={s}>
                Section {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2 text-center",
        tone === "warning" && "border-warning/30 bg-warning/10",
        tone === "danger" && "border-destructive/30 bg-destructive/10",
        tone === "success" && "border-success/30 bg-success/10",
        tone === "default" && "border-border bg-card",
      )}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-display text-lg font-semibold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function FeeCellBadge({ amount, status }: { amount: number; status: "paid" | "due" | "overdue" }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="tabular-nums text-xs">₹{amount.toLocaleString("en-IN")}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
          status === "paid"
            ? "bg-success/15 text-success"
            : status === "overdue"
              ? "bg-destructive/15 text-destructive"
              : "bg-warning/15 text-warning-foreground",
        )}
      >
        {status}
      </span>
    </div>
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
      <PageHeader
        title="Fees & Payments"
        subtitle="Your fee status, breakdown and payment history"
      />

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
                pendingGeneral.reduce((s, f) => s + outstandingAmount(f.amount, f.status), 0),
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
                {formatInr(pendingExam.reduce((s, f) => s + outstandingAmount(f.amount, f.status), 0))}{" "}
                pending
              </Badge>
            ) : undefined
          }
        >
          <div className="mb-3 flex min-w-0 items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="min-w-0 leading-snug">
              Separate from tuition. Pay before hall tickets, practicals, or viva slots are
              confirmed.
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
          <div className="font-semibold tabular-nums">
            {formatInr(f.status === "paid" ? f.amount : outstandingAmount(f.amount, f.status))}
          </div>
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
