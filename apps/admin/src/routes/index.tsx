import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Kpi, Pill, Button } from "@/components/ui-kit";
import {
  Users, GraduationCap, ClipboardCheck, AlertTriangle, TrendingUp, Activity,
  FileDown, Send, ArrowUpRight, UserPlus, CalendarRange, Megaphone, CalendarDays,
  MessageSquareWarning, FileText, ClipboardList, HardDrive, ShieldCheck,
  Building2, BookOpen, Heart, Sparkles, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Command Center — LumenX Admin" }] }),
  component: Dashboard,
});

const attendance = [62, 78, 71, 92, 86, 74, 70];
const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

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
  { label: "Upload Marks", to: "/exams", icon: FileText, tone: "primary" },
  { label: "Add Assignment", to: "/exams", icon: ClipboardList, tone: "info" },
] as const;

const toneBg = {
  primary: "bg-primary/10 text-primary border-primary/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger: "bg-destructive/10 text-destructive border-destructive/20",
  info: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  muted: "bg-muted text-muted-foreground border-border",
} as const;

function Dashboard() {
  return (
    <AppShell
      title="Institute Intelligence"
      subtitle="Branch Alpha · Session 2025–26 · Real-time operational overview"
      actions={
        <>
          <Button><FileDown className="size-3.5" /> Export Report</Button>
          <Button variant="primary"><Send className="size-3.5" /> Compose Alert</Button>
        </>
      }
    >
      {/* KPI strip — 8 operational signals */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <Kpi label="Students" value="2,842" delta="+124" tone="up" icon={<Users className="size-3.5" />} />
        <Kpi label="Teachers" value="186" delta="+4" tone="up" icon={<GraduationCap className="size-3.5" />} />
        <Kpi label="Classes" value="42" delta="126 sec." icon={<Building2 className="size-3.5" />} />
        <Kpi label="Attendance" value="94.2%" delta="−2.1%" tone="down" icon={<ClipboardCheck className="size-3.5" />} />
        <Kpi label="Complaints" value="11" delta="3 P0" tone="down" icon={<MessageSquareWarning className="size-3.5" />} />
        <Kpi label="Exams" value="8" delta="next: 4d" icon={<FileText className="size-3.5" />} />
        <Kpi label="Storage" value="1.2 TB" delta="60% used" icon={<HardDrive className="size-3.5" />} />
        <Kpi label="Admins" value="16" delta="Live now" tone="up" icon={<ShieldCheck className="size-3.5" />} />
      </div>

      {/* Quick actions rail */}
      <Card className="mt-6">
        <CardHeader title="Quick Actions" hint="Operational shortcuts for institute-wide workflows"
          action={<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider"><Sparkles className="size-3" /> ⌘K Command palette</div>} />
        <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2.5">
          {quickActions.map((q) => {
            const Icon = q.icon;
            return (
              <Link key={q.label} to={q.to}
                className="group flex flex-col items-start gap-3 p-3.5 rounded-lg border border-border bg-background/50 hover:bg-surface-hover hover:border-border-strong hover:-translate-y-0.5 transition-all duration-200 hover:shadow-elevated">
                <div className={`size-9 rounded-md border flex items-center justify-center transition-transform group-hover:scale-110 ${toneBg[q.tone]}`}>
                  <Icon className="size-4" strokeWidth={2} />
                </div>
                <div className="text-[11px] font-medium leading-tight">{q.label}</div>
              </Link>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-12 gap-4 mt-6">
        {/* Attendance trend */}
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader title="Attendance Intelligence Trend" hint="Last 7 days · institute-wide"
            action={
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary inline-block" /> Present</span>
                <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-muted-foreground/40 inline-block" /> Forecast</span>
              </div>
            } />
          <div className="px-5 pb-5">
            <div className="h-56 flex items-end gap-3 px-1">
              {attendance.map((v, i) => (
                <div key={i} className="flex-1 group relative">
                  <div className={`rounded-t-md transition-all ${i < 5 ? "bg-primary/30 hover:bg-primary/60" : "bg-muted border-t border-border"}`} style={{ height: `${v}%` }}>
                    {i === 3 && <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono text-primary">94%</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-3 font-mono text-[10px] text-muted-foreground">
              {days.map((d) => <span key={d}>{d}</span>)}
            </div>
          </div>
        </Card>

        {/* Right column — interventions + urgent */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <Card>
            <CardHeader title="Critical Interventions" action={<Pill tone="danger" pulse>4 high risk</Pill>} />
            <div className="px-5 pb-5 space-y-3">
              {weakStudents.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between group cursor-pointer hover:bg-surface-hover -mx-2 px-2 py-1.5 rounded-md transition-colors">
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
                <Button className="w-full justify-center mt-2">Open intervention analytics <ArrowUpRight className="size-3" /></Button>
              </Link>
            </div>
          </Card>

          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 shadow-elevated">
            <div className="flex gap-3">
              <div className="size-9 rounded-md bg-destructive/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="size-4 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold text-destructive">Urgent Complaint</div>
                  <Pill tone="danger" pulse>P0</Pill>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  Grade 12 Faculty — Escalation regarding facility maintenance during examination period.
                </p>
                <Link to="/complaints"><Button className="mt-3 h-7 text-[11px]">Open case</Button></Link>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time activity feed */}
        <Card className="col-span-12 lg:col-span-7">
          <CardHeader title="Live Operational Activity" hint="Real-time across all branches"
            action={
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-[10px] text-success font-mono uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-success animate-pulse" /> LIVE
                </span>
                <Button variant="ghost">View all</Button>
              </div>
            } />
          <div className="px-5 pb-5 space-y-1">
            {activity.map((a, i) => {
              const Icon = a.icon;
              return (
                <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0 hover:bg-surface-hover -mx-2 px-2 rounded-md transition-colors group">
                  <div className={`size-8 rounded-md border flex items-center justify-center shrink-0 ${toneBg[a.tone as keyof typeof toneBg]}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed">
                      <span className="font-medium">{a.who}</span>{" "}
                      <span className="text-muted-foreground">{a.what}</span>{" "}
                      <span className="text-primary">{a.target}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono flex items-center gap-1">
                      <Clock className="size-2.5" /> {a.time}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Performance breakdown */}
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

        {/* Parent engagement + teacher trends */}
        <Card className="col-span-12 md:col-span-6 lg:col-span-4">
          <CardHeader title="Parent Engagement" hint="30-day average" />
          <div className="px-5 pb-5 space-y-3">
            {[
              { l: "Portal logins", v: "78%", tone: "bg-success", pct: 78 },
              { l: "Message reads", v: "64%", tone: "bg-primary", pct: 64 },
              { l: "Event RSVPs", v: "41%", tone: "bg-warning", pct: 41 },
              { l: "Survey response", v: "23%", tone: "bg-destructive", pct: 23 },
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
          <CardHeader title="Teacher Performance" hint="Top movers this term"
            action={<Pill tone="info">186 staff</Pill>} />
          <div className="px-5 pb-5 space-y-2.5">
            {[
              { n: "Priya Iyer", d: "Biology", r: 4.92, delta: "+0.18", tone: "up" },
              { n: "Sarah Jenkins", d: "Mathematics", r: 4.81, delta: "+0.12", tone: "up" },
              { n: "Hana Suzuki", d: "Chemistry", r: 4.74, delta: "+0.06", tone: "up" },
              { n: "Marcus Whitfield", d: "English", r: 4.42, delta: "−0.14", tone: "down" },
            ].map((t) => (
              <div key={t.n} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-7 rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 ring-1 ring-border flex items-center justify-center text-[9px] font-semibold">
                    {t.n.split(" ").map((x) => x[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{t.n}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{t.d}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono">{t.r}</div>
                  <div className={`text-[10px] ${t.tone === "up" ? "text-success" : "text-destructive"}`}>{t.delta}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-12 lg:col-span-4">
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
            <Link to="/events"><Button className="w-full justify-center mt-2">View calendar <ArrowUpRight className="size-3" /></Button></Link>
          </div>
        </Card>

        {/* Storage + system health */}
        <Card className="col-span-12 md:col-span-6">
          <CardHeader title="Storage Health" hint="2 TB allocated"
            action={<Link to="/storage"><Button>Manage</Button></Link>} />
          <div className="px-5 pb-5">
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              <div className="bg-primary" style={{ width: "34%" }} />
              <div className="bg-chart-5" style={{ width: "24%" }} />
              <div className="bg-success" style={{ width: "15%" }} />
              <div className="bg-warning" style={{ width: "12%" }} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-[11px]">
              <div><span className="size-2 inline-block rounded-sm bg-primary mr-1.5" /> Assignments · 412 GB</div>
              <div><span className="size-2 inline-block rounded-sm bg-chart-5 mr-1.5" /> Media · 286 GB</div>
              <div><span className="size-2 inline-block rounded-sm bg-success mr-1.5" /> Docs · 184 GB</div>
              <div><span className="size-2 inline-block rounded-sm bg-warning mr-1.5" /> Exams · 142 GB</div>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 md:col-span-6">
          <CardHeader title="System Health" hint="All systems nominal"
            action={<Pill tone="success" pulse>Operational</Pill>} />
          <div className="px-5 pb-5 grid grid-cols-2 gap-3 text-xs">
            {[
              { l: "API Gateway", v: "182ms p99", t: "success" },
              { l: "Database", v: "12ms p50", t: "success" },
              { l: "Notifications", v: "Queued: 4", t: "success" },
              { l: "Background Jobs", v: "2 running", t: "info" },
            ].map((s) => (
              <div key={s.l} className="p-3 rounded-md border border-border bg-background/40">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Activity className="size-3" /> {s.l}
                </div>
                <div className="font-mono mt-1.5">{s.v}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
