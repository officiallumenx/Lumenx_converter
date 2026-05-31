import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button } from "@/components/ui-kit";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — LumenX Nexus" }] }),
  component: SettingsPage,
});

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  return (
    <AppShell title="Settings" subtitle="Institute, security, and personal preferences">
      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Institute" />
          <div className="px-5 pb-5">
            <Row label="Institute name" hint="Displayed across all admin tools">
              <input defaultValue="LUMENX NEXUS International School" className="h-9 w-64 px-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary/40" />
            </Row>
            <Row label="Academic session" hint="Current academic year">
              <select className="h-9 w-40 px-3 rounded-md bg-background border border-border text-xs">
                <option>2025 — 2026</option>
                <option>2024 — 2025</option>
              </select>
            </Row>
            <Row label="Working days" hint="Mon — Sat (configurable)">
              <Button>Configure</Button>
            </Row>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Security" />
          <div className="px-5 pb-5">
            <Row label="Two-factor authentication" hint="Required for all admin accounts">
              <Button variant="primary">Enabled</Button>
            </Row>
            <Row label="Session timeout" hint="Auto-logout after inactivity">
              <select className="h-9 w-32 px-3 rounded-md bg-background border border-border text-xs">
                <option>30 min</option>
                <option>1 hour</option>
                <option>4 hours</option>
              </select>
            </Row>
            <Row label="Audit log retention" hint="Storage of admin activity">
              <select className="h-9 w-32 px-3 rounded-md bg-background border border-border text-xs">
                <option>90 days</option>
                <option>1 year</option>
                <option>Forever</option>
              </select>
            </Row>
          </div>
        </Card>

        <Card className="col-span-12">
          <CardHeader title="Branches" hint="Multi-branch management (Professional plan)" action={<Button variant="primary">Add branch</Button>} />
          <div className="px-5 pb-5 space-y-2">
            {["Branch Alpha · Headquarters", "Branch Beta · Downtown", "Branch Gamma · North Campus"].map((b) => (
              <div key={b} className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-background/40">
                <div className="text-xs font-medium">{b}</div>
                <Button>Manage</Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
