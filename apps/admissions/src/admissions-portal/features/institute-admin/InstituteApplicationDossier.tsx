import type { ReactNode } from "react";
import { Badge } from "@lumenx/ui";
import type { AdmissionApplication, ApplicationDocument } from "@/lib/admissions/types";
import { statusLabel } from "@/lib/admissions/mock-data";
import { getAdmissionForm } from "@/lib/institute-admin";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-muted/20 overflow-hidden">
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

function DocRow({ doc }: { doc: ApplicationDocument }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-medium truncate">{doc.label}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {doc.fileName || "No file"} · {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-IN") : "—"}
        </p>
      </div>
      <Badge variant="secondary">{doc.status.replace(/_/g, " ")}</Badge>
    </div>
  );
}

/** Careers-style dossier body for an admissions application. */
export function InstituteApplicationDossier({ app }: { app: AdmissionApplication }) {
  const formFields = app.instituteId ? getAdmissionForm(app.instituteId).fields : [];
  const customRows =
    app.customAnswers && Object.keys(app.customAnswers).length > 0
      ? Object.entries(app.customAnswers).map(([id, value]) => ({
          label: formFields.find((f) => f.id === id)?.label ?? id,
          value,
        }))
      : [];

  return (
    <div className="space-y-3 text-sm max-h-[min(52vh,520px)] overflow-y-auto pr-1">
      <p className="text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
        Application <span className="font-mono text-foreground">{app.id}</span>
        {" · "}
        <span className="font-medium text-foreground">{app.student.name}</span>
        {" · "}
        {app.programName}
        {app.grade ? ` · ${app.grade}` : ""}
      </p>

      <Section title="Opening applied">
        <FieldGrid
          rows={[
            { label: "Program / class", value: app.programName },
            { label: "Grade", value: app.grade },
            { label: "Academic year", value: app.academicYear },
            {
              label: "Submitted",
              value: app.submittedAt
                ? new Date(app.submittedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—",
            },
          ]}
        />
      </Section>

      <Section title="Student">
        <FieldGrid
          rows={[
            { label: "Full name", value: app.student.name },
            { label: "Gender", value: app.student.gender },
            { label: "Date of birth", value: app.student.dateOfBirth },
            { label: "Nationality", value: app.student.nationality },
            { label: "Blood group", value: app.student.bloodGroup },
          ]}
        />
      </Section>

      <Section title="Parent / guardian">
        <FieldGrid
          rows={[
            { label: "Father", value: app.parent.fatherName },
            { label: "Mother", value: app.parent.motherName },
            { label: "Guardian", value: app.parent.guardianName },
            { label: "Mobile", value: app.parent.mobile },
            { label: "Email", value: app.parent.email },
            { label: "Occupation", value: app.parent.occupation },
          ]}
        />
      </Section>

      <Section title="Address">
        <FieldGrid
          rows={[
            { label: "Address", value: app.address.address },
            { label: "City", value: app.address.city },
            { label: "State", value: app.address.state },
            { label: "Country", value: app.address.country },
            { label: "Postal code", value: app.address.postalCode },
          ]}
        />
      </Section>

      <Section title="Academic">
        <FieldGrid
          rows={[
            { label: "Current school", value: app.academic.currentSchool },
            { label: "Current grade", value: app.academic.currentGrade },
            { label: "Previous results", value: app.academic.previousResults },
            { label: "Performance", value: app.academic.performance },
          ]}
        />
      </Section>

      {customRows.length > 0 ? (
        <Section title="Institute questions">
          <FieldGrid rows={customRows} />
        </Section>
      ) : null}

      <Section title="Documents">
        {app.documents.length === 0 ? (
          <p className="text-xs text-muted-foreground">No documents uploaded.</p>
        ) : (
          <div className="space-y-2">
            {app.documents.map((d) => (
              <DocRow key={d.id} doc={d} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Timeline">
        {app.timeline.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events yet.</p>
        ) : (
          <ul className="space-y-2">
            {[...app.timeline].reverse().map((e) => (
              <li key={e.id} className="text-xs border-b border-border/50 pb-2 last:border-0">
                <p className="font-medium">{e.label || statusLabel(e.status)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(e.at).toLocaleString("en-IN")}
                  {e.note ? ` · ${e.note}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {app.adminNotes && app.adminNotes.length > 0 ? (
        <Section title="Admin notes">
          <ul className="space-y-1 text-xs text-muted-foreground">
            {app.adminNotes.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
