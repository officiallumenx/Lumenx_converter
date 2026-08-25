import type { ReactNode } from "react";
import { Badge } from "@lumenx/ui";
import type { ApplicationDocument, JobApplication } from "@/lib/careers/types";
import { statusLabel } from "@/lib/careers/status-utils";

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
          {doc.fileName || "No file"} ·{" "}
          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString("en-IN") : "—"}
        </p>
      </div>
      <Badge variant="secondary">{doc.status.replace(/_/g, " ")}</Badge>
    </div>
  );
}

/** Full application dossier for recruiter review (mirrors Admissions). */
export function RecruiterApplicationDossier({ app }: { app: JobApplication }) {
  return (
    <div className="space-y-3 text-sm max-h-[min(52vh,520px)] overflow-y-auto pr-1">
      <p className="text-[11px] text-muted-foreground rounded-lg border border-border bg-muted/30 px-3 py-2">
        Application <span className="font-mono text-foreground">{app.id}</span>
        {" · "}
        <span className="font-medium text-foreground">{app.personal.name}</span>
        {" · "}
        {app.jobTitle}
      </p>

      <Section title="Role applied">
        <FieldGrid
          rows={[
            { label: "Role", value: app.jobTitle },
            { label: "Institute", value: app.instituteName },
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
            { label: "Status", value: statusLabel(app.status) },
          ]}
        />
      </Section>

      <Section title="Candidate">
        <FieldGrid
          rows={[
            { label: "Full name", value: app.personal.name },
            { label: "Gender", value: app.personal.gender },
            { label: "Date of birth", value: app.personal.dateOfBirth },
            { label: "Mobile", value: app.personal.mobile },
            { label: "Email", value: app.personal.email },
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

      <Section title="Professional">
        <FieldGrid
          rows={[
            { label: "Qualification", value: app.professional.highestQualification },
            { label: "Experience", value: `${app.professional.experienceYears} yrs` },
            { label: "Current employer", value: app.professional.currentEmployer },
            { label: "Current role", value: app.professional.currentRole },
            { label: "Expected salary", value: app.professional.expectedSalary },
            { label: "Notice period", value: app.professional.noticePeriod },
          ]}
        />
      </Section>

      <Section title="Skills">
        <FieldGrid
          rows={[
            { label: "Teaching subjects", value: app.skills.teachingSubjects },
            { label: "Sports", value: app.skills.sportsSpecialization },
            { label: "Lab", value: app.skills.labSpecialization },
            { label: "Technical", value: app.skills.technicalSkills },
            { label: "Languages", value: app.skills.languagesKnown },
          ]}
        />
      </Section>

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

      {app.interview ? (
        <Section title="Interview">
          <FieldGrid
            rows={[
              { label: "Date", value: app.interview.date },
              { label: "Time", value: app.interview.time },
              { label: "Mode", value: app.interview.mode },
              { label: "Location", value: app.interview.location },
              { label: "Status", value: app.interview.status },
              { label: "Instructions", value: app.interview.instructions },
            ]}
          />
        </Section>
      ) : null}

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

      {app.hrNotes && app.hrNotes.length > 0 ? (
        <Section title="HR notes">
          <ul className="space-y-1 text-xs text-muted-foreground">
            {app.hrNotes.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}
