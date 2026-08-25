import { cn } from "@lumenx/ui";
import { Badge, Progress } from "@lumenx/ui";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap,
  Bus,
  FlaskConical,
  Wallet,
  Users,
} from "lucide-react";
import {
  FEE_CATEGORY_LABELS,
  FEE_CATEGORY_ORDER,
  formatInr,
  type ChildFeeSummary,
  type FeeCategory,
  type FeeDuesSummary,
} from "@/lib/fees-utils";

const CATEGORY_ICON: Record<FeeCategory, typeof Wallet> = {
  tuition: Wallet,
  books: Wallet,
  exam: GraduationCap,
  transport: Bus,
  hostel: Clock,
  library: Clock,
  activity: FlaskConical,
  other: Clock,
};

const CATEGORY_CLS: Record<FeeCategory, string> = {
  tuition: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  books: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  exam: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  transport: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
  hostel: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  library: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  activity: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

export function FeeDuesOverviewCard({
  title,
  subtitle,
  summary,
  perChild,
  showProgress,
  selectedChildId = "all",
  onChildSelect,
}: {
  title: string;
  subtitle?: string;
  summary: FeeDuesSummary;
  perChild?: ChildFeeSummary[];
  showProgress?: boolean;
  selectedChildId?: string;
  onChildSelect?: (childId: string) => void;
}) {
  const categories = FEE_CATEGORY_ORDER.filter((c) => summary.byCategory[c] > 0);
  const paidPct =
    summary.totalAnnual > 0 ? Math.round((summary.totalPaid / summary.totalAnnual) * 100) : 0;
  const allClear = summary.totalOutstanding === 0;

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border shadow-soft",
        summary.overdueCount > 0
          ? "border-destructive/30 bg-gradient-to-br from-destructive/[0.04] to-card"
          : "border-border bg-card",
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Wallet className="size-3.5 shrink-0" />
              {title}
            </div>
            {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {summary.overdueCount > 0 && (
              <Badge className="border-0 bg-destructive/15 text-destructive">
                <AlertTriangle className="mr-1 size-3" />
                {summary.overdueCount} overdue
              </Badge>
            )}
            {allClear && (
              <Badge className="border-0 bg-success/15 text-success">
                <CheckCircle2 className="mr-1 size-3" />
                All clear
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">
              {allClear ? "Nothing outstanding" : "Total outstanding"}
            </div>
            <div
              className={cn(
                "font-display text-3xl font-bold tabular-nums sm:text-4xl",
                summary.overdueCount > 0 ? "text-destructive" : "text-foreground",
              )}
            >
              {allClear ? formatInr(0) : formatInr(summary.totalOutstanding)}
            </div>
          </div>
          {!allClear && summary.nextDueLabel && (
            <div className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
              <Clock className="mb-0.5 size-3.5 text-muted-foreground" />
              <div className="font-medium">{summary.nextDueDate}</div>
              <div className="text-xs text-muted-foreground">Earliest due date</div>
            </div>
          )}
        </div>

        {showProgress && summary.totalAnnual > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
              <span>Paid this year</span>
              <span className="tabular-nums">
                {formatInr(summary.totalPaid)} of {formatInr(summary.totalAnnual)} ({paidPct}%)
              </span>
            </div>
            <Progress value={paidPct} className="h-2" />
          </div>
        )}

        {categories.length > 0 && (
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat) => (
              <CategoryChip key={cat} category={cat} amount={summary.byCategory[cat]} />
            ))}
          </div>
        )}

        {perChild && perChild.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Users className="size-3.5" />
              By child
              {onChildSelect && (
                <span className="normal-case font-normal text-[10px]">· tap to filter below</span>
              )}
            </div>
            <ul className="space-y-2">
              {perChild.map((c) => {
                const selected = selectedChildId === c.childId;
                const Wrapper = onChildSelect ? "button" : "div";
                return (
                  <li key={c.childId}>
                    <Wrapper
                      type={onChildSelect ? "button" : undefined}
                      onClick={onChildSelect ? () => onChildSelect(c.childId) : undefined}
                      className={cn(
                        "flex min-w-0 w-full flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm text-left transition-colors",
                        onChildSelect && "cursor-pointer hover:border-primary/40 hover:bg-primary/[0.03]",
                        selected
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                          : "border-border bg-muted/20",
                      )}
                    >
                      <div className="min-w-0">
                        <span className="font-medium">{c.childName}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{c.classLabel}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {c.overdueCount > 0 && (
                          <span className="text-[10px] font-medium text-destructive">
                            {c.overdueCount} overdue
                          </span>
                        )}
                        <span className="font-semibold tabular-nums">
                          {formatInr(c.totalOutstanding)}
                        </span>
                      </div>
                    </Wrapper>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({ category, amount }: { category: FeeCategory; amount: number }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <div className={cn("rounded-xl border p-2.5 sm:p-3", CATEGORY_CLS[category])}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-90">
        <Icon className="size-3 shrink-0" />
        {FEE_CATEGORY_LABELS[category]}
      </div>
      <div className="mt-1 font-display text-base font-semibold tabular-nums sm:text-lg">
        {formatInr(amount)}
      </div>
    </div>
  );
}

export { CATEGORY_CLS, CATEGORY_ICON };
