import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button, Badge } from "@lumenx/ui";
import { Building2, Heart, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { JobCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { cn } from "@lumenx/ui";
import { getInstituteProfile, INSTITUTE_TYPE_LABEL } from "@/lib/careers/institute-profiles";
import { getJobsByInstitute } from "@/lib/careers/recommendations";
import { isInstituteFollowed, toggleFollowInstitute, toggleSavedInstitute, isInstituteSaved } from "@/lib/careers/follow-store";
import { addNotification } from "@/lib/careers/repositories";

export function InstituteProfilePage({ instituteId }: { instituteId: string }) {
  const { user } = useCareersAuth();
  const inst = getInstituteProfile(instituteId);
  const [followed, setFollowed] = useState(() => (user ? isInstituteFollowed(user.id, instituteId) : false));
  const [saved, setSaved] = useState(() => (user ? isInstituteSaved(user.id, instituteId) : false));

  if (!inst) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Institute not found.</p>
        <Button className="mt-4" variant="outline" asChild><Link to="/careers/institutes">Back to institutes</Link></Button>
      </div>
    );
  }

  const jobs = getJobsByInstitute(instituteId);

  const toggleFollow = () => {
    if (!user) { toast.message("Sign in to follow institutes"); return; }
    const next = toggleFollowInstitute(user.id, instituteId);
    setFollowed(next);
    if (next) {
      addNotification({
        candidateId: user.id,
        title: "Following " + inst.name,
        body: "You'll receive alerts when new jobs are posted.",
        type: "job_alert",
      });
    }
    toast.success(next ? "Following institute" : "Unfollowed");
  };

  const toggleSave = () => {
    if (!user) { toast.message("Sign in to save institutes"); return; }
    setSaved(toggleSavedInstitute(user.id, instituteId));
    toast.success("Saved");
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <CareersPageHeader backTo="/careers/institutes" backLabel="Institutes" />

      <div className={cn("rounded-2xl bg-gradient-to-br p-6 sm:p-8 text-white", inst.logoGradient)}>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-bold">{inst.logoInitials}</div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">{inst.name}</h1>
              <p className="text-white/80 text-sm mt-1">{INSTITUTE_TYPE_LABEL[inst.type]} · {inst.city}, {inst.state}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={toggleFollow}>
              <Heart className={cn("size-4 mr-1", followed && "fill-destructive text-destructive")} />
              {followed ? "Following" : "Follow"}
            </Button>
            <Button variant="secondary" size="sm" onClick={toggleSave}>{saved ? "Saved" : "Save"}</Button>
            <Button size="sm" asChild>
              <Link to="/careers/jobs" search={{ institute: instituteId }}>View jobs</Link>
            </Button>
          </div>
        </div>
        <p className="mt-4 text-white/90 text-sm max-w-2xl">{inst.tagline}</p>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border p-5 space-y-3">
            <h2 className="font-semibold">About</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{inst.about}</p>
          </div>
          <div className="rounded-2xl border border-border p-5 space-y-3">
            <h2 className="font-semibold">Message from {inst.principalName}</h2>
            <p className="text-sm text-muted-foreground italic leading-relaxed">&ldquo;{inst.principalMessage}&rdquo;</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold mb-2">Mission</h3>
              <p className="text-xs text-muted-foreground">{inst.mission}</p>
            </div>
            <div className="rounded-2xl border border-border p-4">
              <h3 className="text-sm font-semibold mb-2">Vision</h3>
              <p className="text-xs text-muted-foreground">{inst.vision}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border p-5">
            <h2 className="font-semibold mb-3">Culture</h2>
            <div className="flex flex-wrap gap-2">
              {inst.culture.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
            </div>
          </div>
          <div className="rounded-2xl border border-border p-5">
            <h2 className="font-semibold mb-3">Campus gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {inst.gallery.map((g) => (
                <div key={g.id} className={cn("aspect-video rounded-xl bg-gradient-to-br flex items-end p-2", g.gradient)}>
                  <span className="text-xs font-medium text-foreground/80">{g.title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Building2 className="size-4" /> Contact</h3>
            <p className="text-xs flex items-start gap-2"><MapPin className="size-3.5 shrink-0 mt-0.5" />{inst.contact.address}</p>
            <p className="text-xs flex items-center gap-2"><Phone className="size-3.5" />{inst.contact.phone}</p>
            <p className="text-xs flex items-center gap-2"><Mail className="size-3.5" />{inst.contact.email}</p>
            <p className="text-xs text-muted-foreground">{inst.contact.hours}</p>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-2">Benefits</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {inst.benefits.map((b) => <li key={b}>{b}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-sm mb-2">Facilities</h3>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
              {inst.facilities.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-display text-xl font-bold mb-4">Open positions ({jobs.length})</h2>
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open roles right now. Follow to get alerts.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => <JobCard key={job.id} job={job} compact />)}
          </div>
        )}
      </section>
    </div>
  );
}
