import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, Button, Pill, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import { ADMISSION_APPLICATIONS } from "@/lib/admin-module-data";
import {
  readAdminSyncRows,
  persistAdminStageChange,
  type AdminAdmissionStage,
  type AdminSyncRow,
} from "@/lib/admissions-sync";
import { UserPlus, FileCheck, Calendar, Download } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admissions")({
  head: () => ({ meta: [{ title: "Admissions — LumenX Admin" }] }),
  component: AdmissionsPage,
});

const stages: { key: AdminAdmissionStage; label: string; tone: "warning" | "info" | "success" | "neutral" }[] = [
  { key: "review", label: "Review", tone: "warning" },
  { key: "verification", label: "Verification", tone: "info" },
  { key: "interview", label: "Interview", tone: "info" },
  { key: "approved", label: "Approved", tone: "success" },
  { key: "waitlist", label: "Waitlist", tone: "neutral" },
];

function AdmissionsPage() {
  const fallback = ADMISSION_APPLICATIONS as AdminSyncRow[];
  const [apps, setApps] = useState<AdminSyncRow[]>(() => readAdminSyncRows(fallback));
  const [active, setActive] = useState(apps[0] ?? fallback[0]!);
  const [convertOpen, setConvertOpen] = useState(false);

  useEffect(() => {
    const synced = readAdminSyncRows(fallback);
    setApps(synced);
    if (synced.length > 0) setActive((prev) => synced.find((a) => a.id === prev.id) ?? synced[0]!);
  }, []);

  const moveToStage = (stage: AdminAdmissionStage) => {
    persistAdminStageChange(active.id, stage);
    setApps((prev) => {
      const next = prev.map((a) => (a.id === active.id ? { ...a, stage } : a));
      return readAdminSyncRows(next);
    });
    setActive((prev) => ({ ...prev, stage }));
  };

  const convertToStudent = () => {
    setApps((prev) => {
      const next = prev.filter((a) => a.id !== active.id);
      if (next.length > 0) setActive(next[0]!);
      return next;
    });
    setConvertOpen(false);
  };

  return (
    <AppShell
      title="Admissions"
      subtitle="Connect Admissions portal · review through enrollment"
      actions={
        <>
          <Button><Download className="size-3.5" /> Reports</Button>
          <Button variant="primary" onClick={() => setConvertOpen(true)} disabled={active.stage !== "approved"}>
            <UserPlus className="size-3.5" /> Convert to student
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {stages.map((col) => {
            const items = apps.filter((a) => a.stage === col.key);
            return (
              <div key={col.key} className="bg-surface border border-border rounded-xl p-3 min-h-[360px]">
                <div className="flex items-center gap-2 px-2 pb-3">
                  <Pill tone={col.tone}>{col.label}</Pill>
                  <span className="text-[10px] font-mono text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setActive(a)}
                      className={`w-full text-left rounded-lg p-3 border transition-colors ${
                        active.id === a.id ? "bg-elevated border-primary/30" : "bg-background/40 border-border hover:bg-surface-hover"
                      }`}
                    >
                      <div className="text-xs font-medium">{a.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{a.grade} · Docs {a.docs}</div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <Card className="col-span-12 lg:col-span-4 p-5">
          <div className="text-[10px] font-mono text-muted-foreground">{active.id}</div>
          <h2 className="text-base font-semibold mt-1">{active.name}</h2>
          <p className="text-[11px] text-muted-foreground mt-1">Applied {active.applied}</p>
          <div className="mt-4 space-y-2 text-xs">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Stage</span>
              <Pill tone="info">{active.stage}</Pill>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Documents</span>
              <span>{active.docs} verified</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 mt-5">
            {active.stage === "review" && (
              <Button className="justify-center" onClick={() => moveToStage("verification")}>
                <FileCheck className="size-3.5" /> Move to verification
              </Button>
            )}
            {(active.stage === "review" || active.stage === "verification") && (
              <Button className="justify-center" onClick={() => moveToStage("interview")}>
                <Calendar className="size-3.5" /> Schedule interview
              </Button>
            )}
            {active.stage !== "approved" && active.stage !== "waitlist" && (
              <Button variant="primary" className="justify-center" onClick={() => moveToStage("approved")}>
                Approve application
              </Button>
            )}
            {active.stage === "approved" && (
              <Button variant="primary" className="justify-center" onClick={() => setConvertOpen(true)}>
                <UserPlus className="size-3.5" /> Convert to student
              </Button>
            )}
          </div>
        </Card>
      </div>

      <Modal open={convertOpen} onClose={() => setConvertOpen(false)} title="Convert to student" subtitle="Creates student record and parent portal invite"
        footer={<><Button onClick={() => setConvertOpen(false)}>Cancel</Button><Button variant="primary" onClick={convertToStudent}>Create student</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Applicant"><TextInput value={active.name} readOnly /></Field>
          <Field label="Grade"><TextInput value={active.grade} readOnly /></Field>
          <Field label="Section"><Select><option>A</option><option>B</option></Select></Field>
          <Field label="Issue Connect invite"><Select><option>Email parent</option><option>Skip</option></Select></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
