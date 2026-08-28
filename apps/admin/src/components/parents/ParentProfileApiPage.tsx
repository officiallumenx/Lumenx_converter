import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import {
  loadParentDetail,
  relationshipToLabel,
  type ParentDetailItem,
  type ParentsListStatus,
} from "@/lib/parents";

function detailHint(status: ParentsListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading parent profile…";
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
  const [parent, setParent] = useState<ParentDetailItem | null>(null);
  const [status, setStatus] = useState<ParentsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    void loadParentDetail(parentId).then((next) => {
      if (cancelled) return;
      setParent(next.parent);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [parentId]);

  const hint = detailHint(status, errorMessage);

  return (
    <AppShell
      title={parent?.name ?? "Parent profile"}
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
        {status !== "ready" || !parent ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <>
            <Card>
              <CardHeader
                title={parent.name}
                hint={parent.identityLabel}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="info">{parent.relationship}</Pill>
                    <Pill tone={parent.accessStatus === "active" ? "success" : "warning"}>
                      {parent.accessStatus}
                    </Pill>
                    <Pill tone={parent.inviteStatus === "accepted" ? "success" : "neutral"}>
                      {parent.inviteStatus}
                    </Pill>
                  </div>
                }
              />
              <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                <DetailField label="Phone" value={parent.phone} />
                <DetailField label="Email" value={parent.email} />
                <DetailField label="Address" value={parent.address} />
                <DetailField label="Legacy code" value={parent.legacyCode} />
                <DetailField label="Linked children" value={parent.linkedChildrenLabel} />
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Student links"
                hint={`Last updated ${new Date(parent.updatedAt).toLocaleString()}`}
              />
              {parent.links.length === 0 ? (
                <div className="px-5 pb-5 text-sm text-muted-foreground">No active student links.</div>
              ) : (
                <ul className="divide-y divide-border px-4 pb-4 sm:px-5">
                  {parent.links.map((link) => (
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
