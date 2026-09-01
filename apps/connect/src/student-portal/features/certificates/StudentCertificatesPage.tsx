import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/PageHeader";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { useParentPortal } from "@/context/ParentPortalContext";
import { studentCertificateRecords as demoCertificateRecords } from "@/lib/student/mock-data";
import { mergeIssuedCertificates } from "@/lib/student/admin-issued-certificates-bridge";
import {
  getIssuedCertificateSignedUrl,
  useLearnerCertificates,
  type LearnerCertificateRecord,
} from "@/lib/certificates";
import { isApiAuthMode } from "@/auth/auth-mode";
import { Badge, Button, cn, Input } from "@lumenx/ui";
import { FileText, Download, Eye, Share2, Search, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@lumenx/ui";
import { EmptyState, PageSkeleton } from "@/student-portal/shared/ui";
import { downloadStudentCertificateToDevice } from "@/lib/device-file-downloads";
import { SafeQrCode } from "@/components/app/id-card/SafeQrCode";

const CATEGORY_LABEL = {
  academic: "Academic",
  sports: "Sports",
  cultural: "Cultural",
  technical: "Technical",
} as const;

type CertificateRow = LearnerCertificateRecord & {
  demo?: boolean;
};

function demoToRows(
  records: ReturnType<typeof mergeIssuedCertificates>,
  origin: string,
): CertificateRow[] {
  return records.map((c) => ({
    id: c.id,
    title: c.title,
    refNo: c.refNo,
    issuer: c.issuer,
    issuedOn: c.issuedOn,
    category: c.category,
    description: c.description,
    studentId: null,
    hasDownload: true,
    verifyUrl: `${origin}/verify-certificate?number=${encodeURIComponent(c.refNo)}`,
    demo: true,
  }));
}

export function StudentCertificatesPage({ readOnlyParent = false }: { readOnlyParent?: boolean }) {
  const apiMode = isApiAuthMode();
  const portal = useStudentPortal();
  const parentPortal = useParentPortal();
  const parentSnap = readOnlyParent && parentPortal.isParent ? parentPortal.snapshot : null;
  const childId = readOnlyParent && parentSnap ? parentSnap.child.id : undefined;
  const apiCerts = useLearnerCertificates({ studentId: childId });

  const [filter, setFilter] = useState<"all" | keyof typeof CATEGORY_LABEL>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<CertificateRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const studentCertificateRecords: CertificateRow[] = useMemo(() => {
    if (apiMode) {
      if (apiCerts.loading) return [];
      return apiCerts.records;
    }
    if (readOnlyParent && parentSnap) {
      return demoToRows(
        mergeIssuedCertificates(parentSnap.child.id, demoCertificateRecords),
        origin,
      );
    }
    if (portal.isStudent && portal.snapshot) {
      return demoToRows(portal.snapshot.certificates, origin);
    }
    return [];
  }, [
    apiMode,
    apiCerts.loading,
    apiCerts.records,
    readOnlyParent,
    parentSnap,
    portal.isStudent,
    portal.snapshot,
    origin,
  ]);

  const studentProfile =
    readOnlyParent && parentSnap
      ? {
          name: parentSnap.child.name,
          class: parentSnap.child.className,
          section: parentSnap.child.section,
        }
      : portal.snapshot?.profile;

  const filtered = useMemo(() => {
    let list = studentCertificateRecords;
    if (filter !== "all") list = list.filter((c) => c.category === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.refNo.toLowerCase().includes(q) ||
          c.issuer.toLowerCase().includes(q),
      );
    }
    return [...list].sort(
      (a, b) => new Date(b.issuedOn).getTime() - new Date(a.issuedOn).getTime(),
    );
  }, [filter, query, studentCertificateRecords]);

  const openPreview = async (row: CertificateRow) => {
    setPreview(row);
    setPreviewUrl(null);
    if (row.demo || !apiMode || !row.hasDownload) return;
    setPreviewLoading(true);
    try {
      const { signedUrl } = await getIssuedCertificateSignedUrl(row.id);
      setPreviewUrl(signedUrl);
    } catch {
      setPreviewUrl(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadRow = async (row: CertificateRow) => {
    if (row.demo) {
      const { filename } = downloadStudentCertificateToDevice(
        {
          id: row.id,
          title: row.title,
          refNo: row.refNo,
          issuer: row.issuer,
          issuedOn: row.issuedOn,
          category: row.category,
          description: row.description,
        },
        studentProfile?.name ?? "Student",
      );
      toast.success("Saved to Downloads", { description: filename });
      return;
    }
    if (!row.hasDownload) {
      toast.message("No file on record", {
        description: "This certificate was issued locally — contact the school office.",
      });
      return;
    }
    try {
      const { signedUrl } = await getIssuedCertificateSignedUrl(row.id);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
      toast.success("Opening certificate download");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  const shareRow = async (row: CertificateRow) => {
    try {
      await navigator.clipboard.writeText(row.verifyUrl);
      toast.success("Verify link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (!readOnlyParent && !portal.isStudent) return null;
  if (readOnlyParent && parentPortal.isLoading && !parentSnap) return <PageSkeleton rows={6} />;
  if (readOnlyParent && !parentSnap) {
    return (
      <EmptyState
        icon={FileText}
        title="Certificates unavailable"
        description="Select a linked child to view their certificates."
      />
    );
  }
  if (!readOnlyParent && !apiMode && (portal.isLoading || !portal.snapshot || !studentProfile)) {
    return <PageSkeleton rows={6} />;
  }
  if (apiMode && apiCerts.loading) {
    return <PageSkeleton rows={6} />;
  }

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Certificates"
        subtitle={
          readOnlyParent && parentSnap
            ? `Read-only certificates for ${parentSnap.child.name}`
            : `${studentCertificateRecords.length} certificates on record · Download or verify anytime`
        }
        action={
          <Link
            to="/verify-certificate"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium hover:bg-muted/50"
          >
            <QrCode className="size-4 text-primary" />
            Verify
          </Link>
        }
      />

      {readOnlyParent && parentPortal.isParent ? (
        <div className="max-w-md">
          <ChildSwitcher />
        </div>
      ) : null}

      {apiMode && apiCerts.error ? (
        <p className="text-sm text-destructive">{apiCerts.error}</p>
      ) : null}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, ref no, or issuer…"
          className="rounded-xl pl-9"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "academic", "sports", "cultural", "technical"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn("student-filter-chip capitalize", filter === f && "is-active")}
          >
            {f === "all" ? "All" : CATEGORY_LABEL[f]}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <article key={c.id} className="student-list-row rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium leading-snug">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Issued {c.issuedOn} · {c.issuer}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground font-mono">{c.refNo}</p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {CATEGORY_LABEL[c.category]}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-lg gap-1.5"
                  onClick={() => void openPreview(c)}
                >
                  <Eye className="size-3.5" /> Preview
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg gap-1.5"
                  onClick={() => void downloadRow(c)}
                >
                  <Download className="size-3.5" /> Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg gap-1.5"
                  onClick={() => void shareRow(c)}
                >
                  <Share2 className="size-3.5" /> Share
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No certificates match your search"
          description="Try a different keyword or clear filters to see all certificates on record."
          action={
            query || filter !== "all" ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      <Dialog
        open={!!preview}
        onOpenChange={(o) => {
          if (!o) {
            setPreview(null);
            setPreviewUrl(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              {previewUrl ? (
                <iframe
                  title="Certificate preview"
                  src={previewUrl}
                  className="h-64 w-full rounded-xl border bg-muted/30"
                />
              ) : (
                <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    Certificate of Achievement
                  </div>
                  <div className="mt-1 text-[10px] font-mono text-muted-foreground">
                    {preview.refNo}
                  </div>
                  <div className="mt-3 font-display text-lg font-semibold">{preview.title}</div>
                  <div className="mt-2 text-muted-foreground">
                    Awarded to {studentProfile?.name ?? "Student"}
                  </div>
                  <div className="mt-2 text-xs leading-relaxed text-muted-foreground px-2">
                    {preview.description}
                  </div>
                  <div className="mt-4 text-xs text-muted-foreground">
                    {preview.issuer} · {preview.issuedOn}
                  </div>
                  <Badge variant="outline" className="mt-3">
                    {CATEGORY_LABEL[preview.category]}
                  </Badge>
                  {previewLoading ? (
                    <p className="mt-3 text-xs text-muted-foreground">Loading PDF preview…</p>
                  ) : null}
                </div>
              )}
              <div className="flex justify-center">
                <SafeQrCode value={preview.verifyUrl} size={88} />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl gap-2"
                  onClick={() => void downloadRow(preview)}
                >
                  <Download className="size-4" /> Download
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => void shareRow(preview)}
                >
                  <Share2 className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
