import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Kpi, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import {
  TRANSPORT_ROUTES,
  TRANSPORT_VEHICLES,
  TRANSPORT_DRIVERS,
  TRANSPORT_ASSIGNMENTS,
  TRANSPORT_SOS,
} from "@/lib/admin-module-data";
import { Plus, Bus, AlertTriangle, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/transport")({
  head: () => ({ meta: [{ title: "Transport — LumenX Admin" }] }),
  component: TransportPage,
});

type Tab = "routes" | "vehicles" | "drivers" | "assignments" | "timings" | "sos" | "compliance" | "trips";

const tabs: { key: Tab; label: string }[] = [
  { key: "routes", label: "Routes" },
  { key: "vehicles", label: "Vehicles" },
  { key: "drivers", label: "Drivers" },
  { key: "assignments", label: "Assignments" },
  { key: "timings", label: "Trip timings" },
  { key: "sos", label: "SOS alerts" },
  { key: "compliance", label: "Compliance" },
  { key: "trips", label: "Trip reports" },
];

function TransportPage() {
  const [tab, setTab] = useState<Tab>("routes");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [routes, setRoutes] = useState(TRANSPORT_ROUTES);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newDriver, setNewDriver] = useState(TRANSPORT_DRIVERS[0]!.name);
  const [newVehicle, setNewVehicle] = useState(TRANSPORT_VEHICLES[0]!.reg);
  const [newMorning, setNewMorning] = useState("07:15");
  const [newAfternoon, setNewAfternoon] = useState("15:40");

  const totalStudents = useMemo(() => routes.reduce((a, r) => a + r.students, 0), [routes]);
  const activeDrivers = TRANSPORT_DRIVERS.filter((d) => d.compliance === "valid").length;
  const openSos = TRANSPORT_SOS.filter((s) => s.status !== "resolved" && s.status !== "closed").length;

  const filteredRoutes = useMemo(() => {
    if (!q) return routes;
    return routes.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()) || r.code.toLowerCase().includes(q.toLowerCase()));
  }, [routes, q]);

  const filteredVehicles = useMemo(() => {
    if (!q) return TRANSPORT_VEHICLES;
    return TRANSPORT_VEHICLES.filter((v) => v.reg.toLowerCase().includes(q.toLowerCase()) || v.model.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  const filteredDrivers = useMemo(() => {
    if (!q) return TRANSPORT_DRIVERS;
    return TRANSPORT_DRIVERS.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  const filteredAssignments = useMemo(() => {
    if (!q) return TRANSPORT_ASSIGNMENTS;
    return TRANSPORT_ASSIGNMENTS.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()) || a.route.toLowerCase().includes(q.toLowerCase()));
  }, [q]);

  const searchableTabs: Tab[] = ["routes", "vehicles", "drivers", "assignments"];
  const currentCount = tab === "routes" ? filteredRoutes.length : tab === "vehicles" ? filteredVehicles.length : tab === "drivers" ? filteredDrivers.length : tab === "assignments" ? filteredAssignments.length : 0;

  const createRoute = () => {
    if (!newName.trim() || !newCode.trim()) return;
    setRoutes((p) => [...p, {
      id: `RT-${Date.now()}`, code: newCode.trim().toUpperCase(), name: newName.trim(),
      stops: 0, students: 0, driver: newDriver, vehicle: newVehicle,
      morning: newMorning, afternoon: newAfternoon, status: "active" as const,
    }]);
    setNewName(""); setNewCode("");
    setOpen(false);
  };

  return (
    <AppShell
      title="Transport Management"
      subtitle="Configure routes, fleet, and student assignments · Connect & Transport app consume this data"
      actions={
        <>
          <Button><Download className="size-3.5" /> Export</Button>
          <Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> Add route</Button>
        </>
      }
    >
      <div className="lx-kpi-grid">
        <Kpi label="Active routes" value={String(routes.filter((r) => r.status === "active").length)} icon={<Bus className="size-3.5" />} />
        <Kpi label="Students assigned" value={String(totalStudents)} delta={`${routes.length} routes`} />
        <Kpi label="Drivers on duty" value={String(activeDrivers)} delta="Today" tone="up" />
        <Kpi label="Open SOS" value={String(openSos)} delta="Last 7 days" />
      </div>

      <Card className="mt-6">
        <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setQ(""); }}
                className={`px-3 h-8 rounded text-[11px] font-medium transition-colors ${
                  tab === t.key ? "bg-surface border border-border text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {searchableTabs.includes(tab) && (
            <>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
                  className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary/40" />
              </div>
              <div className="text-xs text-muted-foreground font-mono">{currentCount} results</div>
            </>
          )}
        </div>

        {tab === "routes" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">Code</th>
                    <th className="px-5 py-3 font-semibold">Route</th>
                    <th className="px-5 py-3 font-semibold">Stops</th>
                    <th className="px-5 py-3 font-semibold">Students</th>
                    <th className="px-5 py-3 font-semibold">Driver</th>
                    <th className="px-5 py-3 font-semibold">Vehicle</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRoutes.map((r) => (
                    <tr key={r.id} className="hover:bg-surface-hover">
                      <td className="px-5 py-3 font-mono text-xs">{r.code}</td>
                      <td className="px-5 py-3 text-xs font-medium">{r.name}</td>
                      <td className="px-5 py-3 text-xs">{r.stops}</td>
                      <td className="px-5 py-3 text-xs">{r.students}</td>
                      <td className="px-5 py-3 text-xs">{r.driver}</td>
                      <td className="px-5 py-3 text-xs font-mono">{r.vehicle}</td>
                      <td className="px-5 py-3">
                        {r.status === "active" ? <Pill tone="success">Active</Pill> : <Pill tone="warning">Maintenance</Pill>}
                      </td>
                      <td className="px-5 py-3"><Button size="sm">Edit</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing 1–{filteredRoutes.length} of {filteredRoutes.length}</span>
              <div className="flex gap-1">
                <Button size="sm" disabled>Previous</Button>
                <Button size="sm" disabled>Next</Button>
              </div>
            </div>
          </>
        )}

        {tab === "vehicles" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">Registration</th>
                    <th className="px-5 py-3 font-semibold">Model</th>
                    <th className="px-5 py-3 font-semibold">Capacity</th>
                    <th className="px-5 py-3 font-semibold">Route</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-surface-hover">
                      <td className="px-5 py-3 font-mono text-xs">{v.reg}</td>
                      <td className="px-5 py-3 text-xs">{v.model}</td>
                      <td className="px-5 py-3 text-xs">{v.capacity}</td>
                      <td className="px-5 py-3 text-xs">{v.route}</td>
                      <td className="px-5 py-3">
                        <Pill tone={v.status === "active" ? "success" : "warning"}>{v.status}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing 1–{filteredVehicles.length} of {filteredVehicles.length}</span>
              <div className="flex gap-1">
                <Button size="sm" disabled>Previous</Button>
                <Button size="sm" disabled>Next</Button>
              </div>
            </div>
          </>
        )}

        {tab === "drivers" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">Driver</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">License</th>
                    <th className="px-5 py-3 font-semibold">Route</th>
                    <th className="px-5 py-3 font-semibold">Attendance</th>
                    <th className="px-5 py-3 font-semibold">Compliance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDrivers.map((d) => (
                    <tr key={d.id} className="hover:bg-surface-hover">
                      <td className="px-5 py-3 text-xs font-medium">{d.name}</td>
                      <td className="px-5 py-3 text-xs">{d.phone}</td>
                      <td className="px-5 py-3 font-mono text-xs">{d.license}</td>
                      <td className="px-5 py-3 text-xs">{d.route}</td>
                      <td className="px-5 py-3 text-xs font-mono">{d.attendance}%</td>
                      <td className="px-5 py-3">
                        <Pill tone={d.compliance === "valid" ? "success" : "warning"}>{d.compliance}</Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing 1–{filteredDrivers.length} of {filteredDrivers.length}</span>
              <div className="flex gap-1">
                <Button size="sm" disabled>Previous</Button>
                <Button size="sm" disabled>Next</Button>
              </div>
            </div>
          </>
        )}

        {tab === "assignments" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-5 py-3 font-semibold">Class</th>
                    <th className="px-5 py-3 font-semibold">Route</th>
                    <th className="px-5 py-3 font-semibold">Stop</th>
                    <th className="px-5 py-3 font-semibold">Pickup</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAssignments.map((a) => (
                    <tr key={a.studentId} className="hover:bg-surface-hover">
                      <td className="px-5 py-3 text-xs font-medium">{a.name}</td>
                      <td className="px-5 py-3 text-xs">{a.class}</td>
                      <td className="px-5 py-3 text-xs">{a.route}</td>
                      <td className="px-5 py-3 text-xs">{a.stop}</td>
                      <td className="px-5 py-3 font-mono text-xs">{a.pickup}</td>
                      <td className="px-5 py-3"><Button size="sm">Change</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing 1–{filteredAssignments.length} of {filteredAssignments.length}</span>
              <div className="flex gap-1">
                <Button size="sm" disabled>Previous</Button>
                <Button size="sm" disabled>Next</Button>
              </div>
            </div>
          </>
        )}

        {tab === "timings" && (
          <div className="px-5 pb-5 space-y-3">
            {routes.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between p-4 rounded-lg border border-border bg-background/40">
                <div>
                  <div className="text-xs font-medium">{r.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{r.code}</div>
                </div>
                <div className="text-xs">
                  Morning <span className="font-mono">{r.morning}</span> · Afternoon{" "}
                  <span className="font-mono">{r.afternoon}</span>
                </div>
                <Button size="sm">Edit timings</Button>
              </div>
            ))}
          </div>
        )}

        {tab === "sos" && (
          <div className="px-5 pb-5 space-y-3">
            {TRANSPORT_SOS.map((s) => (
              <div key={s.id} className="flex items-center gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <AlertTriangle className="size-4 text-destructive shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium">{s.type} · Route {s.route}</div>
                  <div className="text-[10px] text-muted-foreground">{s.time} · {s.id}</div>
                </div>
                <Pill tone={s.status === "resolved" || s.status === "closed" ? "success" : "danger"}>{s.status}</Pill>
              </div>
            ))}
          </div>
        )}

        {tab === "compliance" && (
          <div className="px-5 pb-5">
            <CardHeader title="Driver compliance reports" hint="License, fitness, police verification" />
            <div className="space-y-2">
              {TRANSPORT_DRIVERS.map((d) => (
                <div key={d.id} className="flex items-center justify-between py-3 border-b border-border last:border-0 text-xs">
                  <span className="font-medium">{d.name}</span>
                  <Pill tone={d.compliance === "valid" ? "success" : "warning"}>{d.compliance === "valid" ? "All valid" : "Renew in 14d"}</Pill>
                  <Button size="sm">View report</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "trips" && (
          <div className="px-5 pb-5 space-y-3">
            {routes.filter((r) => r.status === "active").map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between p-4 rounded-lg border border-border bg-background/40 text-xs">
                <div className="font-medium">Route {r.code} · Today</div>
                <div className="text-muted-foreground">On-time 94% · {r.students} students · 0 delays</div>
                <Button size="sm">Full report</Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create route" subtitle="Assign driver and vehicle after creation" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={createRoute}>Create</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Route name" required><TextInput placeholder="North Campus Loop" value={newName} onChange={(e) => setNewName(e.target.value)} /></Field>
          <Field label="Code" required><TextInput placeholder="NCL" value={newCode} onChange={(e) => setNewCode(e.target.value)} /></Field>
          <Field label="Driver">
            <Select value={newDriver} onChange={(e) => setNewDriver(e.target.value)}>
              {TRANSPORT_DRIVERS.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Vehicle">
            <Select value={newVehicle} onChange={(e) => setNewVehicle(e.target.value)}>
              {TRANSPORT_VEHICLES.map((v) => <option key={v.id} value={v.reg}>{v.reg}</option>)}
            </Select>
          </Field>
          <Field label="Morning pickup"><TextInput value={newMorning} onChange={(e) => setNewMorning(e.target.value)} /></Field>
          <Field label="Afternoon drop"><TextInput value={newAfternoon} onChange={(e) => setNewAfternoon(e.target.value)} /></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
