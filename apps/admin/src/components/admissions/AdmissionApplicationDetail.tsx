import { useState, type ReactNode } from "react";
import { Button, Modal, Pill } from "@lumenx/ui-admin";
import {
  docStatusLabel,
  docStatusTone,
  type AdminAdmissionDetail,
  type AdminAdmissionDocument,
} from "@/lib/admissions-application-details";
import { Eye, FileText, ImageIcon } from "lucide-react";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      <div className="px-3 py-2 border-b border-border/70 bg-background/50">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      </div>
      <div className="p-3">{children}</div>
    </section>
  );
}

function FieldGrid({
  rows,
}: {
  rows: { label: string; value: string }[];
}) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
      {rows.map((r) => (
        <div key={r.label} className="min-w-0">
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {r.label}
          </dt>
          <dd className="mt-0.5 font-medium text-foreground break-words">{r.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Readable certificate / PDF sheet — always opens (no broken PDF iframe). */
function DocumentCertificateSheet({ doc }: { doc: AdminAdmissionDocument }) {
  return (
    <div className="mx-auto max-w-lg rounded-sm border-2 border-border bg-[#fbfaf6] text-foreground shadow-sm px-6 py-8 sm:px-10 sm:py-10">
      <div className="text-center border-b border-border/80 pb-4 mb-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          LumenX Admissions
        </p>
        <h3 className="mt-2 font-serif text-xl sm:text-2xl font-semibold tracking-tight">
          {doc.label}
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground font-mono">{doc.fileName}</p>
      </div>

      <div className="space-y-4 text-sm leading-relaxed">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Student name
          </p>
          <p className="mt-0.5 text-lg font-semibold font-serif">{doc.applicantName}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Application no.
            </p>
            <p className="mt-0.5 font-mono font-medium">{doc.applicationId}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Uploaded
            </p>
            <p className="mt-0.5 font-medium">{doc.uploadedAt}</p>
          </div>
        </div>
        {doc.previewLines?.length ? (
          <div className="rounded-md bg-white/70 border border-border/60 px-3 py-3 space-y-1.5 text-xs text-foreground/90">
            {doc.previewLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-8 text-center text-[10px] text-muted-foreground">
        Demo document preview · same file type parents upload in Connect (PDF)
      </p>
    </div>
  );
}

export function AdmissionApplicationDetail({
  detail,
}: {
  detail: AdminAdmissionDetail;
}) {
  const [preview, setPreview] = useState<AdminAdmissionDocument | null>(null);

  return (
    <>
      <div className="space-y-3 text-sm max-h-[min(58vh,560px)] overflow-y-auto pr-1">
        <p className="text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
          Application <span className="font-mono text-foreground">{detail.id}</span>
          {" · "}
          <span className="font-medium text-foreground">{detail.student.name}</span>
          {" · submitted details and documents"}
        </p>

        <Section title="Program">
          <FieldGrid
            rows={[
              { label: "Program", value: detail.programName },
              { label: "Grade applying for", value: detail.grade },
              { label: "Academic year", value: detail.academicYear },
            ]}
          />
        </Section>

        <Section title="Student information">
          <FieldGrid
            rows={[
              { label: "Full name", value: detail.student.name },
              { label: "Gender", value: detail.student.gender },
              { label: "Date of birth", value: detail.student.dateOfBirth },
              { label: "Nationality", value: detail.student.nationality },
              { label: "Blood group", value: detail.student.bloodGroup },
            ]}
          />
        </Section>

        <Section title="Parent / guardian">
          <FieldGrid
            rows={[
              { label: "Father's name", value: detail.parent.fatherName },
              { label: "Mother's name", value: detail.parent.motherName },
              { label: "Guardian name", value: detail.parent.guardianName },
              { label: "Mobile", value: detail.parent.mobile },
              { label: "Email", value: detail.parent.email },
              { label: "Occupation", value: detail.parent.occupation },
            ]}
          />
        </Section>

        <Section title="Address">
          <FieldGrid
            rows={[
              { label: "Address", value: detail.address.address },
              { label: "City", value: detail.address.city },
              { label: "State", value: detail.address.state },
              { label: "Country", value: detail.address.country },
              { label: "Postal code", value: detail.address.postalCode },
            ]}
          />
        </Section>

        <Section title="Academic information">
          <FieldGrid
            rows={[
              { label: "Current school", value: detail.academic.currentSchool },
              { label: "Current grade", value: detail.academic.currentGrade },
              { label: "Previous results", value: detail.academic.previousResults },
              { label: "Performance", value: detail.academic.performance },
            ]}
          />
        </Section>

        <Section title="Documents">
          <ul className="space-y-2">
            {detail.documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                  {doc.kind === "pdf" ? (
                    <FileText className="size-4" />
                  ) : (
                    <ImageIcon className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium">{doc.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    <span className="font-medium text-foreground">{doc.applicantName}</span>
                    {" · "}
                    <span className="font-mono">{doc.fileName}</span>
                  </div>
                  {doc.note ? (
                    <p className="mt-0.5 text-[10px] text-destructive">{doc.note}</p>
                  ) : null}
                </div>
                <Pill tone={docStatusTone(doc.status)}>{docStatusLabel(doc.status)}</Pill>
                <Button size="sm" onClick={() => setPreview(doc)}>
                  <Eye className="size-3.5" /> View
                </Button>
              </li>
            ))}
          </ul>
        </Section>

        {detail.adminNotes?.length ? (
          <Section title="Notes">
            <ul className="space-y-1 text-xs text-muted-foreground">
              {detail.adminNotes.map((n) => (
                <li key={n}>• {n}</li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section title="Timeline">
          <ul className="space-y-1.5 text-xs">
            {detail.timeline.map((t) => (
              <li key={`${t.label}-${t.at}`} className="flex justify-between gap-3">
                <span className="font-medium">{t.label}</span>
                <span className="text-muted-foreground font-mono shrink-0">
                  {t.at.slice(0, 10)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.label ?? "Document"}
        subtitle={
          preview
            ? `${preview.applicantName} · ${preview.applicationId} · ${preview.fileName}`
            : undefined
        }
        size="xl"
        footer={<Button onClick={() => setPreview(null)}>Close</Button>}
      >
        {preview ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <Pill tone={docStatusTone(preview.status)}>
                {docStatusLabel(preview.status)}
              </Pill>
              <span>Uploaded {preview.uploadedAt}</span>
            </div>
            {preview.kind === "image" && preview.previewImageUrl ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                <img
                  src={preview.previewImageUrl}
                  alt={preview.applicantName}
                  className="max-h-[min(55vh,480px)] rounded-md"
                />
                <p className="text-sm font-semibold">{preview.applicantName}</p>
              </div>
            ) : (
              <DocumentCertificateSheet doc={preview} />
            )}
          </div>
        ) : null}
      </Modal>
    </>
  );
}
