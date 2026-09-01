import { useMemo, useState, useEffect, type ReactNode } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { children as allChildren } from "@/lib/mock-data";
import { FeeDuesOverviewCard } from "@/components/app/fees/FeeDuesOverviewCard";
import {
  FEE_CATEGORY_LABELS,
  FEE_CATEGORY_ORDER,
  formatInr,
  inferFeeCategory,
  summarizeDueRows,
  type FeeCategory,
  type FeeDuesSummary,
  type ChildFeeSummary,
} from "@/lib/fees-utils";
import { useFeesCatalog } from "@/lib/use-fees-catalog";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadParentFeesPortals } from "@/lib/fees";
import type { StudentDto } from "@/lib/students/types";
import {
  downloadFeeReceipt,
  getStudentFeeAccount,
  type FeeCategoryKey,
  type FeeLineItem,
  type FeePaymentRecord,
  type StudentFeeAccount,
} from "@lumenx/module-fees";
import { Badge, Button, cn } from "@lumenx/ui";
import { AlertTriangle, CheckCircle2, Clock, Download, Filter, Receipt } from "lucide-react";
import { toast } from "sonner";

const STATUS: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  paid: { label: "Paid", cls: "bg-success/15 text-success", icon: CheckCircle2 },
  partial: { label: "Partial", cls: "bg-warning/20 text-warning-foreground", icon: Clock },
  overdue: { label: "Overdue", cls: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  upcoming: { label: "Due", cls: "bg-primary/10 text-primary", icon: Clock },
  due: { label: "Due", cls: "bg-primary/10 text-primary", icon: Clock },
};

const METHOD_LABEL: Record<FeePaymentRecord["method"], string> = {
  cash: "Cash",
  cheque: "Cheque",
  upi_office: "UPI (office)",
  bank_transfer: "Bank transfer",
  other: "Other",
};

function mapKeyToFilter(key: FeeCategoryKey): FeeCategory {
  if (key === "tuition") return "tuition";
  if (key === "books") return "books";
  if (key === "transport") return "transport";
  return "other";
}

function lineStatus(
  account: StudentFeeAccount,
): "paid" | "partial" | "upcoming" {
  if (account.status === "paid") return "paid";
  if (account.status === "partial") return "partial";
  return "upcoming";
}

function linesToDueRows(childId: string, lines: FeeLineItem[], account: StudentFeeAccount) {
  const status = lineStatus(account);
  return lines.map((line) => ({
    id: `${childId}-${line.categoryId}`,
    title: line.overridden ? `${line.name} (adjusted)` : `${line.name} Fee`,
    amount: line.amount,
    due: "Term fees",
    status,
    category: mapKeyToFilter(line.categoryKey),
    overridden: line.overridden,
    note: line.note,
  }));
}

function emptyBreakdown(): FeeDuesSummary["byCategory"] {
  return {
    tuition: 0,
    books: 0,
    exam: 0,
    transport: 0,
    hostel: 0,
    library: 0,
    activity: 0,
    other: 0,
  };
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("parent-filter-chip", active && "is-active")}
    >
      {children}
    </button>
  );
}

export function ParentFeesContent() {
  if (isApiAuthMode()) return <ApiParentFeesContent />;
  return <DemoParentFeesContent />;
}

type ParentChild = {
  id: string;
  name: string;
  className: string;
  section: string;
};

function studentToChild(student: StudentDto): ParentChild {
  return {
    id: student.id,
    name: student.displayName?.trim() || `${student.firstName} ${student.surname}`.trim(),
    className: student.classLabel?.trim() || "Class",
    section: student.sectionLabel?.trim() || "—",
  };
}

function DemoParentFeesContent() {
  const { activeChildId } = useApp();
  const portal = useParentPortal();
  const { snapshot } = useFeesCatalog();
  const [childFilter, setChildFilter] = useState<string>("all");
  const [feeTypeFilter, setFeeTypeFilter] = useState<"all" | FeeCategory>("all");

  const accountsByChild = useMemo(() => {
    const map: Record<string, StudentFeeAccount> = {};
    for (const child of allChildren) {
      map[child.id] = getStudentFeeAccount(snapshot, {
        studentId: child.id,
        classKey: child.className,
      });
    }
    return map;
  }, [snapshot]);

  const duesByChild = useMemo(() => {
    const map: Record<string, ReturnType<typeof linesToDueRows>> = {};
    for (const child of allChildren) {
      const account = accountsByChild[child.id]!;
      map[child.id] = linesToDueRows(child.id, account.lines, account);
    }
    return map;
  }, [accountsByChild]);

  const household = useMemo(() => {
    const byCategory = emptyBreakdown();
    let totalOutstanding = 0;
    let totalPaid = 0;
    let totalAnnual = 0;
    let overdueCount = 0;
    const perChild: ChildFeeSummary[] = [];

    for (const child of allChildren) {
      const account = accountsByChild[child.id]!;
      const rows = duesByChild[child.id] ?? [];
      const childCat = emptyBreakdown();
      for (const row of rows) {
        if (account.due <= 0) continue;
        const cat = row.category ?? inferFeeCategory(row.title);
        // Proportional outstanding by line when partially paid
        const share =
          account.billed > 0
            ? Math.round((row.amount / account.billed) * account.due)
            : row.amount;
        childCat[cat] += share;
        byCategory[cat] += share;
      }
      totalOutstanding += account.due;
      totalPaid += account.paid;
      totalAnnual += account.billed;
      if (account.status === "due" && account.billed > 0) overdueCount += 0; // not date-based
      perChild.push({
        childId: child.id,
        childName: child.name,
        classLabel: `${child.className} ${child.section}`,
        totalOutstanding: account.due,
        byCategory: childCat,
        overdueCount: 0,
      });
    }

    const summary: FeeDuesSummary = {
      totalOutstanding,
      totalPaid,
      totalAnnual: totalAnnual || totalOutstanding + totalPaid,
      byCategory,
      overdueCount,
      dueSoonCount: perChild.filter((c) => c.totalOutstanding > 0).length,
      nextDueDate: null,
      nextDueLabel: totalOutstanding > 0 ? "Pay at the school office" : null,
    };

    return { household: summary, perChild };
  }, [accountsByChild, duesByChild]);

  const paymentHistory = useMemo(() => {
    const rows: { childName: string; payment: FeePaymentRecord; account: StudentFeeAccount }[] = [];
    for (const child of allChildren) {
      if (childFilter !== "all" && child.id !== childFilter) continue;
      const account = accountsByChild[child.id]!;
      for (const payment of account.payments) {
        rows.push({ childName: child.name, payment, account });
      }
    }
    return rows.sort((a, b) =>
      b.payment.paidAt.localeCompare(a.payment.paidAt) ||
      b.payment.recordedAt.localeCompare(a.payment.recordedAt),
    );
  }, [accountsByChild, childFilter]);

  const filteredChildren = useMemo(() => {
    if (childFilter === "all") return allChildren;
    return allChildren.filter((c) => c.id === childFilter);
  }, [childFilter]);

  const childSections = useMemo(() => {
    return filteredChildren.map((child) => {
      const account = accountsByChild[child.id]!;
      const rows = duesByChild[child.id] ?? [];
      const typeFiltered =
        feeTypeFilter === "all"
          ? rows
          : rows.filter((row) => {
              const cat = row.category ?? inferFeeCategory(row.title);
              if (feeTypeFilter === "other") return cat === "other" || cat === "activity";
              return cat === feeTypeFilter;
            });
      const summary = {
        ...summarizeDueRows(typeFiltered),
        totalPaid: account.paid,
        totalOutstanding: account.due,
        totalAnnual: account.billed || account.paid + account.due,
      };
      const byCategory = FEE_CATEGORY_ORDER.filter((c) =>
        typeFiltered.some((r) => (r.category ?? inferFeeCategory(r.title)) === c),
      ).map((c) => ({
        category: c,
        rows: typeFiltered.filter((r) => (r.category ?? inferFeeCategory(r.title)) === c),
      }));
      return { child, rows: typeFiltered, summary, byCategory, account };
    });
  }, [filteredChildren, feeTypeFilter, duesByChild, accountsByChild]);

  const activeChild =
    portal.isParent && portal.snapshot
      ? portal.snapshot.child
      : (allChildren.find((c) => c.id === activeChildId) ?? allChildren[0]);

  const filterLabel = useMemo(() => {
    const childPart =
      childFilter === "all"
        ? "All children"
        : (allChildren.find((c) => c.id === childFilter)?.name ?? "Selected child");
    const typePart =
      feeTypeFilter === "all" ? "all fee types" : FEE_CATEGORY_LABELS[feeTypeFilter].toLowerCase();
    return `${childPart} · ${typePart}`;
  }, [childFilter, feeTypeFilter]);

  const downloadReceipt = (payment: FeePaymentRecord, account: StudentFeeAccount) => {
    downloadFeeReceipt(payment, {
      billed: account.billed,
      paidTotal: account.paid,
      due: account.due,
    });
    toast.success("Saved to Downloads", { description: `${payment.receiptNo}.txt` });
  };

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Fees"
        subtitle="Fee summary, dues, and office payment receipts for your children"
      />

      <FeeDuesOverviewCard
        title="Household fee summary"
        subtitle={`${allChildren.length} linked children · Paid & Due update when the office records payment`}
        summary={household.household}
        perChild={household.perChild}
        selectedChildId={childFilter}
        onChildSelect={(id) => setChildFilter(id)}
        showProgress
      />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="size-4 text-primary shrink-0" />
          Filter fees
        </div>

        {allChildren.length > 1 && (
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">By child</div>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={childFilter === "all"} onClick={() => setChildFilter("all")}>
                All children
              </FilterChip>
              {allChildren.map((c) => (
                <FilterChip
                  key={c.id}
                  active={childFilter === c.id}
                  onClick={() => setChildFilter(c.id)}
                >
                  {c.name.split(" ")[0]} · {c.className}-{c.section}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">By fee type</div>
          <div className="flex flex-wrap gap-2">
            {(["all", "tuition", "books", "transport", "other"] as const).map((id) => (
              <FilterChip
                key={id}
                active={feeTypeFilter === id}
                onClick={() => setFeeTypeFilter(id)}
              >
                {id === "all" ? "All types" : FEE_CATEGORY_LABELS[id]}
              </FilterChip>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filterLabel}</span>
        </p>
      </section>

      {childSections.length === 0 ? (
        <div className="parent-empty-state">No fees match the selected filters.</div>
      ) : (
        childSections.map(({ child, rows, summary, byCategory, account }) => (
          <SectionCard
            key={child.id}
            title={`${child.name} · ${child.className} ${child.section}`}
            action={
              account.status === "paid" ? (
                <Badge className="border-0 bg-success/15 text-success">Paid</Badge>
              ) : account.status === "partial" ? (
                <Badge variant="outline" className="tabular-nums border-0 bg-warning/15 text-warning-foreground">
                  {formatInr(account.due)} due
                </Badge>
              ) : summary.totalOutstanding > 0 ? (
                <Badge variant="outline" className="tabular-nums">
                  {formatInr(account.due)} due
                </Badge>
              ) : (
                <Badge className="border-0 bg-success/15 text-success">Cleared</Badge>
              )
            }
          >
            {child.id === activeChild?.id && (
              <p className="mb-3 text-xs text-primary font-medium">Active learner in header</p>
            )}

            <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                <div className="text-muted-foreground">Total</div>
                <div className="mt-0.5 font-semibold tabular-nums">{formatInr(account.billed)}</div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                <div className="text-muted-foreground">Paid</div>
                <div className="mt-0.5 font-semibold tabular-nums text-success">
                  {formatInr(account.paid)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                <div className="text-muted-foreground">Due</div>
                <div className="mt-0.5 font-semibold tabular-nums">{formatInr(account.due)}</div>
              </div>
            </div>

            {rows.length === 0 ? (
              <p className="parent-empty-state py-8">
                No{" "}
                {feeTypeFilter === "all"
                  ? "published dues"
                  : FEE_CATEGORY_LABELS[feeTypeFilter].toLowerCase()}{" "}
                for {child.name}.
              </p>
            ) : (
              <div className="space-y-4">
                {byCategory.map(({ category, rows: catRows }) => (
                  <div key={category}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {FEE_CATEGORY_LABELS[category]}
                    </h3>
                    <ul className="min-w-0 space-y-2">
                      {catRows.map((row) => (
                        <ParentDueRow key={row.id} row={row} />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ))
      )}

      <SectionCard title="Payment history">
        {paymentHistory.length === 0 ? (
          <p className="parent-empty-state py-6">
            No office payments recorded yet. After you pay at school, Admin will record it and
            receipts will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {paymentHistory.map(({ childName, payment, account }) => (
              <li
                key={payment.id}
                className="flex min-w-0 flex-col gap-2 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Receipt className="size-4 text-primary shrink-0" />
                    <span className="font-medium font-mono text-sm">{payment.receiptNo}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {METHOD_LABEL[payment.method]}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {childName} · {payment.paidAt}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatInr(payment.amount)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5"
                    onClick={() => downloadReceipt(payment, account)}
                  >
                    <Download className="size-3.5" />
                    Receipt
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="About fee amounts">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              Pay offline at the school office. Admin records the payment — Paid, Due, and Status
              update automatically.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              Download receipts from Payment history after the office records your payment.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              Concessions adjusted for one child appear only for that child — not for siblings.
            </span>
          </li>
        </ul>
      </SectionCard>
    </div>
  );
}

function ApiParentFeesContent() {
  const { activeChildId, activeInstituteId, setActiveChildId } = useApp();
  const portal = useParentPortal();
  const [childrenRows, setChildrenRows] = useState<ParentChild[]>([]);
  const [accountsByChild, setAccountsByChild] = useState<
    Record<string, import("@lumenx/module-fees").StudentFeeAccount>
  >({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [childFilter, setChildFilter] = useState<string>("all");
  const [feeTypeFilter, setFeeTypeFilter] = useState<"all" | FeeCategory>("all");

  useEffect(() => {
    if (!activeInstituteId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loadParentFeesPortals({ instituteId: activeInstituteId }).then((result) => {
      if (cancelled) return;
      const kids = result.students.map(studentToChild);
      setChildrenRows(kids);
      const map: Record<string, import("@lumenx/module-fees").StudentFeeAccount> = {};
      for (const [id, account] of result.accountsByStudentId) {
        map[id] = account;
      }
      setAccountsByChild(map);
      setLoadError(result.errorMessage);
      setLoading(false);
      if (kids.length > 0) {
        const valid = activeChildId && kids.some((c) => c.id === activeChildId);
        const next = valid ? activeChildId : kids[0]!.id;
        if (next !== activeChildId) setActiveChildId(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeInstituteId, activeChildId, setActiveChildId]);

  const duesByChild = useMemo(() => {
    const map: Record<string, ReturnType<typeof linesToDueRows>> = {};
    for (const child of childrenRows) {
      const account = accountsByChild[child.id];
      if (!account) continue;
      map[child.id] = linesToDueRows(child.id, account.lines, account);
    }
    return map;
  }, [accountsByChild, childrenRows]);

  const household = useMemo(() => {
    const byCategory = emptyBreakdown();
    let totalOutstanding = 0;
    let totalPaid = 0;
    let totalAnnual = 0;
    const perChild: ChildFeeSummary[] = [];

    for (const child of childrenRows) {
      const account = accountsByChild[child.id];
      if (!account) continue;
      const rows = duesByChild[child.id] ?? [];
      const childCat = emptyBreakdown();
      for (const row of rows) {
        if (account.due <= 0) continue;
        const cat = row.category ?? inferFeeCategory(row.title);
        const share =
          account.billed > 0
            ? Math.round((row.amount / account.billed) * account.due)
            : row.amount;
        childCat[cat] += share;
        byCategory[cat] += share;
      }
      totalOutstanding += account.due;
      totalPaid += account.paid;
      totalAnnual += account.billed;
      perChild.push({
        childId: child.id,
        childName: child.name,
        classLabel: `${child.className} ${child.section}`,
        totalOutstanding: account.due,
        byCategory: childCat,
        overdueCount: 0,
      });
    }

    return {
      household: {
        totalOutstanding,
        totalPaid,
        totalAnnual: totalAnnual || totalOutstanding + totalPaid,
        byCategory,
        overdueCount: 0,
        dueSoonCount: perChild.filter((c) => c.totalOutstanding > 0).length,
        nextDueDate: null,
        nextDueLabel: totalOutstanding > 0 ? "Pay at the school office" : null,
      } satisfies FeeDuesSummary,
      perChild,
    };
  }, [accountsByChild, childrenRows, duesByChild]);

  const paymentHistory = useMemo(() => {
    const rows: {
      childName: string;
      payment: import("@lumenx/module-fees").FeePaymentRecord;
      account: import("@lumenx/module-fees").StudentFeeAccount;
    }[] = [];
    for (const child of childrenRows) {
      if (childFilter !== "all" && child.id !== childFilter) continue;
      const account = accountsByChild[child.id];
      if (!account) continue;
      for (const payment of account.payments) {
        rows.push({ childName: child.name, payment, account });
      }
    }
    return rows.sort(
      (a, b) =>
        b.payment.paidAt.localeCompare(a.payment.paidAt) ||
        b.payment.recordedAt.localeCompare(a.payment.recordedAt),
    );
  }, [accountsByChild, childFilter, childrenRows]);

  const filteredChildren = useMemo(() => {
    if (childFilter === "all") return childrenRows;
    return childrenRows.filter((c) => c.id === childFilter);
  }, [childFilter, childrenRows]);

  const childSections = useMemo(() => {
    return filteredChildren.map((child) => {
      const account = accountsByChild[child.id];
      if (!account) {
        return {
          child,
          rows: [] as ReturnType<typeof linesToDueRows>,
          summary: summarizeDueRows([]),
          byCategory: [] as { category: FeeCategory; rows: ReturnType<typeof linesToDueRows> }[],
          account: null,
        };
      }
      const rows = duesByChild[child.id] ?? [];
      const typeFiltered =
        feeTypeFilter === "all"
          ? rows
          : rows.filter((row) => {
              const cat = row.category ?? inferFeeCategory(row.title);
              if (feeTypeFilter === "other") return cat === "other" || cat === "activity";
              return cat === feeTypeFilter;
            });
      const summary = {
        ...summarizeDueRows(typeFiltered),
        totalPaid: account.paid,
        totalOutstanding: account.due,
        totalAnnual: account.billed || account.paid + account.due,
      };
      const byCategory = FEE_CATEGORY_ORDER.filter((c) =>
        typeFiltered.some((r) => (r.category ?? inferFeeCategory(r.title)) === c),
      ).map((c) => ({
        category: c,
        rows: typeFiltered.filter((r) => (r.category ?? inferFeeCategory(r.title)) === c),
      }));
      return { child, rows: typeFiltered, summary, byCategory, account };
    });
  }, [filteredChildren, feeTypeFilter, duesByChild, accountsByChild]);

  const activeChild =
    portal.isParent && portal.snapshot
      ? portal.snapshot.child
      : (childrenRows.find((c) => c.id === activeChildId) ?? childrenRows[0]);

  const filterLabel = useMemo(() => {
    const childPart =
      childFilter === "all"
        ? "All children"
        : (childrenRows.find((c) => c.id === childFilter)?.name ?? "Selected child");
    const typePart =
      feeTypeFilter === "all" ? "all fee types" : FEE_CATEGORY_LABELS[feeTypeFilter].toLowerCase();
    return `${childPart} · ${typePart}`;
  }, [childFilter, childrenRows, feeTypeFilter]);

  const downloadReceipt = (
    payment: import("@lumenx/module-fees").FeePaymentRecord,
    account: import("@lumenx/module-fees").StudentFeeAccount,
  ) => {
    downloadFeeReceipt(payment, {
      billed: account.billed,
      paidTotal: account.paid,
      due: account.due,
    });
    toast.success("Saved to Downloads", { description: `${payment.receiptNo}.txt` });
  };

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

  if (childrenRows.length === 0) {
    return (
      <div className="parent-empty-state">
        No linked students found for this institute.
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Fees"
        subtitle="Fee summary, dues, and office payment receipts for your children"
      />

      <FeeDuesOverviewCard
        title="Household fee summary"
        subtitle={`${childrenRows.length} linked children · Paid & Due update when the office records payment`}
        summary={household.household}
        perChild={household.perChild}
        selectedChildId={childFilter}
        onChildSelect={(id) => setChildFilter(id)}
        showProgress
      />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="size-4 text-primary shrink-0" />
          Filter fees
        </div>

        {childrenRows.length > 1 && (
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">By child</div>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={childFilter === "all"} onClick={() => setChildFilter("all")}>
                All children
              </FilterChip>
              {childrenRows.map((c) => (
                <FilterChip
                  key={c.id}
                  active={childFilter === c.id}
                  onClick={() => setChildFilter(c.id)}
                >
                  {c.name.split(" ")[0]} · {c.className}-{c.section}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 text-xs font-medium text-muted-foreground">By fee type</div>
          <div className="flex flex-wrap gap-2">
            {(["all", "tuition", "books", "transport", "other"] as const).map((id) => (
              <FilterChip
                key={id}
                active={feeTypeFilter === id}
                onClick={() => setFeeTypeFilter(id)}
              >
                {id === "all" ? "All types" : FEE_CATEGORY_LABELS[id]}
              </FilterChip>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filterLabel}</span>
        </p>
      </section>

      {childSections.length === 0 ? (
        <div className="parent-empty-state">No fees match the selected filters.</div>
      ) : (
        childSections.map(({ child, rows, summary, byCategory, account }) =>
          account ? (
            <SectionCard
              key={child.id}
              title={`${child.name} · ${child.className} ${child.section}`}
              action={
                account.status === "paid" ? (
                  <Badge className="border-0 bg-success/15 text-success">Paid</Badge>
                ) : account.status === "partial" ? (
                  <Badge
                    variant="outline"
                    className="tabular-nums border-0 bg-warning/15 text-warning-foreground"
                  >
                    {formatInr(account.due)} due
                  </Badge>
                ) : summary.totalOutstanding > 0 ? (
                  <Badge variant="outline" className="tabular-nums">
                    {formatInr(account.due)} due
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-success/15 text-success">Cleared</Badge>
                )
              }
            >
              {child.id === activeChild?.id && (
                <p className="mb-3 text-xs text-primary font-medium">Active learner in header</p>
              )}

              <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                  <div className="text-muted-foreground">Total</div>
                  <div className="mt-0.5 font-semibold tabular-nums">{formatInr(account.billed)}</div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                  <div className="text-muted-foreground">Paid</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-success">
                    {formatInr(account.paid)}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-2.5">
                  <div className="text-muted-foreground">Due</div>
                  <div className="mt-0.5 font-semibold tabular-nums">{formatInr(account.due)}</div>
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="parent-empty-state py-8">
                  No{" "}
                  {feeTypeFilter === "all"
                    ? "published dues"
                    : FEE_CATEGORY_LABELS[feeTypeFilter].toLowerCase()}{" "}
                  for {child.name}.
                </p>
              ) : (
                <div className="space-y-4">
                  {byCategory.map(({ category, rows: catRows }) => (
                    <div key={category}>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {FEE_CATEGORY_LABELS[category]}
                      </h3>
                      <ul className="min-w-0 space-y-2">
                        {catRows.map((row) => (
                          <ParentDueRow key={row.id} row={row} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          ) : null,
        )
      )}

      <SectionCard title="Payment history">
        {paymentHistory.length === 0 ? (
          <p className="parent-empty-state py-6">
            No office payments recorded yet. After you pay at school, Admin will record it and
            receipts will appear here.
          </p>
        ) : (
          <ul className="space-y-2">
            {paymentHistory.map(({ childName, payment, account }) => (
              <li
                key={payment.id}
                className="flex min-w-0 flex-col gap-2 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Receipt className="size-4 text-primary shrink-0" />
                    <span className="font-medium font-mono text-sm">{payment.receiptNo}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {METHOD_LABEL[payment.method]}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {childName} · {payment.paidAt}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-semibold tabular-nums">{formatInr(payment.amount)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5"
                    onClick={() => downloadReceipt(payment, account)}
                  >
                    <Download className="size-3.5" />
                    Receipt
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="About fee amounts">
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              Pay offline at the school office. Admin records the payment — Paid, Due, and Status
              update automatically.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              Download receipts from Payment history after the office records your payment.
            </span>
          </li>
        </ul>
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
    status: "paid" | "partial" | "overdue" | "upcoming";
    overridden?: boolean;
    note?: string;
  };
}) {
  const s = STATUS[row.status] ?? STATUS.upcoming;
  return (
    <li className="parent-list-row flex min-w-0 flex-col gap-2 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="font-medium break-words">{row.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {row.status === "paid"
            ? "Paid in full"
            : row.status === "partial"
              ? "Partially paid — balance due at office"
              : "Due — pay at the school office"}
        </div>
        {row.overridden && row.note ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{row.note}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-semibold tabular-nums">{formatInr(row.amount)}</span>
        <Badge variant="outline" className={cn("border-0", s.cls)}>
          {row.overridden && row.status !== "paid" ? "Adjusted" : s.label}
        </Badge>
      </div>
    </li>
  );
}
