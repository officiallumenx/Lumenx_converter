import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, CardHeader, PageStack, Pill } from "@lumenx/ui-admin";
import {
  loadSectionDetail,
  type ClassesListStatus,
  type SectionDetailItem,
} from "@/lib/classes";

function detailHint(status: ClassesListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading class section…";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this section.";
  }
  if (status === "error") return errorMessage ?? "Failed to load class section.";
  if (status === "empty") return errorMessage ?? "Section not found.";
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

export function ClassSectionApiPage({ sectionId }: { sectionId: string }) {
  const [section, setSection] = useState<SectionDetailItem | null>(null);
  const [status, setStatus] = useState<ClassesListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setErrorMessage(null);
    void loadSectionDetail(sectionId).then((next) => {
      if (cancelled) return;
      setSection(next.section);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, [sectionId]);

  const hint = detailHint(status, errorMessage);

  return (
    <AppShell
      title={section?.name ?? "Class section"}
      subtitle="API mode · read-only · section catalog record"
      actions={
        <Link to="/classes">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-3.5" /> Back to classes
          </Button>
        </Link>
      }
    >
      <PageStack>
        <Pill tone="neutral">Read-only · API mode</Pill>
        {status !== "ready" || !section ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <Card>
            <CardHeader
              title={section.name}
              hint={`Class ${section.classCode} · Section ${section.section}`}
              action={
                <div className="flex flex-wrap gap-2">
                  <Pill tone={section.sectionStatus === "active" ? "success" : "neutral"}>
                    {section.sectionStatus}
                  </Pill>
                  <Pill tone={section.classStatus === "active" ? "success" : "neutral"}>
                    class {section.classStatus}
                  </Pill>
                </div>
              }
            />
            <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
              <DetailField label="Timetable grade" value={section.timetableGrade} />
              <DetailField label="Room" value={section.room} />
              <DetailField label="Capacity" value={String(section.capacity)} />
              <DetailField label="Academic year id" value={section.academicYearId.slice(0, 8) + "…"} />
              <DetailField
                label="Last updated"
                value={new Date(section.updatedAt).toLocaleString()}
              />
            </div>
          </Card>
        )}
      </PageStack>
    </AppShell>
  );
}
