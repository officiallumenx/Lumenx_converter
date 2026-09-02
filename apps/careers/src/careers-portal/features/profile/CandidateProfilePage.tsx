import { Link } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Button } from "@lumenx/ui";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { ProfileStrengthBadge } from "@/careers-portal/shared/ui/v2/CareersV2Widgets";
import {
  ProfileCertificationsAchievementsSection,
  ProfileContactAddressSection,
  ProfileEducationSection,
  ProfileOverviewSection,
  ProfileResumeLinksSection,
  ProfileSkillsLanguagesSection,
  ProfileWorkSection,
} from "@/careers-portal/features/profile/ProfileEditorSections";
import {
  ProfileSectionFooter,
  ProfileSectionNav,
} from "@/careers-portal/features/profile/ProfileSectionNav";
import {
  PROFILE_SECTIONS,
  computeProfileCompletion,
  computeProfileStrength,
  getNextProfileSection,
  getPrevProfileSection,
  getProfileSectionIndex,
  getProfileSectionLabel,
  profileStrengthLabel,
  type ProfileSectionId,
} from "@/lib/careers/profile-repository";
import { updateUserProfileComplete } from "@/lib/careers/repositories";
import type { CandidateProfile } from "@/lib/careers/types";
import { useCareersProfile } from "@/hooks/use-careers-profile";

export function CandidateProfilePage() {
  const { user, refresh } = useCareersAuth();
  const { profile: loadedProfile, loading, save: saveProfile, setProfile } = useCareersProfile();
  const [profile, setLocalProfile] = useState<CandidateProfile | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSectionId>("overview");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const sectionTopRef = useRef<HTMLDivElement>(null);

  const activeProfile = profile ?? loadedProfile;

  const patchProfile = useCallback((patch: Partial<CandidateProfile>) => {
    setLocalProfile((p) => {
      const base = p ?? loadedProfile;
      return base ? { ...base, ...patch } : p;
    });
    setDirty(true);
  }, [loadedProfile]);

  const goToSection = useCallback((id: ProfileSectionId) => {
    setActiveSection(id);
    sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!user || loading || !activeProfile) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {loading ? "Loading profile…" : null}
      </div>
    );
  }

  const pct = computeProfileCompletion(activeProfile);
  const strength = computeProfileStrength(activeProfile);
  const sectionIndex = getProfileSectionIndex(activeSection);
  const nextSection = getNextProfileSection(activeSection);
  const prevSection = getPrevProfileSection(activeSection);
  const isLast = !nextSection;

  const save = async () => {
    setSaving(true);
    try {
      const saved = await saveProfile(activeProfile);
      setLocalProfile(saved);
      setProfile(saved);
      updateUserProfileComplete(user.id, computeProfileCompletion(saved));
      refresh();
      setDirty(false);
      toast.success("Profile saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (nextSection) goToSection(nextSection);
  };

  const handlePrevious = () => {
    if (prevSection) goToSection(prevSection);
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6 max-w-4xl">
      <div ref={sectionTopRef} className="flex flex-wrap items-start justify-between gap-4">
        <CareersPageHeader
          title="Professional profile"
          subtitle="Fill each section step by step — use Next at the bottom or swipe the tabs above."
        />
        <Button onClick={() => void save()} size="sm" disabled={!dirty || saving} className="shrink-0">
          <Save className="size-4 mr-1" /> Save changes
        </Button>
      </div>

      <div className="rounded-2xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {activeProfile.headline || "Add a headline to stand out"}
            </p>
          </div>
          <ProfileStrengthBadge strength={profileStrengthLabel(strength)} percent={pct} />
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ProfileSectionNav
        sections={[...PROFILE_SECTIONS]}
        active={activeSection}
        onChange={goToSection}
      />

      <div className="space-y-4 pt-2">
        {activeSection === "overview" && (
          <ProfileOverviewSection profile={activeProfile} userName={user.name} onChange={patchProfile} />
        )}
        {activeSection === "contact" && (
          <ProfileContactAddressSection
            profile={activeProfile}
            email={user.email}
            phone={user.phone}
            onChange={patchProfile}
          />
        )}
        {activeSection === "experience" && (
          <ProfileWorkSection
            experience={activeProfile.experience}
            internships={activeProfile.internships}
            onChange={patchProfile}
          />
        )}
        {activeSection === "education" && (
          <ProfileEducationSection
            qualifications={activeProfile.qualifications}
            onChange={(qualifications) => patchProfile({ qualifications })}
          />
        )}
        {activeSection === "certifications" && (
          <ProfileCertificationsAchievementsSection
            certifications={activeProfile.certifications}
            achievements={activeProfile.achievements}
            onChange={patchProfile}
          />
        )}
        {activeSection === "skills" && (
          <ProfileSkillsLanguagesSection
            skills={activeProfile.skills}
            softSkills={activeProfile.softSkills}
            languageSkills={activeProfile.languageSkills}
            onChange={patchProfile}
          />
        )}
        {activeSection === "documents" && (
          <ProfileResumeLinksSection profile={activeProfile} onChange={patchProfile} />
        )}

        <ProfileSectionFooter
          sectionIndex={sectionIndex}
          totalSections={PROFILE_SECTIONS.length}
          previousLabel={prevSection ? getProfileSectionLabel(prevSection) : undefined}
          nextLabel={nextSection ? getProfileSectionLabel(nextSection) : undefined}
          onPrevious={prevSection ? handlePrevious : undefined}
          onNext={nextSection ? handleNext : undefined}
          onSave={isLast ? () => void save() : undefined}
          isLast={isLast}
          dirty={dirty}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        <Button onClick={() => void save()} disabled={!dirty || saving}>
          <Save className="size-4 mr-2" /> Save profile
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          <Link to="/apply" className="text-primary hover:underline">
            Apply to jobs
          </Link>{" "}
          — your profile pre-fills applications.
        </p>
      </div>
    </div>
  );
}
