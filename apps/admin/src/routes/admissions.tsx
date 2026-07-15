import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button, Pill, Modal, Field, TextInput, Select } from "@lumenx/ui-admin";
import { ADMISSION_APPLICATIONS } from "@/lib/admin-module-data";
import {
  readAdminSyncRows,
  persistAdminStageChange,
  type AdminAdmissionStage,
  type AdminSyncRow,
} from "@/lib/admissions-sync";
import { UserPlus, FileCheck, Calendar, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/admissions")({
  head: () => ({ meta: [{ title: "Admissions — LumenX Admin" }] }),
  component: AdmissionsPage,
});

const stages: {
  key: AdminAdmissionStage;
  label: string;
  tone: "warning" | "info" | "success" | "neutral";
}[] = [
  { key: "review", label: "Review", tone: "warning" },
  { key: "verification", label: "Verification", tone: "info" },
  { key: "interview", label: "Interview", tone: "info" },
  { key: "approved", label: "Approved", tone: "success" },
  { key: "waitlist", label: "Waitlist", tone: "neutral" },
];

function AdmissionsPage() {
  const fallback = ADMISSION_APPLICATIONS as AdminSyncRow[];
  const [apps, setApps] = useState<AdminSyncRow[]>(() => readAdminSyncRows(fallback));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const selected = useMemo(
    () => (selectedId ? apps.find((a) => a.id === selectedId) ?? null : null),
    [apps, selectedId],
  );

  useEffect(() => {
    const synced = readAdminSyncRows(fallback);
    setApps(synced);
    setSelectedId((prev) => {
      if (prev && synced.some((a) => a.id === prev)) return prev;
      return null;
    });
  }, []);

  const moveToStage = (id: string, stage: AdminAdmissionStage) => {
    persistAdminStageChange(id, stage);
    setApps((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, stage } : a));
      return readAdminSyncRows(next);
    });
  };

  const convertToStudent = () => {
    if (!selected) return;
    setApps((prev) => prev.filter((a) => a.id !== selected.id));
    setSelectedId(null);
    setConvertOpen(false);
  };

  return (
    <AppShell
      title="Admissions"
      subtitle="Connect Admissions portal · review through enrollment"
      actions={
        <>
          <Button>
            <Download className="size-3.5" /> Reports
          </Button>
          <Button
            variant="primary"
            onClick={() => setConvertOpen(true)}
            disabled={!selected || selected.stage !== "approved"}
          >
            <UserPlus className="size-3.5" /> Convert to student
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stages.map((col) => {
          const items = apps.filter((a) => a.stage === col.key);
          return (
            <div
              key={col.key}
              className="bg-surface border border-border rounded-xl p-3 min-h-[360px]"
            >
              <div className="flex items-center gap-2 px-2 pb-3">
                <Pill tone={col.tone}>{col.label}</Pill>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedId(a.id)}
                    className={`w-full text-left rounded-lg p-3 border transition-colors ${
                      selectedId === a.id
                        ? "bg-elevated border-primary/30"
                        : "bg-background/40 border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="text-xs font-medium">{a.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {a.grade} · Docs {a.docs}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name ?? "Application"}
        subtitle={selected ? `${selected.id} · ${selected.grade}` : undefined}
        size="lg"
        footer={
          selected ? (
            <>
              <Button onClick={() => setSelectedId(null)}>Close</Button>
              {selected.stage === "review" && (
                <Button onClick={() => moveToStage(selected.id, "verification")}>
                  <FileCheck className="size-3.5" /> Verification
                </Button>
              )}
              {(selected.stage === "review" || selected.stage === "verification") && (
                <Button onClick={() => moveToStage(selected.id, "interview")}>
                  <Calendar className="size-3.5" /> Interview
                </Button>
              )}
              {selected.stage !== "approved" && selected.stage !== "waitlist" && (
                <Button variant="primary" onClick={() => moveToStage(selected.id, "approved")}>
                  Approve
                </Button>
              )}
              {selected.stage === "approved" && (
                <Button variant="primary" onClick={() => setConvertOpen(true)}>
                  <UserPlus className="size-3.5" /> Convert to student
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-muted-foreground">Applied {selected.applied}</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Stage</span>
                <Pill tone="info">{selected.stage}</Pill>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Documents</span>
                <span>{selected.docs} verified</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Grade applying for</span>
                <span>{selected.grade}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        title="Convert to student"
        subtitle="Creates student record and parent portal invite"
        footer={
          <>
            <Button onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={convertToStudent}>
              Create student
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Applicant">
            <TextInput value={selected?.name ?? ""} readOnly />
          </Field>
          <Field label="Grade">
            <TextInput value={selected?.grade ?? ""} readOnly />
          </Field>
          <Field label="Section">
            <Select>
              <option>A</option>
              <option>B</option>
            </Select>
          </Field>
          <Field label="Issue Connect invite">
            <Select>
              <option>Email parent</option>
              <option>Skip</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
