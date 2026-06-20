import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, KpiGrid, Pill, Button, PageStack } from "@lumenx/ui-admin";
import {
  BRANCHES, CRITICAL_CLASSES, EXAM_PIPELINE, ATTENDANCE_MONTHLY,
} from "@/lib/admin-analytics-data";
import {
  Users, GraduationCap, ClipboardCheck, AlertTriangle, TrendingUp,
  FileDown, Send, ArrowUpRight, UserPlus, CalendarRange, Megaphone, CalendarDays,
  MessageSquareWarning, FileText, HardDrive, Building2, BookOpen, Heart, Sparkles,
  Clock, CheckCircle2, AlertCircle, ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Command Center — LumenX Admin" }] }),
  component: Dashboard,
});

const weakStudents = [
  { name: "Julian Draxler", id: "JD", grade: "11-C", subject: "Physics", score: 42, delta: -12 },
  { name: "Alina Moreno", id: "AM", grade: "9-A", subject: "Mathematics", score: 38, delta: -8 },
  { name: "Ethan Wright", id: "EW", grade: "10-B", subject: "Chemistry", score: 51, delta: -4 },
  { name: "Sana Khan", id: "SK", grade: "12-A", subject: "Biology", score: 56, delta: -2 },
];

const activity = [
  { who: "Sarah Jenkins", what: "uploaded marks for", target: "MTH-101 · Mid-term", time: "2m ago", icon: FileText, tone: "primary" },
  { who: "Marcus Whitfield", what: "submitted attendance for", target: "Grade 10-B", time: "8m ago", icon: ClipboardCheck, tone: "success" },
  { who: "Front Office", what: "resolved complaint", target: "#CMP-2104 (Lab safety)", time: "14m ago", icon: CheckCircle2, tone: "success" },
  { who: "Admin R. Chen", what: "updated timetable for", target: "Grade 11 · Term 2", time: "21m ago", icon: CalendarRange, tone: "primary" },
  { who: "System", what: "auto-enrolled", target: "12 new admissions to Grade 9", time: "37m ago", icon: UserPlus, tone: "muted" },
  { who: "Liang Ortega", what: "assigned Hana Suzuki to", target: "CHEM-220 · Tue P5", time: "1h ago", icon: GraduationCap, tone: "primary" },
  { who: "Dept Head · Science", what: "approved 14 student credentials in", target: "Science Department", time: "1h ago", icon: ShieldCheck, tone: "success" },
  { who: "Sub-Admin", what: "flagged complaint as urgent in", target: "Parent Portal", time: "2h ago", icon: AlertCircle, tone: "danger" },
];

const quickActions = [
  { label: "Add Student", to: "/students", icon: UserPlus, tone: "primary" },
  { label: "Add Teacher", to: "/teachers", icon: GraduationCap, tone: "info" },
  { label: "Create Timetable", to: "/timetable", icon: CalendarRange, tone: "info" },
  { label: "Send Announcement", to: "/announcements", icon: Megaphone, tone: "warning" },
  { label: "Create Event", to: "/events", icon: CalendarDays, tone: "success" },
  { label: "Open Complaints", to: "/complaints", icon: MessageSquareWarning, tone: "danger" },
  { label: "Upload Marks", to: "/marks", icon: FileText, tone: "primary" },
  { label: "Schedule Exam", to: "/exams", icon: FileText, tone: "info" },
] as const;

const toneBg = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

const perfTone = { high: "success", medium: "warning", low: "danger" } as const;

function Dashboard() {
  const [branchId, setBranchId] = useState(BRANCHES[0]!.id);
  const branch = useMemo(() => BRANCHES.find((b) => b.id === branchId) ?? BRANCHES[0]!, [branchId]);
  const attTrend = ATTENDANCE_MONTHLY.slice(-6);

  return (
    <AppShell
      title="Institute Intelligence"
      subtitle={`${branch.name} · Session 2025–26 · Growth & operational overview`}
      actions={
        <>
          <Link to="/reports"><Button><FileDown className="size-3.5" /> Export Report</Button></Link>
          <Link to="/notifications"><Button variant="primary"><Send className="size-3.5" /> Compose Alert</Button></Link>
        </>
      }
    >
      <PageStack>
      {/* Branch switcher */}
      <div className="lx-branch-grid">
        {BRANCHES.map((b) => {
          const active = b.id === branchId;
          const dot = perfTone[b.performance];
          return (
            <button key={b.id} onClick={() => setBranchId(b.id)}
              className={`lx-branch-tile rounded-xl border transition-all ${active ? "border-primary/40 bg-primary/5" : "border-border bg-surface hover:bg-surface-hover"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`size-2.5 shrink-0 rounded-full ${dot === "success" ? "bg-success" : dot === "warning" ? "bg-warning" : "bg-destructive"}`} />
                  <span className="text-sm font-semibold truncate">{b.name}</span>
                </div>
                {active && <Pill tone="info">Selected</Pill>}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-muted-foreground">
                <span className="truncate">{b.students.toLocaleString()} students</span>
                <span className="truncate">{b.attendance}% att.</span>
                <span className={`truncate ${b.growth >= 0 ? "text-success" : "text-destructive"}`}>{b.growth >= 0 ? "+" : ""}{b.growth}% growth</span>
              </div>
            </button>
          );
        })}
      </div>

      <KpiGrid cols={6}>
        <Kpi label="Students" value={branch.students.toLocaleString()} delta="+124 YTD" tone="up" icon={<Users />} />
        <Kpi label="Teachers" value="186" delta="+4 staff" tone="up" icon={<GraduationCap />} />
        <Kpi label="Classes" value="42" delta="126 sections" icon={<Building2 />} />
        <Kpi label="Attendance" value={`${branch.attendance}%`} delta="−2.1%" tone="down" icon={<ClipboardCheck />} />
        <Kpi label="Exams" value={String(EXAM_PIPELINE.upcoming)} delta={`In ${EXAM_PIPELINE.nextExamDays}d`} icon={<FileText />} />
        <Kpi label="Complaints" value="11" delta="3 urgent" tone="down" icon={<MessageSquareWarning />} />
      </KpiGrid>

      <Card>
        <CardHeader title="Quick Actions" hint="Operational shortcuts"
          action={<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider"><Sparkles className="size-3" /> ⌘K Command palette</div>} />
        <div className="px-4 sm:px-5 pb-5 lx-quick-action-grid">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.label} to={q.to}
                className={`lx-quick-action-tile group rounded-xl border border-border bg-background/50 hover:bg-surface-hover hover:border-border-strong hover:-translate-y-0.5 transition-all`}>
                <div className={`size-8 sm:size-9 rounded-lg border flex items-center justify-center shrink-0 ${toneBg[q.tone]}`}>
                  <Icon className="size-4" strokeWidth={2} />
                </div>
                <div className="text-[10px] sm:text-[11px] font-medium leading-snug line-clamp-2 w-full px-0.5">{q.label}</div>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="lx-dashboard-grid grid grid-cols-12">
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Attendance Intelligence" hint={`${branch.name} · last 6 months`}
            action={<Link to="/attendance"><Button size="sm">Full view</Button></Link>} />
          <div className="px-5 pb-4">
            <div className="text-3xl font-semibold font-mono">{branch.attendance}%</div>
            <div className="text-[10px] text-muted-foreground mt-1">Institute rate · 3 classes below 80%</div>
            <div className="h-32 flex items-end gap-2 mt-4">
              {attTrend.map((d) => (
                <div key={d.m} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full bg-primary/30 hover:bg-primary/50 rounded-t-md transition-colors" style={{ height: `${d.v}%` }} />
                  <span className="text-[9px] font-mono text-muted-foreground">{d.m}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-5 pb-5 border-t border-border pt-4 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Critical classes</div>
            {CRITICAL_CLASSES.map((c) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <span>{c.name}</span>
                <Pill tone={c.rate < 80 ? "danger" : "warning"}>{c.rate}%</Pill>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-3">
          <CardHeader title="Exams Pipeline" hint="Active examination cycle"
            action={<Link to="/exams"><Button size="sm">Manage</Button></Link>} />
          <div className="px-5 pb-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border border-border lx-inset-panel">
                <div className="text-[10px] text-muted-foreground uppercase">Upcoming</div>
                <div className="text-xl font-semibold mt-1">{EXAM_PIPELINE.upcoming}</div>
              </div>
              <div className="p-3 rounded-lg border border-border lx-inset-panel">
                <div className="text-[10px] text-muted-foreground uppercase">Grading</div>
                <div className="text-xl font-semibold mt-1">{EXAM_PIPELINE.grading}</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Grading progress</span>
                <span className="font-mono">{EXAM_PIPELINE.gradingPct}%</span>
              </div>
              <div className="h-1.5 rounded bg-muted overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${EXAM_PIPELINE.gradingPct}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Avg score</span>
              <span className="font-mono">{EXAM_PIPELINE.avgScore}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Published</span>
              <span className="font-mono">{EXAM_PIPELINE.published} exams</span>
            </div>
            <Link to="/marks"><Button className="w-full justify-center">Publish marks <ArrowUpRight className="size-3" /></Button></Link>
          </div>
        </Card>

        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card>
            <CardHeader title="Critical Interventions" action={<Pill tone="danger" pulse>4 high risk</Pill>} />
            <div className="px-5 pb-5 space-y-3">
              {weakStudents.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-md bg-accent border border-border flex items-center justify-center text-[10px] font-mono">{s.id}</div>
                    <div>
                      <div className="text-xs font-medium">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground">Grade {s.grade} · {s.subject}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono text-destructive">{s.score}%</div>
                    <div className="text-[10px] text-muted-foreground">{s.delta} pts</div>
                  </div>
                </div>
              ))}
              <Link to="/analytics" className="block">
                <Button className="w-full justify-center mt-2">Open analytics <ArrowUpRight className="size-3" /></Button>
              </Link>
            </div>
          </Card>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <div className="flex gap-3">
              <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-destructive">Urgent Complaint</div>
                  <Pill tone="danger" pulse>P0</Pill>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Grade 12 Faculty — facility maintenance during examination period.</p>
                <Link to="/complaints"><Button className="mt-3 h-7 text-[11px]">Open case</Button></Link>
              </div>
            </div>
          </div>
        </div>

        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Live Activity" hint="Real-time across branches"
            action={<span className="flex items-center gap-1.5 text-[10px] text-success font-mono"><span className="size-1.5 rounded-full bg-success animate-pulse" /> LIVE</span>} />
          <div className="px-5 pb-5 space-y-1">
            {activity.slice(0, 6).map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className={`size-8 rounded-md border flex items-center justify-center shrink-0 ${toneBg[a.tone as keyof typeof toneBg]}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs"><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.what}</span> <span className="text-primary">{a.target}</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono flex items-center gap-1"><Clock className="size-2.5" /> {a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-5">
          <CardHeader title="Class Performance" hint="Average GPA by grade"
            action={<div className="flex items-center gap-1.5 text-[10px] text-success"><TrendingUp className="size-3" /> +0.18 vs last term</div>} />
          <div className="px-5 pb-5 space-y-3">
            {[
              { grade: "Grade 12-A", gpa: 3.84, pct: 95, tone: "bg-success" },
              { grade: "Grade 11-B", gpa: 3.62, pct: 88, tone: "bg-primary" },
              { grade: "Grade 10-A", gpa: 3.41, pct: 82, tone: "bg-primary" },
              { grade: "Grade 9-C", gpa: 2.98, pct: 71, tone: "bg-warning" },
              { grade: "Grade 11-C", gpa: 2.64, pct: 62, tone: "bg-destructive" },
            ].map((c) => (
              <div key={c.grade}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{c.grade}</span>
                  <span className="font-mono text-muted-foreground">{c.gpa.toFixed(2)}</span>
                </div>
                <div className="h-1.5 rounded bg-muted overflow-hidden"><div className={`h-full ${c.tone}`} style={{ width: `${c.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader title="Parent Engagement" hint="30-day average" />
          <div className="px-5 pb-5 space-y-3">
            {[
              { l: "Portal logins", v: "78%", pct: 78, tone: "bg-success" },
              { l: "Message reads", v: "64%", pct: 64, tone: "bg-primary" },
              { l: "Event RSVPs", v: "41%", pct: 41, tone: "bg-warning" },
            ].map((m) => (
              <div key={m.l}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{m.l}</span>
                  <span className="font-mono">{m.v}</span>
                </div>
                <div className="h-1.5 rounded bg-muted overflow-hidden"><div className={`h-full ${m.tone}`} style={{ width: `${m.pct}%` }} /></div>
              </div>
            ))}
            <Link to="/parents"><Button className="w-full justify-center mt-2">Manage parents <ArrowUpRight className="size-3" /></Button></Link>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader title="Upcoming" hint="Next 7 days" />
          <div className="px-5 pb-5 space-y-2.5">
            {[
              { d: "Mon", t: "10:00", e: "Grade 10 — Mid-term Maths", icon: FileText, tone: "primary" },
              { d: "Tue", t: "14:30", e: "Parent–Teacher Meet · 11", icon: Heart, tone: "success" },
              { d: "Wed", t: "09:00", e: "Inter-school Debate", icon: CalendarDays, tone: "warning" },
              { d: "Fri", t: "16:00", e: "Annual Sports Day Rehearsal", icon: BookOpen, tone: "info" },
            ].map((u) => {
              const Icon = u.icon;
              return (
                <div key={u.e} className="flex items-center gap-3 py-1.5">
                  <div className={`size-8 rounded-md border flex items-center justify-center ${toneBg[u.tone as keyof typeof toneBg]}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{u.e}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{u.d} · {u.t}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader title="Storage Overview" hint="2 TB allocated"
            action={<Link to="/storage"><Button size="sm">Manage</Button></Link>} />
          <div className="px-5 pb-5">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              <div className="bg-primary" style={{ width: "34%" }} />
              <div className="bg-chart-5" style={{ width: "24%" }} />
              <div className="bg-success" style={{ width: "15%" }} />
              <div className="bg-warning" style={{ width: "12%" }} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-[11px]">
              <div><span className="size-2 inline-block rounded-sm bg-primary mr-1.5" /> Students · 312 GB</div>
              <div><span className="size-2 inline-block rounded-sm bg-chart-5 mr-1.5" /> Media · 286 GB</div>
              <div><span className="size-2 inline-block rounded-sm bg-success mr-1.5" /> Exams · 184 GB</div>
              <div><span className="size-2 inline-block rounded-sm bg-warning mr-1.5" /> Temp · 142 GB</div>
            </div>
          </div>
        </Card>
      </div>
      </PageStack>
    </AppShell>
  );
}
