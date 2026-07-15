import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { children as allChildren, feeDuesByChild } from "@/lib/mock-data";
import type { FeeItem } from "@lumenx/types";
import { FeeDuesOverviewCard } from "@/components/app/fees/FeeDuesOverviewCard";
import {
  FEE_CATEGORY_LABELS,
  FEE_CATEGORY_ORDER,
  PARENT_FEE_TYPE_FILTERS,
  formatInr,
  inferFeeCategory,
  isOutstandingStatus,
  outstandingAmount,
  statusHint,
  summarizeDueRows,
  summarizeHouseholdFees,
  type FeeCategory,
} from "@/lib/fees-utils";
import { Badge, Button, cn } from "@lumenx/ui";
import { AlertTriangle, CheckCircle2, Clock, Filter } from "lucide-react";
import { toast } from "sonner";

const STATUS: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  paid: { label: "Paid", cls: "bg-success/15 text-success", icon: CheckCircle2 },
  partial: { label: "Partial", cls: "bg-warning/20 text-warning-foreground", icon: Clock },
  overdue: { label: "Overdue", cls: "bg-destructive/15 text-destructive", icon: AlertTriangle },
  upcoming: { label: "Upcoming", cls: "bg-primary/10 text-primary", icon: Clock },
};

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
  const { activeChildId } = useApp();
  const portal = useParentPortal();
  const [childFilter, setChildFilter] = useState<string>("all");
  const [feeTypeFilter, setFeeTypeFilter] = useState<"all" | FeeCategory>("all");

  const household = useMemo(() => summarizeHouseholdFees(allChildren, feeDuesByChild), []);

  const filteredChildren = useMemo(() => {
    if (childFilter === "all") return allChildren;
    return allChildren.filter((c) => c.id === childFilter);
  }, [childFilter]);

  const childSections = useMemo(() => {
    return filteredChildren.map((child) => {
      const rows = (feeDuesByChild[child.id] ?? []).filter((r) => isOutstandingStatus(r.status));
      const typeFiltered =
        feeTypeFilter === "all"
          ? rows
          : rows.filter((row) => {
              const cat = inferFeeCategory(row.title);
              if (feeTypeFilter === "other") return cat === "other" || cat === "activity";
              return cat === feeTypeFilter;
            });
      const summary = summarizeDueRows(typeFiltered);
      const byCategory = FEE_CATEGORY_ORDER.filter((c) =>
        typeFiltered.some((r) => inferFeeCategory(r.title) === c),
      ).map((c) => ({
        category: c,
        rows: typeFiltered.filter((r) => inferFeeCategory(r.title) === c),
      }));
      return { child, rows: typeFiltered, summary, byCategory };
    });
  }, [filteredChildren, feeTypeFilter]);

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
        selectedChildId={childFilter}
        onChildSelect={(id) => setChildFilter(id)}
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
            {PARENT_FEE_TYPE_FILTERS.map((f) => (
              <FilterChip
                key={f.id}
                active={feeTypeFilter === f.id}
                onClick={() => setFeeTypeFilter(f.id)}
              >
                {f.label}
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
        childSections.map(({ child, rows, summary, byCategory }) => (
          <SectionCard
            key={child.id}
            title={`${child.name} · ${child.className} ${child.section}`}
            action={
              summary.totalOutstanding > 0 ? (
                <Badge variant="outline" className="tabular-nums">
                  {formatInr(summary.totalOutstanding)} due
                </Badge>
              ) : (
                <Badge className="border-0 bg-success/15 text-success">Cleared</Badge>
              )
            }
          >
            {child.id === activeChild?.id && (
              <p className="mb-3 text-xs text-primary font-medium">Active learner in header</p>
            )}

            {rows.length === 0 ? (
              <p className="parent-empty-state py-8">
                No outstanding{" "}
                {feeTypeFilter === "all"
                  ? "dues"
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
              <strong className="text-foreground">Examination fees</strong> are separate — pay
              before hall tickets and practicals are released.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-primary">•</span>
            <span>
              <strong className="text-foreground">Transport, hostel & library</strong> fees may have
              different due dates per term.
            </span>
          </li>
        </ul>
        <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
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
    <li className="parent-list-row flex min-w-0 flex-col gap-2 rounded-xl border border-border p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="font-medium break-words">{row.title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{statusHint(row.status, row.due)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className="font-semibold tabular-nums">
          {formatInr(outstandingAmount(row.amount, row.status))}
        </span>
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
