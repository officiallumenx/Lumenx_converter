import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
import { ArrowRight, Calendar, MapPin, Star, Trophy } from "lucide-react";
import { cn } from "@lumenx/ui";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import {
  INSTITUTE_KIND_LABEL,
  type AdmissionInstituteProfile,
} from "@/lib/institutes-data";

export function InstituteDetailPanel({ institute }: { institute: AdmissionInstituteProfile }) {
  const { user } = useAdmissionsAuth();
  const applySearch = { institute: institute.id };
  const applyTarget =
    user?.accountType === "parent"
      ? { to: "/apply" as const, search: applySearch }
      : {
          to: "/login" as const,
          search: { redirect: "/apply", ...applySearch },
        };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-in fade-in duration-300">
      <div className={cn("h-32 sm:h-40 bg-gradient-to-br", institute.imageGradient)} />
      <div className="p-5 sm:p-6 space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">
              {INSTITUTE_KIND_LABEL[institute.kind]}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Star className="size-3 fill-primary text-primary" /> {institute.rating}
            </span>
            <span className="text-muted-foreground">Est. {institute.established}</span>
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">{institute.name}</h2>
          <p className="text-sm text-muted-foreground">
            {institute.code} · {institute.accreditation}
          </p>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" /> {institute.contact.address}
          </p>
          <p className="mt-3 text-sm">{institute.about}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Programs", value: String(institute.programsCount) },
            { label: "Seats open", value: String(institute.seatsOpen) },
            { label: "Highlight", value: institute.heroStat },
            { label: "Rating", value: String(institute.rating) },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-muted/50 p-3 text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Highlights</h3>
          <div className="flex flex-wrap gap-2">
            {institute.highlights.map((h) => (
              <span key={h} className="rounded-full border border-border px-3 py-1 text-xs">
                {h}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Trophy className="size-4" /> Achievements
          </h3>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {institute.achievements.map((a) => (
              <li key={a}>• {a}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">Facilities</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {institute.facilities.map((f) => (
              <div key={f.title} className="rounded-xl border border-border p-3">
                <p className="font-medium text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
            <Calendar className="size-4" /> Important dates
          </h3>
          <ul className="space-y-2 text-sm">
            {institute.admissionDates.map((d) => (
              <li key={d.label} className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">{d.label}</span>
                <span className="font-medium">{d.date}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-muted/40 p-4 text-sm space-y-1">
          <p>
            <strong>Phone:</strong> {institute.contact.phone}
          </p>
          <p>
            <strong>Email:</strong> {institute.contact.email}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {user?.accountType !== "institute_admin" && (
            <Button asChild>
              <Link to={applyTarget.to} search={applyTarget.search}>
                Apply to this institute <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to="/programs">View programs</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
