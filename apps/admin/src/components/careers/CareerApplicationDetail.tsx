import { useState, type ReactNode } from "react";
import { Button, Modal, Pill } from "@lumenx/ui-admin";
import {
  docStatusLabel,
  docStatusTone,
  type AdminCareerDetail,
  type AdminCareerDocument,
} from "@/lib/careers-application-details";
import { Eye, FileText, ImageIcon } from "lucide-react";

function Section({ title, children }: { title: string; children: ReactNode }) {
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

function FieldGrid({ rows }: { rows: { label: string; value: string }[] }) {
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

function DocumentCertificateSheet({ doc }: { doc: AdminCareerDocument }) {
  return (
    <div className="mx-auto max-w-lg rounded-sm border-2 border-border bg-[#fbfaf6] text-foreground shadow-sm px-6 py-8 sm:px-10 sm:py-10">
      <div className="text-center border-b border-border/80 pb-4 mb-5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          LumenX Careers
        </p>
        <h3 className="mt-2 font-serif text-xl sm:text-2xl font-semibold tracking-tight">
          {doc.label}
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground font-mono">{doc.fileName}</p>
      </div>
      <div className="space-y-4 text-sm leading-relaxed">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Candidate name
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
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Uploaded</p>
            <p className="mt-0.5 font-medium">{doc.uploadedAt}</p>
          </div>
        </div>
        {doc.previewLines?.map((line) => (
          <p key={line} className="text-xs text-muted-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

export function CareerApplicationDetail({ detail }: { detail: AdminCareerDetail }) {
  const [preview, setPreview] = useState<AdminCareerDocument | null>(null);

  return (
    <>
      <div className="space-y-3 text-sm max-h-[min(58vh,560px)] overflow-y-auto pr-1">
        <p className="text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
          Application <span className="font-mono text-foreground">{detail.id}</span>
          {" · "}
          <span className="font-medium text-foreground">{detail.personal.name}</span>
          {" · submitted details and documents"}
        </p>

        <Section title="Role applied">
          <FieldGrid
            rows={[
              { label: "Job title", value: detail.jobTitle },
              { label: "Institute", value: detail.instituteName },
            ]}
          />
        </Section>

        <Section title="Personal information">
          <FieldGrid
            rows={[
              { label: "Full name", value: detail.personal.name },
              { label: "Gender", value: detail.personal.gender },
              { label: "Date of birth", value: detail.personal.dateOfBirth },
              { label: "Mobile", value: detail.personal.mobile },
              { label: "Email", value: detail.personal.email },
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

        <Section title="Professional">
          <FieldGrid
            rows={[
              { label: "Qualification", value: detail.professional.highestQualification },
              { label: "Experience (years)", value: detail.professional.experienceYears },
              { label: "Current employer", value: detail.professional.currentEmployer },
              { label: "Current role", value: detail.professional.currentRole },
              { label: "Expected salary", value: detail.professional.expectedSalary },
              { label: "Notice period", value: detail.professional.noticePeriod },
            ]}
          />
        </Section>

        <Section title="Skills">
          <FieldGrid
            rows={[
              { label: "Teaching subjects", value: detail.skills.teachingSubjects },
              { label: "Technical skills", value: detail.skills.technicalSkills },
              { label: "Languages", value: detail.skills.languagesKnown },
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
          <Section title="HR notes">
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {detail.adminNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.label ?? "Document"}
        subtitle={preview ? `${preview.fileName} · ${preview.applicantName}` : undefined}
        size="lg"
        footer={<Button onClick={() => setPreview(null)}>Close</Button>}
      >
        {preview?.kind === "image" && preview.previewImageUrl ? (
          <img
            src={preview.previewImageUrl}
            alt={preview.applicantName}
            className="mx-auto max-h-[60vh] rounded-md border border-border"
          />
        ) : preview ? (
          <DocumentCertificateSheet doc={preview} />
        ) : null}
      </Modal>
    </>
  );
}
