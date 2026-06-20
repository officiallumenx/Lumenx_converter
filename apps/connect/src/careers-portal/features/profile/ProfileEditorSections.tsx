import { Link } from "@tanstack/react-router";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@lumenx/ui";
import { Camera, Mail, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentUploadCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import {
  EDUCATION_LEVEL_OPTIONS,
  LANGUAGE_PROFICIENCY_OPTIONS,
  SOFT_SKILL_SUGGESTIONS,
  createProfileId,
} from "@/lib/careers/profile-repository";
import type {
  AchievementEntry,
  CandidateProfile,
  CertificationEntry,
  EmploymentStatus,
  ExperienceEntry,
  InternshipEntry,
  LanguageEntry,
  ProfileLinkEntry,
  QualificationEntry,
} from "@/lib/careers/types";
import { EmptySectionHint, ProfileSectionCard, ProfileSubsection, TagInput } from "./ProfileSectionNav";

const EMPLOYMENT_STATUS_OPTIONS: { value: EmploymentStatus; label: string }[] = [
  { value: "employed", label: "Currently employed" },
  { value: "unemployed", label: "Not employed" },
  { value: "freelance", label: "Freelancing" },
  { value: "student", label: "Student / Fresher" },
];

function readFileAsDataUrl(file: File, maxMb: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > maxMb * 1024 * 1024) {
      reject(new Error(`File must be under ${maxMb}MB`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function EntryActions({ onRemove }: { onRemove: () => void }) {
  return (
    <Button type="button" variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove}>
      <Trash2 className="size-4" />
    </Button>
  );
}

export function ProfileOverviewSection({
  profile,
  userName,
  onChange,
}: {
  profile: CandidateProfile;
  userName: string;
  onChange: (patch: Partial<CandidateProfile>) => void;
}) {
  const uploadPhoto = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file, 2);
      onChange({ photoDataUrl: dataUrl, photoFileName: file.name });
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  return (
    <ProfileSectionCard title="Overview" description="Photo, headline, summary, and career preferences.">
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="relative shrink-0">
          <div className="size-24 rounded-full border-2 border-border bg-muted overflow-hidden flex items-center justify-center">
            {profile.photoDataUrl ? (
              <img src={profile.photoDataUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-2xl font-semibold text-muted-foreground">{userName.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-primary p-2 text-primary-foreground shadow-md">
            <Camera className="size-4" />
            <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); }} />
          </label>
        </div>
        <div className="flex-1 space-y-3 w-full">
          <p className="font-medium">{userName}</p>
          <div className="space-y-2">
            <Label>Professional headline</Label>
            <Input value={profile.headline} onChange={(e) => onChange({ headline: e.target.value })} placeholder="e.g. Senior Math Teacher · 8+ years · Hyderabad" />
          </div>
          <div className="space-y-2">
            <Label>About / summary</Label>
            <Textarea value={profile.summary} onChange={(e) => onChange({ summary: e.target.value })} rows={5} placeholder="Brief overview of your experience and goals." />
          </div>
          <div className="space-y-2">
            <Label>Employment status</Label>
            <Select value={profile.employmentStatus} onValueChange={(v) => onChange({ employmentStatus: v as EmploymentStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Expected salary</Label><Input value={profile.expectedSalary} onChange={(e) => onChange({ expectedSalary: e.target.value })} placeholder="₹6–8 LPA" /></div>
        <div className="space-y-2"><Label>Notice period / availability</Label><Input value={profile.availability} onChange={(e) => onChange({ availability: e.target.value })} placeholder="Immediate / 30 days" /></div>
        <div className="space-y-2 sm:col-span-2"><Label>Current employer</Label><Input value={profile.currentEmployer} onChange={(e) => onChange({ currentEmployer: e.target.value })} placeholder="Leave blank if not employed" /></div>
      </div>
    </ProfileSectionCard>
  );
}

export function ProfileContactAddressSection({
  profile,
  email,
  phone,
  onChange,
}: {
  profile: CandidateProfile;
  email?: string;
  phone?: string;
  onChange: (patch: Partial<CandidateProfile>) => void;
}) {
  return (
    <ProfileSectionCard title="Contact & address" description="Contact details and location for applications and job matching.">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" /> Email</Label>
          <Input value={email ?? ""} readOnly className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" /> Mobile</Label>
          <Input value={phone ?? ""} readOnly className="bg-muted/50" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Email and mobile are managed from your account settings after signup verification.</p>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="space-y-2">
          <Label>Street address</Label>
          <Textarea value={profile.address} onChange={(e) => onChange({ address: e.target.value })} rows={2} placeholder="House no., street, area" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>City</Label><Input value={profile.city} onChange={(e) => onChange({ city: e.target.value })} /></div>
          <div className="space-y-2"><Label>State</Label><Input value={profile.state} onChange={(e) => onChange({ state: e.target.value })} /></div>
          <div className="space-y-2"><Label>Country</Label><Input value={profile.country} onChange={(e) => onChange({ country: e.target.value })} /></div>
          <div className="space-y-2"><Label>Postal code</Label><Input value={profile.postalCode} onChange={(e) => onChange({ postalCode: e.target.value })} placeholder="500001" /></div>
        </div>
      </div>
    </ProfileSectionCard>
  );
}

function WorkExperienceList({
  experience,
  onChange,
}: {
  experience: ExperienceEntry[];
  onChange: (next: ExperienceEntry[]) => void;
}) {
  const update = (i: number, patch: Partial<ExperienceEntry>) => {
    const next = [...experience];
    next[i] = { ...next[i]!, ...patch };
    onChange(next);
  };

  if (experience.length === 0) {
    return <EmptySectionHint text="No work experience added yet." />;
  }

  return (
    <div className="space-y-4">
      {experience.map((exp, i) => (
        <div key={exp.id} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Role {i + 1}</p>
            <EntryActions onRemove={() => onChange(experience.filter((e) => e.id !== exp.id))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Job title</Label><Input value={exp.title} onChange={(e) => update(i, { title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Company / institute</Label><Input value={exp.organization} onChange={(e) => update(i, { organization: e.target.value })} /></div>
            <div className="space-y-2"><Label>Start</Label><Input value={exp.from} onChange={(e) => update(i, { from: e.target.value })} placeholder="2020-06" /></div>
            <div className="space-y-2"><Label>End</Label><Input value={exp.to ?? ""} disabled={exp.current} onChange={(e) => update(i, { to: e.target.value })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Location</Label><Input value={exp.location ?? ""} onChange={(e) => update(i, { location: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!exp.current} onChange={(e) => update(i, { current: e.target.checked, to: e.target.checked ? undefined : exp.to })} />
            I currently work here
          </label>
          <Textarea value={exp.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} rows={2} placeholder="Key responsibilities and achievements" />
        </div>
      ))}
    </div>
  );
}

function InternshipList({
  internships,
  onChange,
}: {
  internships: InternshipEntry[];
  onChange: (next: InternshipEntry[]) => void;
}) {
  const update = (i: number, patch: Partial<InternshipEntry>) => {
    const next = [...internships];
    next[i] = { ...next[i]!, ...patch };
    onChange(next);
  };

  if (internships.length === 0) {
    return <EmptySectionHint text="No internships added yet." />;
  }

  return (
    <div className="space-y-4">
      {internships.map((item, i) => (
        <div key={item.id} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Internship {i + 1}</p>
            <EntryActions onRemove={() => onChange(internships.filter((x) => x.id !== item.id))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label>Role</Label><Input value={item.title} onChange={(e) => update(i, { title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Company</Label><Input value={item.company} onChange={(e) => update(i, { company: e.target.value })} /></div>
            <div className="space-y-2"><Label>Start</Label><Input value={item.from} onChange={(e) => update(i, { from: e.target.value })} /></div>
            <div className="space-y-2"><Label>End</Label><Input value={item.to ?? ""} disabled={item.current} onChange={(e) => update(i, { to: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!item.current} onChange={(e) => update(i, { current: e.target.checked, to: e.target.checked ? undefined : item.to })} />
            Currently interning here
          </label>
          <Textarea value={item.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} rows={2} />
        </div>
      ))}
    </div>
  );
}

export function ProfileWorkSection({
  experience,
  internships,
  onChange,
}: {
  experience: ExperienceEntry[];
  internships: InternshipEntry[];
  onChange: (patch: { experience?: ExperienceEntry[]; internships?: InternshipEntry[] }) => void;
}) {
  return (
    <ProfileSectionCard title="Experience & internships" description="Full-time roles and internship history in one place.">
      <ProfileSubsection
        title="Work experience"
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ experience: [...experience, { id: createProfileId("exp"), title: "", organization: "", from: "", current: false }] })}>
            <Plus className="size-4 mr-1" /> Add
          </Button>
        }
      >
        <WorkExperienceList experience={experience} onChange={(next) => onChange({ experience: next })} />
      </ProfileSubsection>

      <div className="border-t border-border" />

      <ProfileSubsection
        title="Internships"
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ internships: [...internships, { id: createProfileId("int"), title: "", company: "", from: "", current: false }] })}>
            <Plus className="size-4 mr-1" /> Add
          </Button>
        }
      >
        <InternshipList internships={internships} onChange={(next) => onChange({ internships: next })} />
      </ProfileSubsection>
    </ProfileSectionCard>
  );
}

export function ProfileEducationSection({
  qualifications,
  onChange,
}: {
  qualifications: QualificationEntry[];
  onChange: (next: QualificationEntry[]) => void;
}) {
  const update = (i: number, patch: Partial<QualificationEntry>) => {
    const next = [...qualifications];
    next[i] = { ...next[i]!, ...patch };
    onChange(next);
  };

  return (
    <ProfileSectionCard
      title="Education"
      description="Schooling, degrees, and diplomas."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...qualifications, { id: createProfileId("edu"), educationLevel: "bachelors", degree: "", field: "", institution: "", year: "", pursuing: false }])}
        >
          <Plus className="size-4 mr-1" /> Add
        </Button>
      }
    >
      {qualifications.length === 0 ? (
        <EmptySectionHint text="Add 10th, 12th, diploma, or degree details." />
      ) : (
        <div className="space-y-4">
          {qualifications.map((q, i) => (
            <div key={q.id} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">Education {i + 1}</p>
                <EntryActions onRemove={() => onChange(qualifications.filter((x) => x.id !== q.id))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Level</Label>
                  <Select value={q.educationLevel} onValueChange={(v) => update(i, { educationLevel: v as QualificationEntry["educationLevel"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVEL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Degree / course</Label><Input value={q.degree} onChange={(e) => update(i, { degree: e.target.value })} /></div>
                <div className="space-y-2"><Label>Field of study</Label><Input value={q.field} onChange={(e) => update(i, { field: e.target.value })} /></div>
                <div className="space-y-2"><Label>Institution</Label><Input value={q.institution} onChange={(e) => update(i, { institution: e.target.value })} /></div>
                <div className="space-y-2"><Label>Year</Label><Input value={q.year} onChange={(e) => update(i, { year: e.target.value })} /></div>
                <div className="space-y-2"><Label>Grade / CGPA</Label><Input value={q.grade ?? ""} onChange={(e) => update(i, { grade: e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!q.pursuing} onChange={(e) => update(i, { pursuing: e.target.checked })} />
                Currently pursuing
              </label>
            </div>
          ))}
        </div>
      )}
    </ProfileSectionCard>
  );
}

export function ProfileCertificationsAchievementsSection({
  certifications,
  achievements,
  onChange,
}: {
  certifications: CertificationEntry[];
  achievements: AchievementEntry[];
  onChange: (patch: { certifications?: CertificationEntry[]; achievements?: AchievementEntry[] }) => void;
}) {
  const updateCert = (i: number, patch: Partial<CertificationEntry>) => {
    const next = [...certifications];
    next[i] = { ...next[i]!, ...patch };
    onChange({ certifications: next });
  };

  const updateAch = (i: number, patch: Partial<AchievementEntry>) => {
    const next = [...achievements];
    next[i] = { ...next[i]!, ...patch };
    onChange({ achievements: next });
  };

  return (
    <ProfileSectionCard title="Certificates & achievements" description="Licenses, credentials, awards, and notable accomplishments.">
      <ProfileSubsection
        title="Certifications"
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ certifications: [...certifications, { id: createProfileId("cert"), name: "", issuer: "", year: "" }] })}>
            <Plus className="size-4 mr-1" /> Add
          </Button>
        }
      >
        {certifications.length === 0 ? (
          <EmptySectionHint text="Add professional certificates or licenses." />
        ) : (
          <div className="space-y-4">
            {certifications.map((c, i) => (
              <div key={c.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Certificate {i + 1}</p>
                  <EntryActions onRemove={() => onChange({ certifications: certifications.filter((x) => x.id !== c.id) })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Name</Label><Input value={c.name} onChange={(e) => updateCert(i, { name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Issuer</Label><Input value={c.issuer} onChange={(e) => updateCert(i, { issuer: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Year</Label><Input value={c.year} onChange={(e) => updateCert(i, { year: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Credential ID</Label><Input value={c.credentialId ?? ""} onChange={(e) => updateCert(i, { credentialId: e.target.value })} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>URL</Label><Input value={c.url ?? ""} onChange={(e) => updateCert(i, { url: e.target.value })} placeholder="https://..." /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSubsection>

      <div className="border-t border-border" />

      <ProfileSubsection
        title="Achievements"
        action={
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ achievements: [...achievements, { id: createProfileId("ach"), title: "", year: "" }] })}>
            <Plus className="size-4 mr-1" /> Add
          </Button>
        }
      >
        {achievements.length === 0 ? (
          <EmptySectionHint text="Add awards, recognitions, or key results." />
        ) : (
          <div className="space-y-4">
            {achievements.map((a, i) => (
              <div key={a.id} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Achievement {i + 1}</p>
                  <EntryActions onRemove={() => onChange({ achievements: achievements.filter((x) => x.id !== a.id) })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Title</Label><Input value={a.title} onChange={(e) => updateAch(i, { title: e.target.value })} placeholder="Employee of the Year" /></div>
                  <div className="space-y-2"><Label>Year</Label><Input value={a.year ?? ""} onChange={(e) => updateAch(i, { year: e.target.value })} /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Description</Label><Textarea value={a.description ?? ""} onChange={(e) => updateAch(i, { description: e.target.value })} rows={2} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ProfileSubsection>
    </ProfileSectionCard>
  );
}

export function ProfileSkillsLanguagesSection({
  skills,
  softSkills,
  languageSkills,
  onChange,
}: {
  skills: string[];
  softSkills: string[];
  languageSkills: LanguageEntry[];
  onChange: (patch: { skills?: string[]; softSkills?: string[]; languageSkills?: LanguageEntry[] }) => void;
}) {
  const updateLang = (i: number, patch: Partial<LanguageEntry>) => {
    const next = [...languageSkills];
    next[i] = { ...next[i]!, ...patch };
    onChange({ languageSkills: next });
  };

  return (
    <ProfileSectionCard title="Skills & languages" description="Technical skills, soft skills, and language proficiency.">
      <TagInput label="Technical skills" value={skills} onChange={(next) => onChange({ skills: next })} placeholder="e.g. Python, Tally, Curriculum design" />
      <TagInput label="Soft skills" value={softSkills} onChange={(next) => onChange({ softSkills: next })} placeholder="e.g. Communication, Leadership" suggestions={SOFT_SKILL_SUGGESTIONS} />

      <div className="border-t border-border pt-4">
        <ProfileSubsection
          title="Languages"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ languageSkills: [...languageSkills, { id: createProfileId("lang"), language: "", proficiency: "conversational" }] })}>
              <Plus className="size-4 mr-1" /> Add
            </Button>
          }
        >
          {languageSkills.length === 0 ? (
            <EmptySectionHint text="Add languages and proficiency levels." />
          ) : (
            <div className="space-y-3">
              {languageSkills.map((lang, i) => (
                <div key={lang.id} className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[140px] space-y-2">
                    <Label>Language</Label>
                    <Input value={lang.language} onChange={(e) => updateLang(i, { language: e.target.value })} />
                  </div>
                  <div className="flex-1 min-w-[160px] space-y-2">
                    <Label>Proficiency</Label>
                    <Select value={lang.proficiency} onValueChange={(v) => updateLang(i, { proficiency: v as LanguageEntry["proficiency"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LANGUAGE_PROFICIENCY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <EntryActions onRemove={() => onChange({ languageSkills: languageSkills.filter((x) => x.id !== lang.id) })} />
                </div>
              ))}
            </div>
          )}
        </ProfileSubsection>
      </div>
    </ProfileSectionCard>
  );
}

export function ProfileResumeLinksSection({
  profile,
  onChange,
}: {
  profile: CandidateProfile;
  onChange: (patch: Partial<CandidateProfile>) => void;
}) {
  const uploadResume = async (file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file, 5);
      onChange({ resumeDataUrl: dataUrl, resumeFileName: file.name });
      toast.success("Resume uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const updateLink = (i: number, patch: Partial<ProfileLinkEntry>) => {
    const next = [...profile.profileLinks];
    next[i] = { ...next[i]!, ...patch };
    onChange({ profileLinks: next });
  };

  return (
    <ProfileSectionCard title="Resume & links" description="Upload your resume and add portfolio or social profile links.">
      <DocumentUploadCard
        label="Resume (PDF recommended)"
        fileName={profile.resumeFileName}
        status={profile.resumeFileName ? "uploaded" : undefined}
        onUpload={(file) => void uploadResume(file)}
      />

      <div className="border-t border-border pt-4">
        <ProfileSubsection
          title="Profile links"
          action={
            <Button type="button" variant="outline" size="sm" onClick={() => onChange({ profileLinks: [...profile.profileLinks, { id: createProfileId("link"), label: "", url: "" }] })}>
              <Plus className="size-4 mr-1" /> Add link
            </Button>
          }
        >
          {profile.profileLinks.length === 0 ? (
            <EmptySectionHint text="Add LinkedIn, GitHub, portfolio, or other profile URLs." />
          ) : (
            <div className="space-y-3">
              {profile.profileLinks.map((link, i) => (
                <div key={link.id} className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[120px] space-y-2">
                    <Label>Link name</Label>
                    <Input value={link.label} onChange={(e) => updateLink(i, { label: e.target.value })} placeholder="LinkedIn" />
                  </div>
                  <div className="flex-[2] min-w-[200px] space-y-2">
                    <Label>URL</Label>
                    <Input value={link.url} onChange={(e) => updateLink(i, { url: e.target.value })} placeholder="https://linkedin.com/in/you" />
                  </div>
                  <EntryActions onRemove={() => onChange({ profileLinks: profile.profileLinks.filter((x) => x.id !== link.id) })} />
                </div>
              ))}
            </div>
          )}
        </ProfileSubsection>
      </div>

      <p className="text-xs text-muted-foreground">
        Additional documents are available in the{" "}
        <Link to="/careers/documents" className="text-primary hover:underline">document center</Link>.
      </p>
    </ProfileSectionCard>
  );
}
