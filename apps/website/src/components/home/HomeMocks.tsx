import { cn } from "@lumenx/ui";

export function MockAttendance() {
  return (
    <div className="p-4">
      <p className="text-sm font-medium">Grade 8 · Section A</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {["P", "P", "A", "P", "L", "P"].map((s, i) => (
          <span
            key={i}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-full text-xs font-semibold",
              s === "A" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success",
            )}
          >
            {s}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Teacher marks in Connect. Office reads the same day in Admin.</p>
    </div>
  );
}

export function MockTransport() {
  return (
    <div className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Morning · R12</p>
      <p className="mt-1 text-base font-semibold">HSR Layout loop</p>
      <p className="mt-2 text-sm text-muted-foreground">Boarded 11 / 18 · on time</p>
      <p className="mt-3 text-xs text-muted-foreground">Parents see trip status in Connect when Transport is on.</p>
    </div>
  );
}

export function MockFees() {
  return (
    <div className="p-4">
      <p className="text-sm text-muted-foreground">Balance</p>
      <p className="font-mono text-2xl font-semibold tabular-nums">₹12,400</p>
      <p className="mt-2 text-sm text-muted-foreground">Term 2 tuition · due 12 Sep</p>
      <p className="mt-3 text-xs text-muted-foreground">Structure in Admin. Dues in Connect. No gateway claimed here.</p>
    </div>
  );
}

export function MockNotifications() {
  return (
    <ul className="space-y-2 p-4 text-sm">
      <li className="rounded-lg border p-3">Attendance · Aanya present today</li>
      <li className="rounded-lg border p-3">Fees · Term 2 due 12 Sep</li>
      <li className="rounded-lg border p-3">Transport · R12 on time</li>
    </ul>
  );
}

export function MockAdmissions() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Application · Grade 8 · In review</li>
      <li className="px-3 py-3">Application · Grade 1 · Documents</li>
      <li className="px-3 py-3 text-muted-foreground">Office converts intake in Admin.</li>
    </ul>
  );
}

export function MockAdminHome() {
  return (
    <div className="p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Today</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          ["1,240", "Students"],
          ["86", "Teachers"],
          ["12", "Absent"],
          ["Fees", "Dues"],
        ].map(([n, l]) => (
          <div key={l} className="rounded-lg border bg-muted/40 p-3">
            <p className="font-mono text-sm font-semibold tabular-nums">{n}</p>
            <p className="text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockConnectHome() {
  return (
    <div className="p-4">
      <div className="flex gap-2">
        <span className="rounded-full bg-foreground px-3 py-1.5 text-xs text-background">Aanya</span>
        <span className="rounded-full bg-muted px-3 py-1.5 text-xs">Vihaan</span>
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="rounded-lg border p-3">Attendance · Present</li>
        <li className="rounded-lg border p-3">Fees · Term 2 due</li>
      </ul>
    </div>
  );
}

export function MockNexus() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Oakridge Public · Trial</li>
      <li className="px-3 py-3">Harbor Academy · Active</li>
      <li className="px-3 py-3 text-muted-foreground">Modules on per institute</li>
    </ul>
  );
}

export function MockCareers() {
  return (
    <ul className="divide-y p-2 text-sm">
      <li className="px-3 py-3">Mathematics teacher · Open</li>
      <li className="px-3 py-3">Front office · Interview</li>
      <li className="px-3 py-3 text-muted-foreground">Connect portal · enabled per institute</li>
    </ul>
  );
}
