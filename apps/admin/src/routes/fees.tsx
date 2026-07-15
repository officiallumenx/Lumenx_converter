import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Kpi,
  Modal,
  Field,
  TextInput,
  SearchInput,
  SegmentedControl,
  PageToolbar,
  ToolbarSpacer,
  ToolbarMeta,
  DataTable,
  Th,
} from "@lumenx/ui-admin";
import { FEE_CATEGORIES, FEE_STUDENTS } from "@/lib/admin-module-data";
import { Download, Plus } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/fees")({
  head: () => ({ meta: [{ title: "Fees — LumenX Admin" }] }),
  component: FeesPage,
});

type Tab = "categories" | "students" | "pending" | "collected";

function FeesPage() {
  const [tab, setTab] = useState<Tab>("categories");
  const [q, setQ] = useState("");
  const [cats, setCats] = useState(FEE_CATEGORIES);
  const [students] = useState(FEE_STUDENTS);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const totalCollected = useMemo(() => students.reduce((a, s) => a + s.paid, 0), [students]);
  const totalPending = useMemo(
    () => students.reduce((a, s) => a + (s.total - s.paid), 0),
    [students],
  );
  const defaulters = useMemo(
    () => students.filter((s) => s.status === "overdue").length,
    [students],
  );
  const collRate = useMemo(() => {
    const total = students.reduce((a, s) => a + s.total, 0);
    return total ? Math.round((totalCollected / total) * 100) : 0;
  }, [students, totalCollected]);

  const filteredStudents = useMemo(() => {
    let list = students;
    if (tab === "pending")
      list = list.filter((s) => s.status === "partial" || s.status === "overdue");
    else if (tab === "collected") list = list.filter((s) => s.status === "paid");
    if (q)
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q.toLowerCase()) ||
          s.class.toLowerCase().includes(q.toLowerCase()),
      );
    return list;
  }, [students, tab, q]);

  const addCategory = () => {
    if (!newName.trim()) return;
    setCats((p) => [
      ...p,
      { id: `FC-${Date.now()}`, name: newName.trim(), students: 0, collected: "₹0", pending: "₹0" },
    ]);
    setNewName("");
    setNewDesc("");
    setAddOpen(false);
  };

  const fmt = (v: number) =>
    v >= 10000000 ? `₹${(v / 10000000).toFixed(2)} Cr` : `₹${(v / 100000).toFixed(0)} L`;

  return (
    <AppShell
      title="Fees Management"
      subtitle="Structures, collection status, and defaulters · Connect parent view sync"
      actions={
        <>
          <Button>
            <Download className="size-3.5" /> Reports
          </Button>
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" /> Add category
          </Button>
        </>
      }
    >
      <div className="lx-kpi-grid">
        <Kpi label="Collected" value={fmt(totalCollected)} delta="This term" tone="up" />
        <Kpi label="Pending" value={fmt(totalPending)} tone="down" />
        <Kpi label="Defaulters" value={String(defaulters)} delta="> 30 days" tone="down" />
        <Kpi label="Collection rate" value={`${collRate}%`} tone="up" />
      </div>

      <Card className="mt-6">
        <PageToolbar>
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: "categories", label: "Categories" },
              { value: "students", label: "Student fees" },
              { value: "pending", label: "Pending" },
              { value: "collected", label: "Collected" },
            ]}
          />
          {tab !== "categories" && (
            <>
              <SearchInput
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name or class…"
                className="flex-1 min-w-[200px]"
              />
              <ToolbarSpacer />
              <ToolbarMeta>{filteredStudents.length} results</ToolbarMeta>
            </>
          )}
        </PageToolbar>

        {tab === "categories" && (
          <DataTable>
            <thead>
              <tr>
                <Th>Category</Th>
                <Th>Students</Th>
                <Th>Collected</Th>
                <Th>Pending</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cats.map((c) => (
                <tr key={c.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-3 text-xs font-medium">{c.name}</td>
                  <td className="px-5 py-3 text-xs">{c.students}</td>
                  <td className="px-5 py-3 text-xs font-mono">{c.collected}</td>
                  <td className="px-5 py-3 text-xs font-mono text-warning">{c.pending}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        )}

        {tab !== "categories" && (
          <>
            <DataTable>
              <thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Class</Th>
                  <Th>Total</Th>
                  <Th>Paid</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-hover">
                    <td className="px-5 py-3 text-xs font-medium">{s.name}</td>
                    <td className="px-5 py-3 text-xs">{s.class}</td>
                    <td className="px-5 py-3 text-xs font-mono">₹{s.total.toLocaleString()}</td>
                    <td className="px-5 py-3 text-xs font-mono">₹{s.paid.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      {s.status === "paid" && <Pill tone="success">Paid</Pill>}
                      {s.status === "partial" && <Pill tone="warning">Partial</Pill>}
                      {s.status === "overdue" && <Pill tone="danger">Overdue</Pill>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing 1–{filteredStudents.length} of {filteredStudents.length}
              </span>
              <div className="flex gap-1">
                <Button size="sm" disabled>
                  Previous
                </Button>
                <Button size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add fee category"
        footer={
          <>
            <Button onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={addCategory}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Category name" required>
            <TextInput
              placeholder="Lab Fee"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Field>
          <Field label="Description">
            <TextInput
              placeholder="Annual lab usage charge"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
