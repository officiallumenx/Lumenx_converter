import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, PageStack, Modal } from "@lumenx/ui-admin";
import { Lock, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import { DEMO_COMPLAINTS_SEED } from "@/lib/complaints-data";
import {
  downloadTextToDevice,
  listenDemoSync,
  loadDemoComplaints,
  saveDemoComplaints,
  type DemoComplaint,
} from "@lumenx/utils";
import {
  notifyComplaintLifecycle,
} from "@lumenx/module-notifications";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadComplaintsList,
  resolveComplaintsListView,
  shouldCommitComplaintsLoad,
  type ComplaintListItem,
  type ComplaintsListStatus,
} from "@/lib/complaints";

export const Route = createFileRoute("/complaints")({
  head: () => ({ meta: [{ title: "Complaints — LumenX Admin" }] }),
  component: ComplaintsPage,
});

type ComplaintStatus = "pending" | "review" | "resolved" | "rejected";
type Complaint = ComplaintListItem;

const cols: { key: ComplaintStatus; label: string; tone: "warning" | "info" | "success" }[] = [
  { key: "pending", label: "Pending", tone: "warning" },
  { key: "review", label: "Under Review", tone: "info" },
  { key: "resolved", label: "Resolved", tone: "success" },
];

function ComplaintsPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();

  const [items, setItems] = useState<Complaint[]>(() =>
    apiMode ? [] : (loadDemoComplaints(DEMO_COMPLAINTS_SEED) as Complaint[]),
  );
  const [listStatus, setListStatus] = useState<ComplaintsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [detailId, setDetailId] = useState<string | null>(null);
  const writesEnabled = !apiMode;

  const listView = resolveComplaintsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: items,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems = listView.items;
  const displayStatus = listView.status;
  const displayError = listView.errorMessage;

  useEffect(() => {
    if (!apiMode) {
      setItems(loadDemoComplaints(DEMO_COMPLAINTS_SEED) as Complaint[]);
      setListStatus("demo");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "loading") {
      setItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadComplaintsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitComplaintsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  useEffect(() => {
    if (apiMode) return;
    return listenDemoSync("complaints", () => {
      setItems(loadDemoComplaints(DEMO_COMPLAINTS_SEED) as Complaint[]);
    });
  }, [apiMode]);

  const detail = useMemo(
    () => (detailId ? displayItems.find((c) => c.id === detailId) ?? null : null),
    [displayItems, detailId],
  );

  const setStatus = (id: string, status: ComplaintStatus, reason?: string) => {
    if (!writesEnabled) {
      notify("Complaint writes via API are not enabled in this cutover");
      return;
    }
    const current = items.find((c) => c.id === id);
    setItems((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, status } : c));
      saveDemoComplaints(next as DemoComplaint[]);
      return next;
    });
    if (current) {
      if (status === "review") {
        notifyComplaintLifecycle({
          complaintId: current.id,
          title: current.title,
          stage: "under_review",
          requesterRole: current.role,
        });
      } else if (status === "resolved") {
        notifyComplaintLifecycle({
          complaintId: current.id,
          title: current.title,
          stage: "resolved",
          requesterRole: current.role,
        });
      } else if (status === "rejected") {
        notifyComplaintLifecycle({
          complaintId: current.id,
          title: current.title,
          stage: "rejected",
          requesterRole: current.role,
          reason: reason?.trim() || "No reason provided",
        });
      }
    }
    notify(`Complaint ${id} moved to ${status.replace("_", " ")}`);
  };

  const listHint =
    displayStatus === "loading"
      ? "Loading complaints…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load complaints"
        : displayStatus === "forbidden"
          ? "You do not have access to complaints for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load complaints"
            : displayStatus === "empty"
              ? "No complaints yet"
              : "Destination required (Class Teacher or Principal/Admin) · Priority Low / Medium / High · No automatic routing";

  return (
    <AppShell
      title="Complaint Triage"
      subtitle={
        apiMode
          ? "API mode · read-only list"
          : "Destination required (Class Teacher or Principal/Admin) · Priority Low / Medium / High · No automatic routing"
      }
      actions={
        <Button
          onClick={() => {
            const csv = [
              "id,title,from,role,destination,priority,status,time",
              ...displayItems.map((c) =>
                [c.id, c.title, c.from, c.role, c.destination, c.priority, c.status, c.time]
                  .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                  .join(","),
              ),
            ].join("\n");
            downloadTextToDevice("complaints-privacy-log.csv", csv, "text/csv;charset=utf-8");
            notify("Privacy audit log downloaded");
          }}
          disabled={displayStatus === "loading"}
        >
          <Lock className="size-3.5" /> Privacy log
        </Button>
      }
    >
      <PageStack>
        {displayStatus === "loading" ||
        displayStatus === "needs_institute" ||
        displayStatus === "forbidden" ||
        displayStatus === "error" ? (
          <Card>
            <CardHeader title="Complaints" hint={listHint} />
            <div className="px-5 py-8 text-sm text-muted-foreground">{listHint}</div>
          </Card>
        ) : (
          <div className="lx-kanban-grid">
            {cols.map((col) => {
              const colItems = displayItems.filter((c) => {
                if (col.key === "resolved") {
                  return c.status === "resolved" || c.status === "rejected";
                }
                return c.status === col.key;
              });
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
                    {colItems.length === 0 && displayStatus === "empty" ? (
                      <div className="text-[11px] text-muted-foreground px-1 py-2">
                        No complaints yet
                      </div>
                    ) : null}
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
                              c.priority === "High"
                                ? "danger"
                                : c.priority === "Medium"
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
                          {c.from} · {c.role} ·{" "}
                          {c.destination === "class_teacher"
                            ? "Class Teacher"
                            : "Principal / Admin"}
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
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
              {writesEnabled ? (
                <>
                  <Button
                    disabled={detail.status === "review" || detail.status === "rejected"}
                    onClick={() => {
                      setStatus(detail.id, "review");
                      setDetailId(null);
                    }}
                  >
                    Move to Review
                  </Button>
                  <Button
                    variant="danger"
                    disabled={detail.status === "resolved" || detail.status === "rejected"}
                    onClick={() => {
                      const reason =
                        window.prompt("Rejection reason (shown to requester):", "") ?? "";
                      setStatus(detail.id, "rejected", reason);
                      setDetailId(null);
                    }}
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    disabled={detail.status === "resolved" || detail.status === "rejected"}
                    onClick={() => {
                      setStatus(detail.id, "resolved");
                      setDetailId(null);
                    }}
                  >
                    Mark Resolved
                  </Button>
                </>
              ) : (
                <span className="text-[11px] text-muted-foreground self-center">
                  API mode · read-only
                </span>
              )}
            </>
          ) : undefined
        }
      >
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill
                tone={
                  detail.priority === "High"
                    ? "danger"
                    : detail.priority === "Medium"
                      ? "warning"
                      : "neutral"
                }
              >
                {detail.priority}
              </Pill>
              <Pill tone="info">
                {detail.destination === "class_teacher"
                  ? "Class Teacher"
                  : "Principal / Admin"}
              </Pill>
              <Pill tone="neutral">{detail.role}</Pill>
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
              <FileText className="size-3.5" /> Detail view
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
