import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import {
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Receipt,
  Bell,
  GraduationCap,
} from "lucide-react";
import { fees, feeSummary, children as allChildren, feeDuesByChild } from "@/lib/mock-data";
import type { FeeItem, Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fees")({
  head: () => ({
    meta: [
      { title: "Fees — Unify" },
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
  if (role === "parent") return <ParentFeesContent />;
  return <StudentFeesContent />;
}

function ParentFeesContent() {
  const { activeChildId } = useApp();
  const portal = useParentPortal();

  const activeChild =
    portal.isParent && portal.snapshot
      ? portal.snapshot.child
      : (allChildren.find((c) => c.id === activeChildId) ?? allChildren[0]);

  const { examFees } = useMemo(() => {
    const exam = fees.filter((f) => f.category === "exam");
    return { examFees: exam };
  }, []);

  const parentOverdue = useMemo(() => {
    const rows: { childName: string; title: string; amount: number; due: string }[] = [];
    for (const c of allChildren) {
      for (const row of feeDuesByChild[c.id] ?? []) {
        if (row.status === "overdue")
          rows.push({ childName: c.name, title: row.title, amount: row.amount, due: row.due });
      }
    }
    return rows;
  }, []);

  const activeRows = (feeDuesByChild[activeChild.id] ?? []).filter((f) => f.status !== "paid");

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Fees"
        subtitle={`Outstanding dues for ${activeChild.name}. Use the header switcher or Home to change the active learner.`}
      />

      {parentOverdue.length > 0 && (
        <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-start">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-destructive">Overdue across your children</div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {parentOverdue.map((r, i) => (
                <li key={`${r.childName}-${i}`}>
                  <span className="font-medium text-foreground">{r.childName}</span>: {r.title} — ₹
                  {r.amount.toLocaleString("en-IN")} (due {r.due})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="mb-4 space-y-4" key={activeChild.id}>
        <SectionCard
          title={`${activeChild.name} · ${activeChild.className} ${activeChild.section}`}
          className="ring-2 ring-primary/25 ring-offset-2 ring-offset-background"
        >
          {activeRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No outstanding dues for this child.</p>
          ) : (
            <ul className="min-w-0 space-y-3">
              {activeRows.map((row) => (
                <li
                  key={row.id}
                  className="flex min-w-0 flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-medium break-words">{row.title}</div>
                    <div className="text-xs text-muted-foreground">Due {row.due}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      ₹{row.amount.toLocaleString("en-IN")}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        row.status === "overdue" && "border-destructive/40 text-destructive",
                      )}
                    >
                      {row.status === "partial"
                        ? "Partial"
                        : row.status === "overdue"
                          ? "Overdue"
                          : "Due"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <p className="text-xs text-muted-foreground">
          Other linked children: switch the active learner in the bar above to review their dues in
          isolation.
        </p>
      </div>

      {examFees.length > 0 && (
        <SectionCard title="Examination fees (institute-wide)" className="mb-4">
          <div className="space-y-2">
            {examFees.map((f) => (
              <FeeScheduleRow key={f.id} f={f} role="parent" />
            ))}
          </div>
        </SectionCard>
      )}

      <p className="text-center text-[11px] text-muted-foreground">
        Payment history and receipts will appear here after the payment gateway is enabled.
      </p>
    </div>
  );
}

function StudentFeesContent() {
  const { role } = useApp();
  const [notifyParents, setNotifyParents] = useState(false);
  const paidPct = Math.round((feeSummary.paid / feeSummary.total) * 100);
  const { examFees, generalFees } = useMemo(() => {
    const exam = fees.filter((f) => f.category === "exam");
    const general = fees.filter((f) => f.category !== "exam");
    return { examFees: exam, generalFees: general };
  }, []);
  const overdue = fees.filter((f) => f.status === "overdue");

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader title="Fees" subtitle="Your fee status and history" />

      {role === "student" && (
        <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-medium">Need a parent to follow up?</div>
            <p className="text-sm text-muted-foreground">
              Sends an in-app reminder to linked guardians (push where the parent app allows it).
            </p>
          </div>
          <Button
            variant="outline"
            className="shrink-0 rounded-xl gap-2"
            onClick={() =>
              toast.success(
                "Reminder queued for your parent/guardian. They will see it in Unify notifications.",
              )
            }
          >
            <Bell className="size-4" /> Remind parent
          </Button>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="mb-4 flex min-w-0 flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-start">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <div className="font-medium text-destructive">
              {overdue.length} overdue payment{overdue.length > 1 ? "s" : ""}
            </div>
            <div className="text-sm text-muted-foreground">
              Total ₹{overdue.reduce((s, f) => s + f.amount, 0).toLocaleString("en-IN")} pending.
              Please clear at the earliest.
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-xl shrink-0"
            onClick={() => toast.success("Reminder sent")}
          >
            <Bell className="size-4 mr-1.5" /> Remind me
          </Button>
        </div>
      )}

      {role === "student" && overdue.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
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

      <div className="mb-4 grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          icon={Wallet}
          label="Total annual"
          value={`₹${feeSummary.total.toLocaleString("en-IN")}`}
          tone="default"
        />
        <SummaryStat
          icon={CheckCircle2}
          label="Paid"
          value={`₹${feeSummary.paid.toLocaleString("en-IN")}`}
          tone="success"
        />
        <SummaryStat
          icon={AlertTriangle}
          label="Outstanding"
          value={`₹${feeSummary.due.toLocaleString("en-IN")}`}
          tone="warning"
        />
        <SummaryStat icon={Clock} label="Next due" value={feeSummary.nextDue} tone="primary" />
      </div>

      <SectionCard title="Year progress" className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Paid {paidPct}% of annual fees</span>
          <span className="font-medium">
            ₹{feeSummary.paid.toLocaleString("en-IN")} / ₹{feeSummary.total.toLocaleString("en-IN")}
          </span>
        </div>
        <Progress value={paidPct} className="h-2.5" />
      </SectionCard>

      {examFees.length > 0 && (
        <SectionCard title="Examination fees" className="mb-4">
          <div className="mb-3 flex min-w-0 items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="min-w-0 leading-snug">
              These charges are separate from tuition. Clear them before hall tickets or practical
              slots are released, per school policy.
            </p>
          </div>
          <div className="space-y-2">
            {examFees.map((f) => (
              <FeeScheduleRow key={f.id} f={f} role={role} />
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Fee history & schedule">
        <div className="space-y-2">
          {generalFees.map((f) => (
            <FeeScheduleRow key={f.id} f={f} role={role} />
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4">
          Payments integration is coming soon. Receipt numbers shown are placeholders.
        </p>
      </SectionCard>
    </div>
  );
}

function FeeScheduleRow({ f, role }: { f: FeeItem; role: Role | null }) {
  const s = STATUS[f.status];
  const Icon = s.icon;
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:gap-3">
      <div className={cn("size-10 shrink-0 grid place-items-center rounded-xl", s.cls)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {f.title} <span className="text-xs font-normal text-muted-foreground">• {f.term}</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          Due {f.due}
          {f.paidOn && ` • Paid ${f.paidOn}`}
          {f.receiptNo && ` • ${f.receiptNo}`}
        </div>
      </div>
      <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:flex-nowrap">
        <div className="text-right">
          <div className="font-semibold tabular-nums">₹{f.amount.toLocaleString("en-IN")}</div>
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
        {(f.status === "overdue" || f.status === "partial") && role === "parent" && (
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

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone: "default" | "success" | "warning" | "primary";
}) {
  const cls = {
    default: "bg-card",
    success: "bg-success/10",
    warning: "bg-warning/10",
    primary: "bg-primary/10",
  }[tone];
  const iconCls = {
    default: "bg-muted text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    primary: "bg-primary/15 text-primary",
  }[tone];
  return (
    <div className={cn("min-w-0 rounded-2xl border border-border p-4 shadow-soft md:p-5", cls)}>
      <div className="flex min-w-0 items-center gap-3">
        <div className={cn("size-10 rounded-xl grid place-items-center", iconCls)}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            {label}
          </div>
          <div className="font-display text-lg md:text-xl font-semibold leading-tight truncate">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}
