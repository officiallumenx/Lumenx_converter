import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { exams, fees, performance } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Trophy, Plus, GraduationCap } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import type { FeeItem } from "@/lib/types";

export const Route = createFileRoute("/exams")({
  head: () => ({ meta: [{ title: "Exams — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <ExamsPage />
    </AppShell>
  ),
});

const FEE_STATUS_LABEL: Record<FeeItem["status"], string> = {
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  upcoming: "Upcoming",
};

function ExamsPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const examFees = useMemo(() => fees.filter((f) => f.category === "exam"), []);
  const pendingExamFees = useMemo(() => examFees.filter((f) => f.status !== "paid"), [examFees]);
  const perfRows = snap?.performance ?? performance;
  const lastCard = snap?.reportCards.find((r) => r.status === "published") ?? snap?.reportCards[0];

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Exams & Marks"
        subtitle={
          snap
            ? `Schedule and trends for ${snap.child.name} (${snap.classTag})`
            : "Schedule, results and trends"
        }
        action={
          role === "teacher" ? (
            <Button
              className="gap-2 rounded-xl shadow-glow"
              onClick={() => toast.success("Exam created")}
            >
              <Plus className="size-4" /> New exam
            </Button>
          ) : undefined
        }
      />

      {examFees.length > 0 && (
        <div className="mb-4 min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5 shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">Examination fees</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Pay applicable exam charges on the Fees page before hall tickets and practicals.
                </p>
                <ul className="mt-2 min-w-0 space-y-2 text-sm">
                  {examFees.map((f) => (
                    <li
                      key={f.id}
                      className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-b border-border pb-2 last:border-0 last:pb-0"
                    >
                      <span className="min-w-0 break-words font-medium">{f.title}</span>
                      <span className="flex shrink-0 items-center gap-2 tabular-nums">
                        <span className="text-muted-foreground">
                          ₹{f.amount.toLocaleString("en-IN")}
                        </span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs">
                          {FEE_STATUS_LABEL[f.status]}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
                {pendingExamFees.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pendingExamFees.length} item{pendingExamFees.length > 1 ? "s" : ""} still need
                    payment.
                  </p>
                )}
              </div>
            </div>
            <Button asChild variant="outline" className="w-full shrink-0 rounded-xl sm:w-auto">
              <Link to="/fees">Open fees</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2">
          <h3 className="mb-3 flex min-w-0 items-center gap-2 font-semibold">
            <CalendarDays className="size-4 shrink-0 text-primary" />{" "}
            <span className="min-w-0 truncate">Upcoming exams</span>
          </h3>
          <div className="min-w-0 space-y-2">
            {exams.map((e) => (
              <div
                key={e.id}
                className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 sm:gap-3"
              >
                <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-center font-display text-sm font-semibold leading-tight text-primary">
                  {e.date.split(" ")[1]}
                  <br />
                  {e.date.split(" ")[2]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {e.duration} • {e.room}
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                  {e.subject}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="size-4 text-warning-foreground" /> Last exam
          </h3>
          <div className="text-4xl font-display font-bold">
            {lastCard ? `${lastCard.percentage}%` : "87%"}
          </div>
          <div className="text-sm text-muted-foreground">
            {lastCard ? `Class rank #${lastCard.rank} of 48` : "Class rank #7 of 48"}
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Highest" value="96%" />
            <Row label="Class average" value="72%" />
            <Row label="Improvement" value="+5%" tone="success" />
          </div>
        </div>
      </div>

      <div
        key={snap?.child.id ?? "exams-default"}
        className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 mt-4"
      >
        <h3 className="mb-3 font-semibold">Subject-wise marks</h3>
        <div className="h-72 w-full min-w-0 max-w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perfRows}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.92 0.01 250)" />
              <XAxis
                dataKey="subject"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="oklch(0.5 0.02 260)"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="oklch(0.5 0.02 260)"
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="score" fill="oklch(0.55 0.22 260)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div className="flex min-w-0 justify-between gap-2">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span
        className={
          tone === "success" ? "text-success shrink-0 font-medium" : "shrink-0 font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
