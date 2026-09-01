import { RemarkForm, RemarkList } from "@/teacher-portal/shared/ui/RemarkForm";
import { Badge, cn } from "@lumenx/ui";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  FileText,
  Mail,
  Phone,
  TrendingUp,
  Users,
} from "lucide-react";
import type { RemarkType, StudentDetail } from "@/lib/teacher/types";

export function StudentDetailPanel({
  detail,
  compact,
  onAddRemark,
  apiMode = false,
}: {
  detail: StudentDetail;
  compact?: boolean;
  onAddRemark?: (type: RemarkType, text: string) => void | Promise<void>;
  apiMode?: boolean;
}) {
  return (
    <div className={cn("space-y-4", compact && "space-y-3")}>
      {detail.growthSummary && !apiMode ? (
        <p className="text-sm text-muted-foreground">{detail.growthSummary}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailSection icon={Users} title="Parent & contact" compact={compact}>
          <dl className="space-y-2 text-sm">
            <Row label="Parent / guardian" value={detail.parentName} />
            <Row label="Phone" value={detail.parentPhone} icon={Phone} />
            {detail.parentEmail ? (
              <Row label="Email" value={detail.parentEmail} icon={Mail} />
            ) : null}
            {detail.email ? <Row label="Student email" value={detail.email} /> : null}
          </dl>
        </DetailSection>

        {!apiMode ? (
          <>
            <DetailSection icon={ClipboardCheck} title="Attendance" compact={compact}>
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <StatBox label="Rate" value={`${detail.attendanceSummary.rate}%`} tone="success" />
                <StatBox label="Present" value={String(detail.attendanceSummary.daysPresent)} />
                <StatBox
                  label="Absent"
                  value={String(detail.attendanceSummary.daysAbsent)}
                  tone="destructive"
                />
              </div>
              {detail.attendanceSummary.recentAbsences.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {detail.attendanceSummary.recentAbsences.map((a) => (
                    <li
                      key={a.date}
                      className="flex justify-between rounded-lg bg-background/80 px-2.5 py-1.5"
                    >
                      <span>{a.date}</span>
                      <span className="text-muted-foreground">{a.reason ?? "Absent"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">No recent absences.</p>
              )}
            </DetailSection>

            <DetailSection icon={TrendingUp} title="Academic performance" compact={compact}>
              <ul className="space-y-1.5">
                {detail.marks.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-border/80 bg-background/60 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{m.exam}</div>
                      <div className="text-xs text-muted-foreground">{m.subject}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums">
                        {m.total}% · {m.grade}
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {m.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </DetailSection>

            <DetailSection icon={BookOpen} title="Pending work" compact={compact}>
              {detail.pendingWork.length ? (
                <ul className="space-y-1.5">
                  {detail.pendingWork.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-start justify-between gap-2 rounded-lg border border-border/80 bg-background/60 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="font-medium line-clamp-2">{w.title}</div>
                        <div className="text-xs capitalize text-muted-foreground">
                          {w.type} · Due {w.dueLabel}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 capitalize text-[10px]",
                          w.status === "late" && "border-destructive/40 text-destructive",
                          w.status === "missing" && "border-warning/40 text-warning-foreground",
                        )}
                      >
                        {w.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No pending homework or assignments.</p>
              )}
            </DetailSection>
          </>
        ) : null}
      </div>

      {!apiMode &&
      (detail.achievements.length > 0 ||
        detail.awards.length > 0 ||
        detail.certificates.length > 0) ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(detail.achievements.length > 0 || detail.awards.length > 0) && (
            <DetailSection icon={Award} title="Achievements" compact={compact}>
              <ul className="space-y-1.5 text-sm">
                {detail.achievements.map((a, i) => (
                  <li key={i} className="rounded-lg bg-background/60 px-3 py-2">
                    {a.title} <span className="text-muted-foreground">· {a.date}</span>
                  </li>
                ))}
                {detail.awards.map((a, i) => (
                  <li key={`aw-${i}`} className="rounded-lg bg-primary/5 px-3 py-2">
                    {a.title} ({a.year})
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}
          {detail.certificates.length > 0 && (
            <DetailSection icon={FileText} title="Certificates" compact={compact}>
              <ul className="space-y-1.5 text-sm">
                {detail.certificates.map((c, i) => (
                  <li
                    key={i}
                    className="flex justify-between rounded-lg bg-background/60 px-3 py-2"
                  >
                    <span>{c.title}</span>
                    <span className="text-muted-foreground">{c.issuedOn}</span>
                  </li>
                ))}
              </ul>
            </DetailSection>
          )}
        </div>
      )}

      {onAddRemark && !apiMode ? (
        <div className="space-y-3 rounded-xl border border-border/80 bg-background/40 p-3">
          <h3 className="text-sm font-semibold">Remarks & feedback</h3>
          <RemarkForm onSubmit={onAddRemark} />
          <RemarkList remarks={detail.remarks} />
        </div>
      ) : !apiMode && detail.remarks.length > 0 ? (
        <div className="rounded-xl border border-border/80 bg-background/40 p-3">
          <h3 className="mb-2 text-sm font-semibold">Remarks</h3>
          <RemarkList remarks={detail.remarks} />
        </div>
      ) : null}
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  compact,
  children,
}: {
  icon: typeof Users;
  title: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("rounded-xl border border-border/80 bg-card/80 p-3", !compact && "sm:p-4")}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: string; icon?: typeof Phone }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className={cn("text-muted-foreground", Icon && "flex items-center gap-1")}>
        {Icon ? <Icon className="size-3.5" /> : null}
        {label}
      </dt>
      <dd className="truncate font-medium text-right">{value}</dd>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "destructive";
}) {
  return (
    <div
      className={cn(
        "rounded-lg p-2",
        tone === "success" && "bg-success/10",
        tone === "destructive" && "bg-destructive/10",
        !tone && "bg-muted/50",
      )}
    >
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "destructive" && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
}
