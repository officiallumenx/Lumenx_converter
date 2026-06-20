import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { type StudentCertificateRecord } from "@/lib/student/mock-data";
import { Badge, Button, cn, Input } from "@lumenx/ui";
import { FileText, Download, Eye, Share2, Search } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@lumenx/ui";
import { EmptyState, PageSkeleton } from "@/student-portal/shared/ui";

const CATEGORY_LABEL = {
  academic: "Academic",
  sports: "Sports",
  cultural: "Cultural",
  technical: "Technical",
} as const;

export function StudentCertificatesPage() {
  const portal = useStudentPortal();
  const [filter, setFilter] = useState<"all" | keyof typeof CATEGORY_LABEL>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<StudentCertificateRecord | null>(null);

  const studentCertificateRecords =
    portal.isStudent && portal.snapshot ? portal.snapshot.certificates : [];
  const studentProfile = portal.snapshot?.profile;

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

  if (!portal.isStudent) return null;
  if (portal.isLoading || !portal.snapshot || !studentProfile) return <PageSkeleton rows={6} />;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Certificates"
        subtitle={`${studentCertificateRecords.length} certificates on record · Download or share anytime`}
      />

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
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {f === "all" ? "All" : CATEGORY_LABEL[f]}
          </button>
        ))}
      </div>

      {filtered.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((c) => (
            <article key={c.id} className="rounded-2xl border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium leading-snug">{c.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Issued {c.issuedOn} · {c.issuer}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">{c.refNo}</p>
                  <Badge variant="outline" className="mt-2 text-[10px]">
                    {CATEGORY_LABEL[c.category]}
                  </Badge>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => setPreview(c)}>
                  <Eye className="size-3.5" /> Preview
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg gap-1.5"
                  onClick={() => toast.success(`Download started: ${c.title}`)}
                >
                  <Download className="size-3.5" /> Download
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-lg gap-1.5"
                  onClick={() => toast.success("Share link copied to clipboard")}
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

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-6 text-center">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">
                  Certificate of Achievement
                </div>
                <div className="mt-1 text-[10px] font-mono text-muted-foreground">{preview.refNo}</div>
                <div className="mt-3 font-display text-lg font-semibold">{preview.title}</div>
                <div className="mt-2 text-muted-foreground">Awarded to {studentProfile.name}</div>
                <div className="mt-2 text-xs leading-relaxed text-muted-foreground px-2">
                  {preview.description}
                </div>
                <div className="mt-4 text-xs text-muted-foreground">
                  {preview.issuer} · {preview.issuedOn}
                </div>
                <Badge variant="outline" className="mt-3">
                  {CATEGORY_LABEL[preview.category]}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 rounded-xl gap-2"
                  onClick={() => toast.success("Certificate downloaded")}
                >
                  <Download className="size-4" /> Download PDF
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => toast.success("Share link copied")}
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
