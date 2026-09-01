import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardBody, CardHeader, Button, Pill } from "@lumenx/ui-admin";
import { Award, X } from "lucide-react";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  listCertificateRecommendations,
  updateCertificateRecommendation,
  type CertificateRecommendationDto,
} from "@/lib/certificates/recommendations-api";
import {
  loadCertificateRecommendations,
  dismissCertificateRecommendation,
  type CertificateRecommendation,
} from "@lumenx/utils";
import { useAdminToast } from "@/components/AdminActionToast";

export function CertificateRecommendationsPanel({
  instituteId,
}: {
  instituteId: string | null;
}) {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const [localRows, setLocalRows] = useState<CertificateRecommendation[]>(() =>
    loadCertificateRecommendations().filter((r) => r.status === "pending"),
  );
  const [apiRows, setApiRows] = useState<CertificateRecommendationDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiMode || !instituteId) return;
    let cancelled = false;
    setLoading(true);
    void listCertificateRecommendations({ instituteId, status: "pending" })
      .then((rows) => {
        if (!cancelled) setApiRows(rows);
      })
      .catch(() => {
        if (!cancelled) setApiRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId]);

  const rows = apiMode
    ? apiRows.map((r) => ({
        id: r.id,
        achievementTitle: r.achievementTitle,
        studentName: r.studentName,
        studentClassLabel: r.studentClassLabel ?? "",
        recommendedBy: r.recommendedByName,
        recommendedAt: r.createdAt,
      }))
    : localRows.map((r) => ({
        id: r.id,
        achievementTitle: r.achievementTitle,
        studentName: r.studentName,
        studentClassLabel: r.studentClassLabel,
        recommendedBy: r.recommendedBy,
        recommendedAt: r.recommendedAt,
      }));

  if (loading && rows.length === 0) return null;
  if (rows.length === 0) return null;

  const dismiss = async (id: string) => {
    if (apiMode) {
      try {
        await updateCertificateRecommendation(id, { status: "dismissed" });
        setApiRows((prev) => prev.filter((r) => r.id !== id));
        notify("Recommendation dismissed");
      } catch (err) {
        notify(err instanceof Error ? err.message : "Could not dismiss");
      }
      return;
    }
    dismissCertificateRecommendation(id);
    setLocalRows(loadCertificateRecommendations().filter((r) => r.status === "pending"));
  };

  return (
    <Card>
      <CardHeader
        title="Certificate recommendations"
        hint="From Activity achievements · issue a matching certificate from Nexus templates below"
        action={<Pill tone="warning">{rows.length} pending</Pill>}
      />
      <CardBody className="divide-y divide-border p-0">
        {rows.map((row) => (
          <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 sm:px-6">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Award className="size-4 text-warning" />
                {row.achievementTitle}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {row.studentName}
                {row.studentClassLabel ? ` · ${row.studentClassLabel}` : ""} · {row.recommendedBy}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {new Date(row.recommendedAt).toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/templates" search={{}}>
                <Button type="button" variant="primary" size="sm">
                  Issue
                </Button>
              </Link>
              <Button type="button" variant="outline" size="sm" onClick={() => void dismiss(row.id)}>
                <X className="size-3.5" /> Dismiss
              </Button>
            </div>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
