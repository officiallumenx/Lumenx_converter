import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadParentDetail,
  relationshipToLabel,
  resolveParentsDetailView,
  shouldCommitParentsLoad,
  type ParentDetailItem,
  type ParentsListStatus,
} from "@/lib/parents";

function detailHint(status: ParentsListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading parent profile…";
  if (status === "needs_institute") return "Select an institute to load this parent profile.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this parent.";
  }
  if (status === "error") return errorMessage ?? "Failed to load parent profile.";
  if (status === "empty") return errorMessage ?? "Parent not found.";
  return null;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium leading-relaxed">{value?.trim() || "—"}</div>
    </div>
  );
}

export function ParentProfileApiPage({ parentId }: { parentId: string }) {
  const instituteCtx = useInstituteContext();
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [parent, setParent] = useState<ParentDetailItem | null>(null);
  const [status, setStatus] = useState<ParentsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);

  const detailView = resolveParentsDetailView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedParent: parent,
    storedStatus: status,
    storedErrorMessage: errorMessage,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setParent(null);
      setStatus("loading");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setParent(null);
      setStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setErrorMessage(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setParent(null);
      setStatus("needs_institute");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setParent(null);
    setStatus("loading");
    setErrorMessage(null);
    void loadParentDetail(parentId).then((next) => {
      if (
        !shouldCommitParentsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setParent(next.parent);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.status, instituteCtx.activeInstituteId, instituteCtx.errorMessage, parentId]);

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displayParent = detailView.detailValid ? detailView.parent : null;

  return (
    <AppShell
      title={displayParent?.name ?? "Parent profile"}
      subtitle="API mode · read-only · guardian directory record"
      actions={
        <Link to="/parents">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-3.5" /> Back to parents
          </Button>
        </Link>
      }
    >
      <PageStack>
        <Pill tone="neutral">Read-only · API mode</Pill>
        {detailView.status !== "ready" || !displayParent ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <>
            <Card>
              <CardHeader
                title={displayParent.name}
                hint={displayParent.identityLabel}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="info">{displayParent.relationship}</Pill>
                    <Pill tone={displayParent.accessStatus === "active" ? "success" : "warning"}>
                      {displayParent.accessStatus}
                    </Pill>
                    <Pill tone={displayParent.inviteStatus === "active" ? "success" : "neutral"}>
                      {displayParent.inviteStatus}
                    </Pill>
                  </div>
                }
              />
              <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                <DetailField label="Phone" value={displayParent.phone} />
                <DetailField label="Email" value={displayParent.email} />
                <DetailField label="Address" value={displayParent.address} />
                <DetailField label="Legacy code" value={displayParent.legacyCode} />
                <DetailField label="Linked children" value={displayParent.linkedChildrenLabel} />
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Student links"
                hint={`Last updated ${new Date(displayParent.updatedAt).toLocaleString()}`}
              />
              {displayParent.links.length === 0 ? (
                <div className="px-5 pb-5 text-sm text-muted-foreground">No active student links.</div>
              ) : (
                <ul className="divide-y divide-border px-4 pb-4 sm:px-5">
                  {displayParent.links.map((link) => (
                    <li key={link.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <div className="text-sm font-medium">
                          Student · {link.studentId.slice(0, 8)}…
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {relationshipToLabel(link.relationship)}
                          {link.isPrimary ? " · primary" : ""}
                          {link.isEmergencyContact ? " · emergency" : ""}
                        </div>
                      </div>
                      <Pill tone={link.status === "active" ? "success" : "neutral"}>
                        {link.status}
                      </Pill>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </PageStack>
    </AppShell>
  );
}
