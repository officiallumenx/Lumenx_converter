import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@lumenx/ui";
import { ArrowRight, Calendar, Heart } from "lucide-react";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { ProgramCard } from "@/admissions-portal/shared/ui/AdmissionsShellWidgets";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { getInstituteById } from "@/lib/institutes-data";
import { getRelatedPrograms } from "@/lib/programs-data";
import { FAQ_ITEMS } from "@/lib/admissions/mock-data";
import { InstituteLogoBadge } from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { isProgramSaved, toggleSavedProgram } from "@/lib/admissions/saved-store";
import { useAdmissionProgramDetail } from "@/hooks/use-admission-program-detail";
import { useState } from "react";
import { cn } from "@lumenx/ui";

export function ProgramDetailPage({ programId }: { programId: string }) {
  const { program, loading, errorMessage } = useAdmissionProgramDetail(programId);
  const { user } = useAdmissionsAuth();
  const [, tick] = useState(0);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Loading program…</p>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">
          {errorMessage ?? "Program not found."}
        </p>
        <Button className="mt-4" asChild>
          <Link to="/programs">Browse programs</Link>
        </Button>
      </div>
    );
  }

  const institute = getInstituteById(program.instituteId);
  const related = getRelatedPrograms(programId).filter((p) => p.id !== program.id);
  const faqs = FAQ_ITEMS.filter((f) => program.faqIds?.includes(f.id));
  const saved = user ? isProgramSaved(user.id, programId) : false;
  const applySearch = { program: program.id, institute: program.instituteId };
  const applyTarget =
    user?.accountType === "parent"
      ? { to: "/apply" as const, search: applySearch }
      : {
          to: "/login" as const,
          search: { redirect: "/apply", ...applySearch },
        };

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <AdmissionsPageHeader
        title={program.name}
        subtitle={institute?.name ?? "Program details"}
        backTo="/programs"
      />

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {institute && <InstituteLogoBadge instituteId={institute.id} />}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{program.academicYear}</Badge>
              <Badge variant="secondary">{program.seatsAvailable} seats</Badge>
            </div>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {program.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild>
                <Link to={applyTarget.to} search={applyTarget.search}>
                  Apply now <ArrowRight className="size-4 ml-1" />
                </Link>
              </Button>
              {user && (
                <Button
                  variant="outline"
                  onClick={() => {
                    toggleSavedProgram(user.id, programId);
                    tick((n) => n + 1);
                  }}
                >
                  <Heart
                    className={cn("size-4 mr-1", saved && "fill-destructive text-destructive")}
                  />
                  {saved ? "Saved" : "Save program"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SectionCard title="Eligibility & criteria">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Eligibility</dt>
              <dd className="font-medium text-right">{program.eligibility}</dd>
            </div>
            {program.ageCriteria && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Age</dt>
                <dd className="font-medium">{program.ageCriteria}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="font-medium">{program.duration}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Grades</dt>
              <dd className="font-medium">{program.grades.join(", ")}</dd>
            </div>
          </dl>
        </SectionCard>
        <SectionCard title="Important dates">
          <p className="flex items-center gap-2 text-sm">
            <Calendar className="size-4 text-primary" /> Application deadline:{" "}
            <strong>{program.applicationDeadline}</strong>
          </p>
          {institute && (
            <Button variant="link" className="mt-2 px-0" asChild>
              <Link to="/institutes/$instituteId" params={{ instituteId: institute.id }}>
                View institute profile
              </Link>
            </Button>
          )}
        </SectionCard>
      </div>

      {program.subjects && (
        <SectionCard title="Subjects">
          <div className="flex flex-wrap gap-2">
            {program.subjects.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </SectionCard>
      )}
      {program.facilities && (
        <SectionCard title="Facilities">
          <ul className="text-sm text-muted-foreground space-y-1">
            {program.facilities.map((f) => (
              <li key={f}>• {f}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      {faqs.length > 0 && (
        <SectionCard title="FAQ">
          <div className="space-y-3">
            {faqs.map((f) => (
              <div key={f.id} className="rounded-xl border border-border p-3">
                <p className="text-sm font-medium">{f.question}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.answer}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {related.length > 0 && (
        <SectionCard title="Related programs">
          <div className="grid gap-4 sm:grid-cols-2">
            {related.map((p) => (
              <ProgramCard key={p.id} program={p} instituteId={p.instituteId} />
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
