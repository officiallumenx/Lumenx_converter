import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Badge } from "@lumenx/ui";
import { ArrowRight, Calendar, Heart, MapPin, Play, Star, Trophy } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { DemoInstituteProfile } from "@lumenx/types";
import { applyInstituteProfileSyncMessage, isInstituteProfileSyncMessage } from "@lumenx/utils";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { ProgramCard } from "@/admissions-portal/shared/ui/AdmissionsShellWidgets";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { getInstituteById, INSTITUTE_KIND_LABEL } from "@/lib/admissions/institutes-data";
import { getInstituteProfileExtended } from "@/lib/admissions/institute-profiles";
import { getProgramsForInstitute } from "@/lib/admissions/programs-data";
import {
  getAdmissionsInstituteProfile,
  subscribeSharedInstituteProfile,
} from "@/lib/admissions/shared-institute-profile";
import {
  InstituteLogoBadge,
  useInstituteSave,
} from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { AdminInstituteProfileView } from "./AdminInstituteProfileView";

export function InstituteProfilePage({ instituteId }: { instituteId: string }) {
  const institute = getInstituteById(instituteId);
  const ext = getInstituteProfileExtended(instituteId);
  const programs = getProgramsForInstitute(instituteId);
  const { user } = useAdmissionsAuth();
  const { saved, toggle, canSave } = useInstituteSave(instituteId);
  const [adminProfile, setAdminProfile] = useState<DemoInstituteProfile | null>(null);

  useEffect(() => {
    setAdminProfile(getAdmissionsInstituteProfile(instituteId));
    return subscribeSharedInstituteProfile(instituteId, setAdminProfile);
  }, [instituteId]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!isInstituteProfileSyncMessage(event.data)) return;
      if (event.data.admissionsInstituteId !== instituteId) return;
      const applied = applyInstituteProfileSyncMessage(event.data);
      if (applied) setAdminProfile(applied);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [instituteId]);

  if (!institute) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Institute not found.</p>
        <Button className="mt-4" asChild>
          <Link to="/admissions/institutes">Browse institutes</Link>
        </Button>
      </div>
    );
  }

  const displayName = adminProfile?.name || institute.name;
  const displayAddress = adminProfile?.address || institute.contact.address;
  const applySearch = { institute: institute.id };
  const applyTarget =
    user?.accountType === "parent"
      ? { to: "/admissions/apply" as const, search: applySearch }
      : {
          to: "/admissions/login" as const,
          search: { redirect: "/admissions/apply", ...applySearch },
        };

  return (
    <div className="animate-in fade-in duration-300 space-y-8 pb-8">
      <AdmissionsPageHeader
        title={displayName}
        subtitle={`${institute.city}, ${institute.state}`}
        backTo="/admissions/institutes"
      />

      <section
        className={cn(
          "relative overflow-hidden rounded-3xl bg-gradient-to-br border border-border p-6 sm:p-8",
          institute.imageGradient,
        )}
      >
        <div className="relative z-10 flex flex-col sm:flex-row gap-6 items-start">
          <InstituteLogoBadge instituteId={instituteId} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge>{INSTITUTE_KIND_LABEL[institute.kind]}</Badge>
              <span className="flex items-center gap-1 text-muted-foreground">
                <Star className="size-3 fill-primary text-primary" /> {institute.rating}
              </span>
              {adminProfile?.founded ? (
                <span className="text-muted-foreground">Est. {adminProfile.founded}</span>
              ) : (
                <span className="text-muted-foreground">Est. {institute.established}</span>
              )}
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{displayName}</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
              {adminProfile?.vision || ext?.shortDescription || institute.tagline}
            </p>
            <p className="mt-2 flex items-center gap-1 text-sm">
              <MapPin className="size-4" /> {displayAddress}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {user?.accountType !== "institute_admin" && (
                <Button asChild>
                  <Link to={applyTarget.to} search={applyTarget.search}>
                    Apply now <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
              )}
              {canSave && (
                <Button variant="outline" onClick={toggle}>
                  <Heart
                    className={cn("size-4 mr-1", saved && "fill-destructive text-destructive")}
                  />
                  {saved ? "Saved" : "Save institute"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {adminProfile ? (
        <AdminInstituteProfileView profile={adminProfile} />
      ) : (
        <LegacyCatalogProfile instituteId={instituteId} />
      )}

      <SectionCard
        title="Programs offered"
        link={`/admissions/institutes/${instituteId}`}
        linkLabel="All programs"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {programs.slice(0, 4).map((p) => (
            <ProgramCard key={p.id} program={p} instituteId={instituteId} showInstitute={false} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Admission office">
        <div className="text-sm space-y-1">
          <p>
            <strong>Phone:</strong>{" "}
            {adminProfile?.phone || ext?.admissionOffice.phone || institute.contact.phone}
          </p>
          <p>
            <strong>Email:</strong>{" "}
            {adminProfile?.email || ext?.admissionOffice.email || institute.contact.email}
          </p>
          <p>
            <strong>Hours:</strong> {ext?.admissionOffice.hours ?? "Mon–Sat, 9 AM – 5 PM"}
          </p>
          <p>
            <strong>Address:</strong>{" "}
            {displayAddress || ext?.admissionOffice.address || institute.contact.address}
          </p>
        </div>
        <ul className="mt-4 space-y-2">
          {institute.admissionDates.map((d) => (
            <li key={d.label} className="flex justify-between text-sm border-b border-border pb-2">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-4" />
                {d.label}
              </span>
              <span className="font-medium">{d.date}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

/** Fallback when this institute is not linked to Admin institute profile. */
function LegacyCatalogProfile({ instituteId }: { instituteId: string }) {
  const institute = getInstituteById(instituteId);
  const ext = getInstituteProfileExtended(instituteId);
  if (!institute) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Programs", value: String(institute.programsCount) },
          { label: "Seats open", value: String(institute.seatsOpen) },
          { label: "Rating", value: String(institute.rating) },
          {
            label: "Accreditation",
            value: institute.accreditation.split("·")[0]?.trim() ?? institute.accreditation,
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold">{s.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <SectionCard title="About the institute">
        <p className="text-sm text-muted-foreground leading-relaxed">{institute.about}</p>
        {ext && (
          <div className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="font-semibold text-xs uppercase text-muted-foreground">Vision</p>
              <p className="mt-1">{ext.vision}</p>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase text-muted-foreground">Mission</p>
              <p className="mt-1">{ext.mission}</p>
            </div>
            <div>
              <p className="font-semibold text-xs uppercase text-muted-foreground">History</p>
              <p className="mt-1">{ext.history}</p>
            </div>
          </div>
        )}
      </SectionCard>

      {ext && (
        <SectionCard title="Principal's message">
          <p className="text-sm font-medium">{ext.principalName}</p>
          <blockquote className="mt-2 text-sm text-muted-foreground italic border-l-2 border-primary pl-4">
            {ext.principalMessage}
          </blockquote>
        </SectionCard>
      )}

      <SectionCard title="Achievements & awards">
        <ul className="grid gap-2 sm:grid-cols-2 text-sm">
          {[...institute.achievements, ...(ext?.awards ?? [])].map((a) => (
            <li key={a} className="flex gap-2">
              <Trophy className="size-4 text-primary shrink-0" />
              {a}
            </li>
          ))}
        </ul>
      </SectionCard>

      {ext && (
        <>
          <SectionCard title="Academic highlights">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {ext.academicHighlights.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Sports highlights">
            <ul className="space-y-1 text-sm text-muted-foreground">
              {ext.sportsHighlights.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          </SectionCard>
        </>
      )}

      <SectionCard title="Facilities">
        <div className="grid gap-3 sm:grid-cols-2">
          {institute.facilities.map((f) => (
            <div key={f.title} className="rounded-xl border border-border p-3">
              <p className="font-medium text-sm">{f.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {ext && ext.campusPhotos.length > 0 && (
        <SectionCard title="Campus & media">
          <div className="grid gap-3 sm:grid-cols-3">
            {ext.campusPhotos.map((m) => (
              <div
                key={m.id}
                className={cn("rounded-xl bg-gradient-to-br h-28 flex items-end p-3", m.gradient)}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{m.title}</p>
                  {m.caption && <p className="text-[10px] text-muted-foreground">{m.caption}</p>}
                </div>
              </div>
            ))}
            {ext.videos.map((v) => (
              <div
                key={v.id}
                className={cn(
                  "rounded-xl bg-gradient-to-br h-28 flex items-center justify-center",
                  v.gradient,
                )}
              >
                <Play className="size-8 text-primary/80" />
                <span className="sr-only">{v.title}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </>
  );
}
