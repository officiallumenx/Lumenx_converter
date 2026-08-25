import { cn } from "@lumenx/ui";
import type { PreviewPanelId } from "@/content/product-pages";

function MarkRow({ marks }: { marks: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {marks.map((s, i) => (
        <span
          key={`${s}-${i}`}
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold",
            s === "A" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success",
          )}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export function AdminCommand() {
  return (
    <div className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Today</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["1,240", "Students"],
          ["86", "Teachers"],
          ["12", "Absent"],
          ["₹4.2L", "Fees due"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-lg border bg-muted/40 p-3">
            <p className="font-mono text-lg font-semibold tabular-nums">{n}</p>
            <p className="text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminPeople() {
  return (
    <ul className="divide-y p-2">
      {["Anita Rao · Grade 8A", "Rahul Menon · Grade 6B", "Sana Iyer · Grade 10C"].map((row) => (
        <li key={row} className="px-3 py-3 text-sm">
          {row}
        </li>
      ))}
    </ul>
  );
}

export function AdminAttendance() {
  return (
    <div className="p-4">
      <p className="text-sm font-medium">Grade 8 · Section A</p>
      <MarkRow marks={["P", "P", "A", "P", "L", "P"]} />
    </div>
  );
}

export function AdminFees() {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class fees · Grade 8</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="rounded-lg border p-3">Tuition · Term 2 · ₹18,000</li>
        <li className="rounded-lg border p-3">Transport · optional · ₹4,200</li>
        <li className="text-xs text-muted-foreground">Publish in Admin. Families see dues in Connect.</li>
      </ul>
    </div>
  );
}

export function AdminRoles() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Principal · all modules</li>
      <li className="px-3 py-3">Accountant · fees, reports</li>
      <li className="px-3 py-3 text-muted-foreground">Front office · admissions, documents</li>
    </ul>
  );
}

export function AdminDocs() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Bonafide · issued</li>
      <li className="px-3 py-3">Transfer certificate · draft</li>
      <li className="px-3 py-3 text-muted-foreground">Templates live in Admin, not email.</li>
    </ul>
  );
}

export function ConnectHome({ child, onChild }: { child: string; onChild?: (v: string) => void }) {
  return (
    <div className="p-4">
      <div className="flex gap-2">
        {["Aanya", "Vihaan"].map((name) =>
          onChild ? (
            <button
              key={name}
              type="button"
              onClick={() => onChild(name)}
              className={cn(
                "min-h-11 rounded-full px-3 text-sm",
                child === name ? "bg-foreground text-background" : "bg-muted",
              )}
            >
              {name}
            </button>
          ) : (
            <span
              key={name}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs",
                child === name ? "bg-foreground text-background" : "bg-muted",
              )}
            >
              {name}
            </span>
          ),
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Parent home for {child}</p>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="rounded-lg border p-3">Attendance · Present today</li>
        <li className="rounded-lg border p-3">Fees · Term 2 due 12 Sep</li>
        <li className="rounded-lg border p-3">Homework · Maths worksheet</li>
      </ul>
    </div>
  );
}

export function ConnectAttendance() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">This week</p>
      <p className="mt-2 text-muted-foreground">Mon–Thu present. Friday not marked yet.</p>
    </div>
  );
}

export function ConnectFees() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">Balance</p>
      <p className="font-mono text-2xl font-semibold tabular-nums">₹12,400</p>
      <p className="mt-2 text-sm text-muted-foreground">Term 2 tuition · due 12 Sep</p>
    </div>
  );
}

export function ConnectTeacher() {
  return (
    <div className="p-4">
      <p className="text-sm font-medium">Grade 8 · Section A</p>
      <MarkRow marks={["P", "P", "A", "P", "L", "P"]} />
      <p className="mt-3 text-xs text-muted-foreground">Teacher marks here. Office reads the same day in Admin.</p>
    </div>
  );
}

export function ConnectStudent() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Today · Aanya</p>
      <ul className="mt-3 space-y-2">
        <li className="rounded-lg border p-3">Timetable · Period 3 · Science</li>
        <li className="rounded-lg border p-3">Marks · Term 1 published</li>
        <li className="text-xs text-muted-foreground">Never another role’s navigation.</li>
      </ul>
    </div>
  );
}

export function ConnectHomework() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Maths · worksheet · due Thu</li>
      <li className="px-3 py-3">English · reading log</li>
      <li className="px-3 py-3 text-muted-foreground">Written by the teacher. Read by the family.</li>
    </ul>
  );
}

export function ConnectNotify() {
  return (
    <ul className="space-y-2 p-4 text-sm">
      <li className="rounded-lg border p-3">Attendance · Aanya present today</li>
      <li className="rounded-lg border p-3">Fees · Term 2 due 12 Sep</li>
      <li className="rounded-lg border p-3">Transport · R12 on time</li>
    </ul>
  );
}

export function TransportTrip() {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Morning · R12</p>
      <p className="mt-1 text-lg font-semibold">HSR Layout loop</p>
      <p className="mt-2 text-sm text-muted-foreground">18 students · 7 stops · on time</p>
    </div>
  );
}

export function TransportStops() {
  return (
    <ol className="space-y-2 p-4 text-sm">
      {["Agara gate", "BDA complex", "Silk Board"].map((s, i) => (
        <li key={s} className="flex gap-2">
          <span className="font-mono text-muted-foreground">{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}

export function TransportBoarding() {
  return (
    <div className="p-4 text-sm">
      <p>
        Boarded <span className="font-mono font-semibold tabular-nums">11</span> / 18
      </p>
      <p className="mt-2 text-muted-foreground">Remaining pickups at stops 5–7.</p>
    </div>
  );
}

export function TransportGps() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Device location</p>
      <p className="mt-2 text-muted-foreground">Used to save a stop during route setup and to check trip readiness.</p>
      <p className="mt-3 text-xs text-muted-foreground">Parents follow trip status in Connect — not a live map stream.</p>
    </div>
  );
}

export function TransportSos() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Emergency note</p>
      <p className="mt-2 rounded-lg border p-3">Delay at Silk Board · office notified</p>
      <p className="mt-3 text-xs text-muted-foreground">Reaches Admin and Connect. Not SMS, push, or a phone call.</p>
    </div>
  );
}

export function AdmissionsDiscover() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Oakridge Public · Grade 8 · 4 seats</li>
      <li className="px-3 py-3">Harbor Academy · Grade 1 · Open</li>
      <li className="px-3 py-3 text-muted-foreground">Programs and openings before apply.</li>
    </ul>
  );
}

export function AdmissionsApply() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Grade 8 · 2026–27</p>
      <ul className="mt-3 space-y-2">
        <li className="rounded-lg border p-3">Details · in progress</li>
        <li className="rounded-lg border p-3">Documents · 2 attached</li>
      </ul>
    </div>
  );
}

export function AdmissionsPipeline() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Application · Grade 8 · Review</li>
      <li className="px-3 py-3">Application · Grade 1 · Verification</li>
      <li className="px-3 py-3 text-muted-foreground">Office converts accepted intake in Admin.</li>
    </ul>
  );
}

export function AdmissionsWaitlist() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Waitlisted</p>
      <p className="mt-2 text-muted-foreground">Grade 8 · 2 files. Same application — not a second register.</p>
    </div>
  );
}

export function CareersJobs() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Mathematics teacher · Open</li>
      <li className="px-3 py-3">Front office · Interview</li>
      <li className="px-3 py-3 text-muted-foreground">Connect portal · enabled per institute</li>
    </ul>
  );
}

export function CareersApply() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Mathematics teacher</p>
      <ul className="mt-3 space-y-2">
        <li className="rounded-lg border p-3">Profile attached</li>
        <li className="rounded-lg border p-3">Documents · CV, certificates</li>
      </ul>
    </div>
  );
}

export function CareersRecruiter() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">12 applications · Maths</li>
      <li className="px-3 py-3">Discover talent · 4 profiles</li>
      <li className="px-3 py-3 text-muted-foreground">Posting lives here, not as an Admin leftover.</li>
    </ul>
  );
}

export function CareersInterview() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Interview on the application</p>
      <p className="mt-2 rounded-lg border p-3">Round 1 · scheduled with the recruiter</p>
      <p className="mt-3 text-xs text-muted-foreground">Not a campus-wide interview calendar product.</p>
    </div>
  );
}

export function NexusInstitutes() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Oakridge Public · Trial</li>
      <li className="px-3 py-3">Harbor Academy · Active</li>
      <li className="px-3 py-3">LumenX Demo · Active</li>
    </ul>
  );
}

export function NexusSub() {
  return (
    <div className="p-4 text-sm">
      <p className="font-medium">Harbor Academy</p>
      <p className="mt-2 inline-block rounded-full border px-3 py-1.5">Yearly · 2 months free</p>
      <p className="mt-3 text-muted-foreground">Assigned rate ₹12 / student</p>
    </div>
  );
}

export function NexusModules() {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {["Attendance", "Fees", "Transport", "Admissions", "Careers"].map((m) => (
        <span key={m} className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium">
          {m}
        </span>
      ))}
    </div>
  );
}

export function NexusSupport() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Open · billing question · Harbor</li>
      <li className="px-3 py-3">Feedback · module request · Oakridge</li>
      <li className="px-3 py-3">Resolved · access help · Demo campus</li>
      <li className="px-3 py-3 text-muted-foreground">Platform support & feedback — not classroom complaints.</li>
    </ul>
  );
}

export function PreviewPanel({
  id,
  child = "Aanya",
  onChild,
}: {
  id: PreviewPanelId;
  child?: string;
  onChild?: (v: string) => void;
}) {
  switch (id) {
    case "admin-command":
      return <AdminCommand />;
    case "admin-people":
      return <AdminPeople />;
    case "admin-attendance":
      return <AdminAttendance />;
    case "admin-fees":
      return <AdminFees />;
    case "admin-roles":
      return <AdminRoles />;
    case "admin-docs":
      return <AdminDocs />;
    case "connect-home":
      return <ConnectHome child={child} onChild={onChild} />;
    case "connect-teacher":
      return <ConnectTeacher />;
    case "connect-student":
      return <ConnectStudent />;
    case "connect-homework":
      return <ConnectHomework />;
    case "connect-notify":
      return <ConnectNotify />;
    case "transport-trip":
      return <TransportTrip />;
    case "transport-stops":
      return <TransportStops />;
    case "transport-boarding":
      return <TransportBoarding />;
    case "transport-gps":
      return <TransportGps />;
    case "transport-sos":
      return <TransportSos />;
    case "admissions-discover":
      return <AdmissionsDiscover />;
    case "admissions-apply":
      return <AdmissionsApply />;
    case "admissions-pipeline":
      return <AdmissionsPipeline />;
    case "admissions-waitlist":
      return <AdmissionsWaitlist />;
    case "careers-jobs":
      return <CareersJobs />;
    case "careers-apply":
      return <CareersApply />;
    case "careers-recruiter":
      return <CareersRecruiter />;
    case "careers-interview":
      return <CareersInterview />;
    case "nexus-institutes":
      return <NexusInstitutes />;
    case "nexus-sub":
      return <NexusSub />;
    case "nexus-modules":
      return <NexusModules />;
    case "nexus-support":
      return <NexusSupport />;
  }
}
