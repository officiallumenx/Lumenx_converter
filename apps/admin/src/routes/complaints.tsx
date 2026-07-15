import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, PageStack, Modal } from "@lumenx/ui-admin";
import { Lock, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";

export const Route = createFileRoute("/complaints")({
  head: () => ({ meta: [{ title: "Complaints — LumenX Admin" }] }),
  component: ComplaintsPage,
});

type ComplaintStatus = "pending" | "review" | "resolved";

type Complaint = {
  id: string;
  title: string;
  from: string;
  role: string;
  priority: "P0" | "P1" | "P2" | "P3";
  status: ComplaintStatus;
  time: string;
  body: string;
};

const INITIAL: Complaint[] = [
  {
    id: "CMP-201",
    title: "Broken HVAC in Block B",
    from: "Prof. Sterling",
    role: "Teacher",
    priority: "P0",
    status: "pending",
    time: "2m ago",
    body: "AC unit in classroom 204 has failed for the third day. Affecting exam preparation.",
  },
  {
    id: "CMP-200",
    title: "Bullying incident — Grade 9-B",
    from: "Anonymous Parent",
    role: "Parent",
    priority: "P0",
    status: "review",
    time: "1h ago",
    body: "Repeated incidents reported by multiple parents. Evidence attached.",
  },
  {
    id: "CMP-199",
    title: "Cafeteria food quality",
    from: "Student Council",
    role: "Student",
    priority: "P2",
    status: "pending",
    time: "3h ago",
    body: "Quality has deteriorated over the past week. Petition signed by 80 students.",
  },
  {
    id: "CMP-198",
    title: "Transport delays — Route 7",
    from: "K. Patel (parent)",
    role: "Parent",
    priority: "P1",
    status: "review",
    time: "Yesterday",
    body: "Bus consistently 25+ minutes late. Children waiting in extreme weather.",
  },
  {
    id: "CMP-197",
    title: "Library access request",
    from: "External Research",
    role: "External",
    priority: "P3",
    status: "resolved",
    time: "2d ago",
    body: "Resolved — access approved through Director's office.",
  },
];

const cols: { key: ComplaintStatus; label: string; tone: "warning" | "info" | "success" }[] = [
  { key: "pending", label: "Pending", tone: "warning" },
  { key: "review", label: "Under Review", tone: "info" },
  { key: "resolved", label: "Resolved", tone: "success" },
];

function ComplaintsPage() {
  const notify = useAdminToast();
  const [items, setItems] = useState(INITIAL);
  const [detailId, setDetailId] = useState<string | null>(null);

  const detail = useMemo(
    () => (detailId ? items.find((c) => c.id === detailId) ?? null : null),
    [items, detailId],
  );

  const setStatus = (id: string, status: ComplaintStatus) => {
    setItems((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    notify(`Complaint ${id} moved to ${status.replace("_", " ")}`);
  };

  return (
    <AppShell
      title="Complaint Triage"
      subtitle="Confidential · Principal & root admins only"
      actions={
        <Button onClick={() => notify("Privacy audit log exported")}>
          <Lock className="size-3.5" /> Privacy log
        </Button>
      }
    >
      <PageStack>
        <div className="lx-kanban-grid">
          {cols.map((col) => {
            const colItems = items.filter((c) => c.status === col.key);
            return (
              <Card
                key={col.key}
                className="flex flex-col min-h-[min(420px,55vh)] md:min-h-[420px]"
              >
                <CardHeader
                  title={col.label}
                  action={
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
                      {colItems.length}
                    </span>
                  }
                />
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4 space-y-2">
                  {colItems.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setDetailId(c.id)}
                      className={`w-full text-left rounded-lg p-3 border transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        detailId === c.id
                          ? "bg-elevated border-primary/30 shadow-xs"
                          : "bg-background/40 border-border hover:bg-surface-hover hover:border-border-strong"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Pill
                          tone={
                            c.priority === "P0"
                              ? "danger"
                              : c.priority === "P1"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {c.priority}
                        </Pill>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {c.time}
                        </span>
                      </div>
                      <div className="text-xs font-medium leading-snug">{c.title}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {c.from} · {c.role}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </PageStack>

      <Modal
        open={!!detail}
        onClose={() => setDetailId(null)}
        title={detail?.title ?? "Complaint"}
        subtitle={detail ? `${detail.id} · ${detail.from}` : undefined}
        size="lg"
        footer={
          detail ? (
            <>
              <Button onClick={() => setDetailId(null)}>Close</Button>
              <Button
                disabled={detail.status === "review"}
                onClick={() => {
                  setStatus(detail.id, "review");
                  setDetailId(null);
                }}
              >
                Move to Review
              </Button>
              <Button
                variant="primary"
                disabled={detail.status === "resolved"}
                onClick={() => {
                  setStatus(detail.id, "resolved");
                  setDetailId(null);
                }}
              >
                Mark Resolved
              </Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={detail.priority === "P0" ? "danger" : "warning"}>{detail.priority}</Pill>
              <Pill tone="info">{detail.role}</Pill>
              <Pill
                tone={
                  detail.status === "resolved"
                    ? "success"
                    : detail.status === "review"
                      ? "info"
                      : "warning"
                }
              >
                {detail.status.replace("_", " ")}
              </Pill>
              <span className="text-[11px] text-muted-foreground ml-auto">{detail.time}</span>
            </div>
            <div className="p-4 rounded-lg bg-background/40 border border-border text-sm leading-relaxed text-muted-foreground">
              {detail.body}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="size-3.5" /> 2 attachments · 0 comments
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
