import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  TextInput,
  TextArea,
  FormStack,
} from "@lumenx/ui-admin";
import { DemoProfileBanner } from "@/components/DemoProfileSwitcher";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { normalizeInstituteProfile } from "@/lib/institute-profile-store";
import type {
  DemoInstituteCustomSection,
  DemoInstituteProfile,
  DemoInstituteSectionEntry,
} from "@lumenx/types";
import {
  Save,
  CheckCircle2,
  Pencil,
  X,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef, type ReactNode, type ChangeEvent } from "react";

export const Route = createFileRoute("/institute")({
  head: () => ({ meta: [{ title: "Institute Profile — LumenX Admin" }] }),
  component: InstitutePage,
});

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function newCustomSection(): DemoInstituteCustomSection {
  return { id: newId("section"), title: "", entries: [] };
}

function newSectionEntry(): DemoInstituteSectionEntry {
  return { id: newId("entry"), heading: "", subheading: "", fields: [] };
}

function InstitutePage() {
  const { instituteProfile, profileId, profile, saveInstituteProfile } = useDemoProfile();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<DemoInstituteProfile>(() =>
    normalizeInstituteProfile(instituteProfile),
  );
  const [saved, setSaved] = useState(false);
  const customSectionsEndRef = useRef<HTMLDivElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setForm(normalizeInstituteProfile(instituteProfile));
    setEditing(false);
  }, [instituteProfile, profileId]);

  const startEdit = useCallback(() => {
    setForm(normalizeInstituteProfile(instituteProfile));
    setEditing(true);
  }, [instituteProfile]);

  const cancelEdit = useCallback(() => {
    setForm(normalizeInstituteProfile(instituteProfile));
    setEditing(false);
  }, [instituteProfile]);

  const handleSave = useCallback(() => {
    const cleaned = {
      ...form,
      customFields: form.customFields
        .map((section) => ({
          ...section,
          title: section.title.trim(),
          entries: section.entries
            .map((entry) => ({
              ...entry,
              heading: entry.heading.trim(),
              subheading: entry.subheading.trim(),
              fields: entry.fields
                .map((field) => ({
                  ...field,
                  label: field.label.trim(),
                  value: field.value.trim(),
                }))
                .filter((field) => field.label.length > 0),
            }))
            .filter(
              (entry) =>
                entry.heading.length > 0 ||
                entry.subheading.length > 0 ||
                entry.fields.length > 0,
            ),
        }))
        .filter((section) => section.title.length > 0),
    };
    saveInstituteProfile(cleaned);
    setForm(cleaned);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [form, saveInstituteProfile]);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) => {
    requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const addCustomSection = () => {
    setForm((prev) => ({
      ...prev,
      customFields: [...prev.customFields, newCustomSection()],
    }));
    scrollTo(customSectionsEndRef);
  };

  const updateCustomSectionTitle = (sectionId: string, title: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((s) =>
        s.id === sectionId ? { ...s, title } : s,
      ),
    }));
  };

  const removeCustomSection = (sectionId: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((s) => s.id !== sectionId),
    }));
  };

  const addSectionEntry = (sectionId: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((s) =>
        s.id === sectionId
          ? { ...s, entries: [...s.entries, newSectionEntry()] }
          : s,
      ),
    }));
  };

  const updateSectionEntry = (
    sectionId: string,
    entryId: string,
    patch: Partial<Pick<DemoInstituteSectionEntry, "heading" | "subheading">>,
  ) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              entries: s.entries.map((e) =>
                e.id === entryId ? { ...e, ...patch } : e,
              ),
            }
          : s,
      ),
    }));
  };

  const removeSectionEntry = (sectionId: string, entryId: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((s) =>
        s.id === sectionId
          ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
          : s,
      ),
    }));
  };

  const addEntryField = (sectionId: string, entryId: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              entries: s.entries.map((e) =>
                e.id === entryId
                  ? {
                      ...e,
                      fields: [
                        ...e.fields,
                        { id: newId("field"), label: "", value: "" },
                      ],
                    }
                  : e,
              ),
            }
          : s,
      ),
    }));
  };

  const updateEntryField = (
    sectionId: string,
    entryId: string,
    fieldId: string,
    patch: Partial<{ label: string; value: string }>,
  ) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              entries: s.entries.map((e) =>
                e.id === entryId
                  ? {
                      ...e,
                      fields: e.fields.map((f) =>
                        f.id === fieldId ? { ...f, ...patch } : f,
                      ),
                    }
                  : e,
              ),
            }
          : s,
      ),
    }));
  };

  const removeEntryField = (sectionId: string, entryId: string, fieldId: string) => {
    setForm((prev) => ({
      ...prev,
      customFields: prev.customFields.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              entries: s.entries.map((e) =>
                e.id === entryId
                  ? { ...e, fields: e.fields.filter((f) => f.id !== fieldId) }
                  : e,
              ),
            }
          : s,
      ),
    }));
  };

  const addHistory = () => {
    setForm((prev) => ({
      ...prev,
      history: [...prev.history, { year: "", event: "" }],
    }));
    scrollTo(historyEndRef);
  };

  const updateHistory = (index: number, patch: Partial<{ year: string; event: string }>) => {
    setForm((prev) => ({
      ...prev,
      history: prev.history.map((h, i) => (i === index ? { ...h, ...patch } : h)),
    }));
  };

  const removeHistory = (index: number) => {
    setForm((prev) => ({
      ...prev,
      history: prev.history.filter((_, i) => i !== index),
    }));
  };

  const addAward = () => {
    setForm((prev) => ({
      ...prev,
      awards: [...prev.awards, { title: "", year: "", body: "" }],
    }));
  };

  const updateAward = (
    index: number,
    patch: Partial<{ title: string; year: string; body: string }>,
  ) => {
    setForm((prev) => ({
      ...prev,
      awards: prev.awards.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  };

  const removeAward = (index: number) => {
    setForm((prev) => ({
      ...prev,
      awards: prev.awards.filter((_, i) => i !== index),
    }));
  };

  const addAchievement = () => {
    setForm((prev) => ({
      ...prev,
      achievements: [...prev.achievements, ""],
    }));
  };

  const updateAchievement = (index: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      achievements: prev.achievements.map((a, i) => (i === index ? value : a)),
    }));
  };

  const removeAchievement = (index: number) => {
    setForm((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  const display = editing ? form : normalizeInstituteProfile(instituteProfile);

  return (
    <AppShell
      title="Institute Profile"
      subtitle={`${profile.label} · Connect login, verify pages, and certificates`}
      actions={
        editing ? (
          <>
            <Button onClick={cancelEdit}>
              <X className="size-3.5" /> Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              <Save className="size-3.5" /> Save profile
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={startEdit}>
            <Pencil className="size-3.5" /> Edit profile
          </Button>
        )
      }
    >
      <DemoProfileBanner />
      {saved && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-success/30 bg-success/10 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="size-3.5" /> Profile saved successfully
        </div>
      )}

      {editing && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Edit any section below. Use <span className="font-medium text-foreground">Add section</span> to
            create a block like History — with a title, entries, headings, sub-headings, and fields.
          </p>
          <Button size="sm" onClick={addCustomSection}>
            <Plus className="size-3" /> Add section
          </Button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader title="Institute information" />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {editing ? (
                <>
                  <Field label="Institute name" required>
                    <TextInput
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </Field>
                  <Field label="Founded">
                    <TextInput
                      value={form.founded}
                      onChange={(e) => setForm({ ...form, founded: e.target.value })}
                    />
                  </Field>
                  <Field label="Founder">
                    <TextInput
                      value={form.founder}
                      onChange={(e) => setForm({ ...form, founder: e.target.value })}
                    />
                  </Field>
                  <Field label="Principal">
                    <TextInput
                      value={form.principal}
                      onChange={(e) => setForm({ ...form, principal: e.target.value })}
                    />
                  </Field>
                  <Field label="Ranking" className="sm:col-span-2">
                    <TextInput
                      value={form.ranking}
                      onChange={(e) => setForm({ ...form, ranking: e.target.value })}
                    />
                  </Field>
                  <Field label="Vision" className="sm:col-span-2">
                    <TextArea
                      rows={3}
                      value={form.vision}
                      onChange={(e) => setForm({ ...form, vision: e.target.value })}
                    />
                  </Field>
                  <Field label="Mission" className="sm:col-span-2">
                    <TextArea
                      rows={3}
                      value={form.mission}
                      onChange={(e) => setForm({ ...form, mission: e.target.value })}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <InfoRow label="Institute name" value={display.name} />
                  <InfoRow label="Founded" value={display.founded} />
                  <InfoRow label="Founder" value={display.founder} />
                  <InfoRow label="Principal" value={display.principal} />
                  <InfoRow label="Ranking" value={display.ranking} className="sm:col-span-2" />
                  <InfoRow label="Vision" value={display.vision} className="sm:col-span-2" multiline />
                  <InfoRow label="Mission" value={display.mission} className="sm:col-span-2" multiline />
                </>
              )}
            </div>
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Branding & contact" />
          <CardBody>
            <FormStack>
              <InstituteProfilePhoto
                name={display.name}
                logoLabel={display.logo}
                photoUrl={display.profilePhoto}
                editing={editing}
                onPhotoChange={(url) => setForm({ ...form, profilePhoto: url })}
                onPhotoRemove={() => setForm({ ...form, profilePhoto: "" })}
              />
              {editing ? (
                <>
                  <Field label="Logo label">
                    <TextInput
                      value={form.logo}
                      onChange={(e) => setForm({ ...form, logo: e.target.value })}
                      placeholder="e.g. LumenX crest"
                    />
                  </Field>
                  <Field label="Phone">
                    <TextInput
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </Field>
                  <Field label="Address">
                    <TextArea
                      rows={3}
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <InfoRow label="Logo" value={display.logo} />
                  <InfoRow label="Phone" value={display.phone} />
                  <InfoRow label="Email" value={display.email} />
                  <InfoRow label="Address" value={display.address} multiline />
                </>
              )}
            </FormStack>
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader
            title="History"
            hint={editing ? "Add milestones with year and description" : undefined}
            action={
              editing ? (
                <Button size="sm" onClick={addHistory}>
                  <Plus className="size-3" /> Add entry
                </Button>
              ) : undefined
            }
          />
          <CardBody>
            {editing ? (
              <FormStack>
                {form.history.length === 0 && (
                  <EmptyEditHint text="No history entries yet. Click Add entry to record a milestone." />
                )}
                {form.history.map((h, i) => (
                  <EditEntryCard
                    key={`history-${i}`}
                    title={`Entry ${i + 1}`}
                    onRemove={() => removeHistory(i)}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] gap-4">
                      <Field label="Year">
                        <TextInput
                          value={h.year}
                          placeholder="1987"
                          onChange={(e) => updateHistory(i, { year: e.target.value })}
                        />
                      </Field>
                      <Field label="Event">
                        <TextInput
                          value={h.event}
                          placeholder="Describe what happened"
                          onChange={(e) => updateHistory(i, { event: e.target.value })}
                        />
                      </Field>
                    </div>
                  </EditEntryCard>
                ))}
                <div ref={historyEndRef} aria-hidden className="h-px" />
              </FormStack>
            ) : display.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history entries yet.</p>
            ) : (
              <div className="space-y-4">
                {display.history.map((h) => (
                  <div
                    key={`${h.year}-${h.event}`}
                    className="flex gap-4 text-sm border-b border-border/60 pb-4 last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-sm font-semibold text-primary shrink-0 w-14">
                      {h.year}
                    </span>
                    <span className="text-foreground leading-relaxed">{h.event}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader
            title="Awards & achievements"
            action={
              editing ? (
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" onClick={addAward}>
                    <Plus className="size-3" /> Award
                  </Button>
                  <Button size="sm" onClick={addAchievement}>
                    <Plus className="size-3" /> Achievement
                  </Button>
                </div>
              ) : undefined
            }
          />
          <CardBody>
            <FormStack>
              <div>
                <SubsectionTitle>Awards</SubsectionTitle>
                {editing ? (
                  <FormStack>
                    {form.awards.length === 0 && (
                      <EmptyEditHint text="No awards yet. Click Award to add one." />
                    )}
                    {form.awards.map((a, i) => (
                      <EditEntryCard
                        key={`award-${i}`}
                        title={a.title.trim() || `Award ${i + 1}`}
                        onRemove={() => removeAward(i)}
                      >
                        <Field label="Award title">
                          <TextInput
                            value={a.title}
                            placeholder="Excellence in STEM Education"
                            onChange={(e) => updateAward(i, { title: e.target.value })}
                          />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-[6.5rem_minmax(0,1fr)] gap-4">
                          <Field label="Year">
                            <TextInput
                              value={a.year}
                              placeholder="2024"
                              onChange={(e) => updateAward(i, { year: e.target.value })}
                            />
                          </Field>
                          <Field label="Awarding body">
                            <TextInput
                              value={a.body}
                              placeholder="National Education Council"
                              onChange={(e) => updateAward(i, { body: e.target.value })}
                            />
                          </Field>
                        </div>
                      </EditEntryCard>
                    ))}
                  </FormStack>
                ) : display.awards.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No awards listed.</p>
                ) : (
                  <div className="space-y-3">
                    {display.awards.map((a) => (
                      <div key={`${a.title}-${a.year}`} className="text-sm">
                        <div className="font-medium text-foreground">{a.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {a.year} · {a.body}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <SubsectionTitle>Achievements</SubsectionTitle>
                {editing ? (
                  <FormStack>
                    {form.achievements.length === 0 && (
                      <EmptyEditHint text="No achievements yet. Click Achievement to add one." />
                    )}
                    {form.achievements.map((a, i) => (
                      <div key={`ach-${i}`} className="flex gap-2 items-end">
                        <Field label={`Achievement ${i + 1}`} className="flex-1 min-w-0">
                          <TextInput
                            value={a}
                            placeholder="e.g. 100% board pass rate · Class 12 · 2025"
                            onChange={(e) => updateAchievement(i, e.target.value)}
                          />
                        </Field>
                        <RemoveButton onClick={() => removeAchievement(i)} label="Remove achievement" />
                      </div>
                    ))}
                  </FormStack>
                ) : display.achievements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No achievements listed.</p>
                ) : (
                  <ul className="text-sm text-foreground space-y-2 list-disc pl-5 leading-relaxed">
                    {display.achievements.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </FormStack>
          </CardBody>
        </Card>

        {(editing ? form.customFields : display.customFields).map((section) => (
          <CustomSectionCard
            key={section.id}
            section={section}
            editing={editing}
            onUpdateTitle={(title) => updateCustomSectionTitle(section.id, title)}
            onRemoveSection={() => removeCustomSection(section.id)}
            onAddEntry={() => addSectionEntry(section.id)}
            onUpdateEntry={(entryId, patch) =>
              updateSectionEntry(section.id, entryId, patch)
            }
            onRemoveEntry={(entryId) => removeSectionEntry(section.id, entryId)}
            onAddField={(entryId) => addEntryField(section.id, entryId)}
            onUpdateField={(entryId, fieldId, patch) =>
              updateEntryField(section.id, entryId, fieldId, patch)
            }
            onRemoveField={(entryId, fieldId) =>
              removeEntryField(section.id, entryId, fieldId)
            }
          />
        ))}

        <div ref={customSectionsEndRef} aria-hidden className="col-span-12 h-px" />
      </div>
    </AppShell>
  );
}

function CustomSectionCard({
  section,
  editing,
  onUpdateTitle,
  onRemoveSection,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
  onAddField,
  onUpdateField,
  onRemoveField,
}: {
  section: DemoInstituteCustomSection;
  editing: boolean;
  onUpdateTitle: (title: string) => void;
  onRemoveSection: () => void;
  onAddEntry: () => void;
  onUpdateEntry: (
    entryId: string,
    patch: Partial<Pick<DemoInstituteSectionEntry, "heading" | "subheading">>,
  ) => void;
  onRemoveEntry: (entryId: string) => void;
  onAddField: (entryId: string) => void;
  onUpdateField: (
    entryId: string,
    fieldId: string,
    patch: Partial<{ label: string; value: string }>,
  ) => void;
  onRemoveField: (entryId: string, fieldId: string) => void;
}) {
  return (
    <Card className="col-span-12 lg:col-span-6">
      <CardHeader
        title={section.title.trim() || "New section"}
        hint={editing ? "Section title, then add entries with headings and fields" : undefined}
        action={
          editing ? (
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" onClick={onAddEntry}>
                <Plus className="size-3" /> Add entry
              </Button>
              <RemoveButton
                onClick={onRemoveSection}
                label={`Remove ${section.title.trim() || "section"}`}
              />
            </div>
          ) : undefined
        }
      />
      <CardBody>
        {editing && (
          <div className="mb-4">
            <Field label="Section title">
              <TextInput
                value={section.title}
                onChange={(e) => onUpdateTitle(e.target.value)}
                placeholder="e.g. Accreditation, Infrastructure"
              />
            </Field>
          </div>
        )}

        {editing ? (
          <FormStack>
            {section.entries.length === 0 && (
              <EmptyEditHint text="No entries yet. Click Add entry — each entry can have a heading, sub-heading, and multiple fields." />
            )}
            {section.entries.map((entry, index) => (
              <EditEntryCard
                key={entry.id}
                title={entry.heading.trim() || `Entry ${index + 1}`}
                onRemove={() => onRemoveEntry(entry.id)}
              >
                <Field label="Heading">
                  <TextInput
                    value={entry.heading}
                    placeholder="Main heading"
                    onChange={(e) => onUpdateEntry(entry.id, { heading: e.target.value })}
                  />
                </Field>
                <Field label="Sub-heading">
                  <TextInput
                    value={entry.subheading}
                    placeholder="Optional sub-heading or short note"
                    onChange={(e) => onUpdateEntry(entry.id, { subheading: e.target.value })}
                  />
                </Field>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <SubsectionTitle className="mb-0">Fields</SubsectionTitle>
                    <Button size="sm" onClick={() => onAddField(entry.id)}>
                      <Plus className="size-3" /> Add field
                    </Button>
                  </div>
                  {entry.fields.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Add label/value pairs — e.g. Grade · A++, Valid until · 2028
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {entry.fields.map((field) => (
                        <div
                          key={field.id}
                          className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-3 items-end"
                        >
                          <Field label="Field label">
                            <TextInput
                              value={field.label}
                              placeholder="e.g. Grade"
                              onChange={(e) =>
                                onUpdateField(entry.id, field.id, { label: e.target.value })
                              }
                            />
                          </Field>
                          <Field label="Value">
                            <TextInput
                              value={field.value}
                              placeholder="e.g. A++"
                              onChange={(e) =>
                                onUpdateField(entry.id, field.id, { value: e.target.value })
                              }
                            />
                          </Field>
                          <RemoveButton
                            onClick={() => onRemoveField(entry.id, field.id)}
                            label="Remove field"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </EditEntryCard>
            ))}
          </FormStack>
        ) : section.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries in this section.</p>
        ) : (
          <div className="space-y-5">
            {section.entries.map((entry) => (
              <div
                key={entry.id}
                className="border-b border-border/60 pb-5 last:border-0 last:pb-0"
              >
                {entry.heading && (
                  <h4 className="text-sm font-semibold text-foreground">{entry.heading}</h4>
                )}
                {entry.subheading && (
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {entry.subheading}
                  </p>
                )}
                {entry.fields.length > 0 && (
                  <div
                    className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${entry.heading || entry.subheading ? "mt-3" : ""}`}
                  >
                    {entry.fields.map((field) => (
                      <InfoRow key={field.id} label={field.label} value={field.value} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function instituteInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IN";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function InstituteProfilePhoto({
  name,
  logoLabel,
  photoUrl,
  editing,
  onPhotoChange,
  onPhotoRemove,
}: {
  name: string;
  logoLabel: string;
  photoUrl: string;
  editing: boolean;
  onPhotoChange: (dataUrl: string) => void;
  onPhotoRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onPhotoChange(reader.result);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-3 pb-1">
      <div className="relative size-32 rounded-2xl border-2 border-border bg-muted/20 overflow-hidden shadow-elevated">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${name} institute logo`}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-muted text-primary px-3">
            <span className="text-3xl font-bold tracking-tight">{instituteInitials(name)}</span>
            {logoLabel ? (
              <span className="text-[10px] text-muted-foreground mt-2 text-center line-clamp-2 leading-snug">
                {logoLabel}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="text-center min-w-0 max-w-full">
        <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        {logoLabel ? (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{logoLabel}</p>
        ) : null}
      </div>

      {editing ? (
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-3" /> {photoUrl ? "Change photo" : "Upload photo"}
          </Button>
          {photoUrl ? (
            <Button size="sm" onClick={onPhotoRemove}>
              <Trash2 className="size-3" /> Remove
            </Button>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      ) : null}
    </div>
  );
}

function SubsectionTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h4 className={`text-xs font-semibold uppercase tracking-wide text-foreground mb-3 ${className}`.trim()}>
      {children}
    </h4>
  );
}

function EmptyEditHint({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border px-4 py-3 leading-relaxed">
      {text}
    </p>
  );
}

function EditEntryCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        <RemoveButton onClick={onRemove} label={`Remove ${title}`} />
      </div>
      {children}
    </div>
  );
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="size-10 shrink-0 rounded-lg border border-border hover:bg-destructive/10 hover:border-destructive/30 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
      aria-label={label}
    >
      <Trash2 className="size-4" />
    </button>
  );
}

function InfoRow({
  label,
  value,
  className = "",
  multiline = false,
}: {
  label: string;
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={className}>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className={`text-sm text-foreground ${multiline ? "leading-relaxed" : "leading-snug"}`}>
        {value || "—"}
      </div>
    </div>
  );
}
