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
import { ProfileSectionFooter, ProfileSectionNav } from "@/careers-portal/features/profile/ProfileSectionNav";
import {
  PROFILE_SECTIONS,
  computeProfileCompletion,
  computeProfileStrength,
  getCandidateProfile,
  getNextProfileSection,
  getPrevProfileSection,
  getProfileSectionIndex,
  getProfileSectionLabel,
  profileStrengthLabel,
  saveCandidateProfile,
  type ProfileSectionId,
} from "@/lib/careers/profile-repository";
import { updateUserProfileComplete } from "@/lib/careers/repositories";
import type { CandidateProfile } from "@/lib/careers/types";

export function CandidateProfilePage() {
  const { user, refresh } = useCareersAuth();
  const [profile, setProfile] = useState<CandidateProfile | null>(() => (user ? getCandidateProfile(user.id) : null));
  const [activeSection, setActiveSection] = useState<ProfileSectionId>("overview");
  const [dirty, setDirty] = useState(false);
  const sectionTopRef = useRef<HTMLDivElement>(null);

  const patchProfile = useCallback((patch: Partial<CandidateProfile>) => {
    setProfile((p) => (p ? { ...p, ...patch } : p));
    setDirty(true);
  }, []);

  const goToSection = useCallback((id: ProfileSectionId) => {
    setActiveSection(id);
    sectionTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (!user || !profile) return null;

  const pct = computeProfileCompletion(profile);
  const strength = computeProfileStrength(profile);
  const sectionIndex = getProfileSectionIndex(activeSection);
  const nextSection = getNextProfileSection(activeSection);
  const prevSection = getPrevProfileSection(activeSection);
  const isLast = !nextSection;

  const save = () => {
    const saved = saveCandidateProfile(profile);
    setProfile(saved);
    updateUserProfileComplete(user.id, computeProfileCompletion(saved));
    refresh();
    setDirty(false);
    toast.success("Profile saved");
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
        <Button onClick={save} size="sm" disabled={!dirty} className="shrink-0">
          <Save className="size-4 mr-1" /> Save changes
        </Button>
      </div>

      <div className="rounded-2xl border border-border p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{profile.headline || "Add a headline to stand out"}</p>
          </div>
          <ProfileStrengthBadge strength={profileStrengthLabel(strength)} percent={pct} />
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ProfileSectionNav sections={[...PROFILE_SECTIONS]} active={activeSection} onChange={goToSection} />

      <div className="space-y-4 pt-2">
        {activeSection === "overview" && (
          <ProfileOverviewSection profile={profile} userName={user.name} onChange={patchProfile} />
        )}
        {activeSection === "contact" && (
          <ProfileContactAddressSection profile={profile} email={user.email} phone={user.phone} onChange={patchProfile} />
        )}
        {activeSection === "experience" && (
          <ProfileWorkSection
            experience={profile.experience}
            internships={profile.internships}
            onChange={patchProfile}
          />
        )}
        {activeSection === "education" && (
          <ProfileEducationSection qualifications={profile.qualifications} onChange={(qualifications) => patchProfile({ qualifications })} />
        )}
        {activeSection === "certifications" && (
          <ProfileCertificationsAchievementsSection
            certifications={profile.certifications}
            achievements={profile.achievements}
            onChange={patchProfile}
          />
        )}
        {activeSection === "skills" && (
          <ProfileSkillsLanguagesSection
            skills={profile.skills}
            softSkills={profile.softSkills}
            languageSkills={profile.languageSkills}
            onChange={patchProfile}
          />
        )}
        {activeSection === "documents" && (
          <ProfileResumeLinksSection profile={profile} onChange={patchProfile} />
        )}

        <ProfileSectionFooter
          sectionIndex={sectionIndex}
          totalSections={PROFILE_SECTIONS.length}
          previousLabel={prevSection ? getProfileSectionLabel(prevSection) : undefined}
          nextLabel={nextSection ? getProfileSectionLabel(nextSection) : undefined}
          onPrevious={prevSection ? handlePrevious : undefined}
          onNext={nextSection ? handleNext : undefined}
          onSave={isLast ? save : undefined}
          isLast={isLast}
          dirty={dirty}
        />
      </div>

      <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
        <Button onClick={save} disabled={!dirty}>
          <Save className="size-4 mr-2" /> Save profile
        </Button>
        <p className="text-xs text-muted-foreground self-center">
          <Link to="/careers/apply" className="text-primary hover:underline">Apply to jobs</Link> — your profile pre-fills applications.
        </p>
      </div>
    </div>
  );
}
