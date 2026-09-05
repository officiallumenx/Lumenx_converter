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
} from "lucide-react";
import { fees } from "@/lib/mock-data";
import type { FeeItem } from "@lumenx/types";
import { FeeDuesOverviewCard } from "@/components/app/fees/FeeDuesOverviewCard";
import {
  FEE_CATEGORY_LABELS,
  formatInr,
  inferFeeCategory,
  isOutstandingStatus,
  outstandingAmount,
  statusHint,
  summarizeFeeItems,
  summarizeDueRows,
  type FeeCategory,
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
import { downloadTextToDevice } from "@lumenx/utils";
import { downloadFeeReceipt } from "@lumenx/module-fees";
import { useApp } from "@/lib/app-state";
import { teacherRepository } from "@/lib/teacher/repositories";
import type { TeacherFeeRecord } from "@/lib/teacher/repositories";
import { sectionsForClassName, uniqueSortedClassNames } from "@/lib/class-section-options";
import {
  filterTeacherFeeRecords,
  summarizeTeacherFeeScope,
  teacherFeeHasOverdue,
  teacherFeeScopeLabel,
  type TeacherFeeStatusFilter,
} from "@/lib/teacher-fees-query";
import { ParentFeesContent } from "@/parent-portal/features/fees/ParentFeesContent";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadStudentFeePortal, loadTeacherFeeRoster } from "@/lib/fees";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { loadTeacherPortalApiData } from "@/lib/teacher-classes/load";
import type { StudentFeeAccount } from "@lumenx/module-fees";

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
  if (isApiAuthMode()) return <ApiTeacherFeesContent />;
  return <DemoTeacherFeesContent />;
}

function DemoTeacherFeesContent() {
  const [records, setRecords] = useState<TeacherFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [classNameFilter, setClassNameFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TeacherFeeStatusFilter>("all");

  useEffect(() => {
    teacherRepository.getClassFees().then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  const classNames = useMemo(() => uniqueSortedClassNames(records), [records]);

  const sections = useMemo(
    () => sectionsForClassName(records, classNameFilter),
    [records, classNameFilter],
  );

  useEffect(() => {
    if (sectionFilter !== "all" && !sections.includes(sectionFilter)) {
      setSectionFilter("all");
    }
  }, [sections, sectionFilter]);

  const scopedRecords = useMemo(
    () =>
      filterTeacherFeeRecords(records, {
        className: classNameFilter,
        section: sectionFilter,
        status: "all",
      }),
    [records, classNameFilter, sectionFilter],
  );

  const displayed = useMemo(
    () =>
      filterTeacherFeeRecords(records, {
        className: classNameFilter,
        section: sectionFilter,
        status: statusFilter,
      }),
    [records, classNameFilter, sectionFilter, statusFilter],
  );

  const classSummary = useMemo(
    () => summarizeTeacherFeeScope(scopedRecords),
    [scopedRecords],
  );

  const scopeLabel = teacherFeeScopeLabel(classNameFilter, sectionFilter);

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
                      <span className={teacherFeeHasOverdue(r) ? "text-destructive" : "text-warning-foreground"}>
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

function ApiTeacherFeesContent() {
  const { activeInstituteId } = useApp();
  const [records, setRecords] = useState<TeacherFeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classNameFilter, setClassNameFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<TeacherFeeStatusFilter>("all");

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const portal = await loadTeacherPortalApiData(activeInstituteId);
      if (cancelled) return;
      if (!portal || portal.classes.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }
      const sectionIds = portal.classes.map((c) => c.id);
      const result = await loadTeacherFeeRoster({
        instituteId: activeInstituteId,
        sectionIds,
      });
      if (cancelled) return;
      setRecords(result.records);
      setLoadError(result.errorMessage);
      setLoading(false);
    })().catch((err) => {
      if (cancelled) return;
      setLoadError(err instanceof Error ? err.message : "Failed to load class fees");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId]);

  const classNames = useMemo(() => uniqueSortedClassNames(records), [records]);

  const sections = useMemo(
    () => sectionsForClassName(records, classNameFilter),
    [records, classNameFilter],
  );

  useEffect(() => {
    if (sectionFilter !== "all" && !sections.includes(sectionFilter)) {
      setSectionFilter("all");
    }
  }, [sections, sectionFilter]);

  const scopedRecords = useMemo(
    () =>
      filterTeacherFeeRecords(records, {
        className: classNameFilter,
        section: sectionFilter,
        status: "all",
      }),
    [records, classNameFilter, sectionFilter],
  );

  const displayed = useMemo(
    () =>
      filterTeacherFeeRecords(records, {
        className: classNameFilter,
        section: sectionFilter,
        status: statusFilter,
      }),
    [records, classNameFilter, sectionFilter, statusFilter],
  );

  const classSummary = useMemo(
    () => summarizeTeacherFeeScope(scopedRecords),
    [scopedRecords],
  );

  const scopeLabel = teacherFeeScopeLabel(classNameFilter, sectionFilter);

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

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
                <th className="p-3 text-left font-medium">Books</th>
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
                      <span className="text-warning-foreground">{formatInr(r.totalDue)}</span>
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
  if (isApiAuthMode()) return <ApiStudentFeesContent />;
  return <DemoStudentFeesContent />;
}

function DemoStudentFeesContent() {
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
              <FeeScheduleRow key={f.id} f={f} />
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
              <FeeScheduleRow key={f.id} f={f} />
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
          Pay offline at the school office. Download receipts from Payment history after Admin records your payment.
        </p>
      </SectionCard>
    </div>
  );
}

function accountLineStatus(
  account: StudentFeeAccount,
): "paid" | "partial" | "upcoming" {
  if (account.status === "paid") return "paid";
  if (account.status === "partial") return "partial";
  return "upcoming";
}

function ApiStudentFeesContent() {
  const { activeInstituteId } = useApp();
  const [account, setAccount] = useState<StudentFeeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void getConnectApiClient()
      .get<MeResponse>("/api/v1/me")
      .then((me) => {
        if (cancelled) return;
        const id =
          me.identities.students.find((s) => s.instituteId === activeInstituteId)?.studentId ??
          null;
        setStudentId(id);
      })
      .catch(() => {
        if (!cancelled) setStudentId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId]);

  useEffect(() => {
    if (!activeInstituteId || !studentId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadStudentFeePortal({ instituteId: activeInstituteId, studentId }).then((result) => {
      if (cancelled) return;
      setAccount(result.account);
      setLoadError(result.errorMessage);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, studentId]);

  const lineStatus = account ? accountLineStatus(account) : "upcoming";
  const dueRows = useMemo(() => {
    if (!account) return [];
    return account.lines.map((line) => {
      const category: FeeCategory =
        line.categoryKey === "tuition"
          ? "tuition"
          : line.categoryKey === "books"
            ? "books"
            : line.categoryKey === "transport"
              ? "transport"
              : "other";
      return {
        id: line.categoryId,
        title: line.overridden ? `${line.name} (adjusted)` : line.name,
        amount: line.amount,
        due: "Term fees",
        status: lineStatus,
        category,
      };
    });
  }, [account, lineStatus]);

  const summary = useMemo(() => {
    if (!account) {
      return summarizeDueRows([]);
    }
    return {
      ...summarizeDueRows(dueRows),
      totalPaid: account.paid,
      totalOutstanding: account.due,
      totalAnnual: account.billed || account.paid + account.due,
    };
  }, [account, dueRows]);

  const paidPct = Math.round((summary.totalPaid / Math.max(summary.totalAnnual, 1)) * 100);

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Loading fees…</p>;
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {loadError}
      </div>
    );
  }

  if (!account || (account.billed <= 0 && account.payments.length === 0)) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader
          title="Fees & Payments"
          subtitle="Your fee status, breakdown and payment history"
        />
        <p className="rounded-2xl border border-dashed py-10 text-center text-sm text-muted-foreground">
          No published fee schedule for your class yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Fees & Payments"
        subtitle="Your fee status, breakdown and payment history"
      />

      <FeeDuesOverviewCard
        title="Your fee summary"
        subtitle="Outstanding across tuition, books, transport and other charges"
        summary={summary}
        showProgress
      />

      {dueRows.length > 0 && (
        <SectionCard title="Fee breakdown">
          <div className="space-y-2">
            {dueRows.map((row) => (
              <div
                key={row.id}
                className="flex min-w-0 flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {row.status === "paid"
                      ? "Paid in full"
                      : row.status === "partial"
                        ? "Partially paid — balance due at office"
                        : "Due — pay at the school office"}
                  </div>
                </div>
                <div className="font-semibold tabular-nums">{formatInr(row.amount)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {account.payments.length > 0 && (
        <SectionCard title="Payment history">
          <ul className="space-y-2">
            {account.payments.map((payment) => (
              <li
                key={payment.id}
                className="flex min-w-0 items-center justify-between gap-2 rounded-xl border p-3"
              >
                <div>
                  <div className="font-mono text-sm">{payment.receiptNo}</div>
                  <div className="text-xs text-muted-foreground">{payment.paidAt}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatInr(payment.amount)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      downloadFeeReceipt(payment, {
                        billed: account.billed,
                        paidTotal: account.paid,
                        due: account.due,
                      });
                      toast.success("Saved to Downloads");
                    }}
                    aria-label="Download receipt"
                  >
                    <Receipt className="size-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
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
          Pay offline at the school office. Download receipts from Payment history after Admin
          records your payment.
        </p>
      </SectionCard>
    </div>
  );
}

function FeeScheduleRow({ f }: { f: FeeItem }) {
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
        {f.status === "paid" && f.receiptNo && (
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={() => {
              const content = [
                "Test1School",
                "FEE RECEIPT",
                "========================================",
                `Receipt No. : ${f.receiptNo}`,
                `Fee         : ${f.title}`,
                `Amount      : ${formatInr(f.amount)}`,
                `Paid on     : ${f.paidOn ?? "—"}`,
                "----------------------------------------",
                "Paid offline at the school office.",
                "========================================",
                "",
              ].join("\n");
              const { filename } = downloadTextToDevice(
                `${f.receiptNo}.txt`,
                content,
                "text/plain;charset=utf-8",
              );
              toast.success("Saved to Downloads", { description: filename });
            }}
            aria-label="Download receipt"
          >
            <Receipt className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
