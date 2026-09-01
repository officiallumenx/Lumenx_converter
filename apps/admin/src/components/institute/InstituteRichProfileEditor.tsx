import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Button, Input, Label, Textarea } from "@lumenx/ui";
import { ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import type {
  DemoInstituteCustomSection,
  DemoInstituteProfile,
  DemoInstituteSectionEntry,
} from "@lumenx/types";
import { normalizeInstituteProfile } from "@lumenx/utils";

type Props = {
  value: DemoInstituteProfile;
  onChange: (next: DemoInstituteProfile) => void;
};

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function newCustomSection(): DemoInstituteCustomSection {
  return {
    id: newId("section"),
    title: "",
    entries: [newSectionEntry()],
  };
}

function newSectionEntry(): DemoInstituteSectionEntry {
  return { id: newId("entry"), heading: "", year: "", subheading: "", fields: [] };
}

function newSubField() {
  return { id: newId("field"), label: "", value: "" };
}

function instituteInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "IN";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Editable Admin institute profile fields — same model as Admin `/institute`. */
export function AdminInstituteProfileEditor({ value, onChange }: Props) {
  const [form, setForm] = useState(() => normalizeInstituteProfile(value));
  const [focusSectionId, setFocusSectionId] = useState<string | null>(null);

  useEffect(() => {
    setForm(normalizeInstituteProfile(value));
  }, [value]);

  const patch = (partial: Partial<DemoInstituteProfile>) => {
    const next = { ...form, ...partial };
    setForm(next);
    onChange(next);
  };

  const updateCustomFields = (
    updater: (sections: DemoInstituteCustomSection[]) => DemoInstituteCustomSection[],
  ) => {
    patch({ customFields: updater(form.customFields ?? []) });
  };

  const addCustomSection = () => {
    const section = newCustomSection();
    updateCustomFields((sections) => [...sections, section]);
    setFocusSectionId(section.id);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
          Edit any section below. Use <span className="font-medium text-foreground">Add section</span>{" "}
          for a custom heading and fields (matter, optional year, sub fields).
        </p>
        <Button type="button" size="sm" onClick={addCustomSection}>
          <Plus className="size-3.5 mr-1" /> Add section
        </Button>
      </div>

      <Section title="Institute information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Institute name">
            <Input value={form.name} onChange={(e) => patch({ name: e.target.value })} />
          </Field>
          <Field label="Founded">
            <Input value={form.founded} onChange={(e) => patch({ founded: e.target.value })} />
          </Field>
          <Field label="Founder">
            <Input value={form.founder} onChange={(e) => patch({ founder: e.target.value })} />
          </Field>
          <Field label="Principal">
            <Input value={form.principal} onChange={(e) => patch({ principal: e.target.value })} />
          </Field>
          <Field label="Ranking" className="sm:col-span-2">
            <Input value={form.ranking} onChange={(e) => patch({ ranking: e.target.value })} />
          </Field>
          <Field label="Vision" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.vision}
              onChange={(e) => patch({ vision: e.target.value })}
            />
          </Field>
          <Field label="Mission" className="sm:col-span-2">
            <Textarea
              rows={3}
              value={form.mission}
              onChange={(e) => patch({ mission: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      <Section title="Branding & contact">
        <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] items-start">
          <InstituteProfilePhoto
            name={form.name}
            logoLabel={form.logo}
            photoUrl={form.profilePhoto ?? ""}
            onPhotoChange={(url) => patch({ profilePhoto: url })}
            onPhotoRemove={() => patch({ profilePhoto: "" })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Logo label" className="sm:col-span-2">
              <Input
                value={form.logo}
                onChange={(e) => patch({ logo: e.target.value })}
                placeholder="e.g. School crest / short name"
              />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea
                rows={3}
                value={form.address}
                onChange={(e) => patch({ address: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="History"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patch({ history: [...(form.history ?? []), { year: "", event: "" }] })}
          >
            <Plus className="size-3.5 mr-1" /> Add entry
          </Button>
        }
      >
        <div className="space-y-3">
          {(form.history ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No history entries yet.</p>
          )}
          {(form.history ?? []).map((h, i) => (
            <div key={`h-${i}`} className="flex gap-2 items-start">
              <Input
                className="w-24 shrink-0"
                placeholder="Year"
                value={h.year}
                onChange={(e) => {
                  const history = (form.history ?? []).map((row, idx) =>
                    idx === i ? { ...row, year: e.target.value } : row,
                  );
                  patch({ history });
                }}
              />
              <Input
                className="flex-1"
                placeholder="Event"
                value={h.event}
                onChange={(e) => {
                  const history = (form.history ?? []).map((row, idx) =>
                    idx === i ? { ...row, event: e.target.value } : row,
                  );
                  patch({ history });
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove history"
                onClick={() =>
                  patch({ history: (form.history ?? []).filter((_, idx) => idx !== i) })
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Awards"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              patch({
                awards: [...(form.awards ?? []), { title: "", year: "", body: "" }],
              })
            }
          >
            <Plus className="size-3.5 mr-1" /> Award
          </Button>
        }
      >
        <div className="space-y-3">
          {(form.awards ?? []).map((a, i) => (
            <div key={`a-${i}`} className="rounded-xl border border-border p-3 space-y-2">
              <Input
                placeholder="Award title"
                value={a.title}
                onChange={(e) => {
                  const awards = (form.awards ?? []).map((row, idx) =>
                    idx === i ? { ...row, title: e.target.value } : row,
                  );
                  patch({ awards });
                }}
              />
              <div className="flex gap-2">
                <Input
                  className="w-24"
                  placeholder="Year"
                  value={a.year}
                  onChange={(e) => {
                    const awards = (form.awards ?? []).map((row, idx) =>
                      idx === i ? { ...row, year: e.target.value } : row,
                    );
                    patch({ awards });
                  }}
                />
                <Input
                  className="flex-1"
                  placeholder="Awarding body"
                  value={a.body}
                  onChange={(e) => {
                    const awards = (form.awards ?? []).map((row, idx) =>
                      idx === i ? { ...row, body: e.target.value } : row,
                    );
                    patch({ awards });
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remove award"
                  onClick={() =>
                    patch({ awards: (form.awards ?? []).filter((_, idx) => idx !== i) })
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Achievements"
        action={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => patch({ achievements: [...(form.achievements ?? []), ""] })}
          >
            <Plus className="size-3.5 mr-1" /> Achievement
          </Button>
        }
      >
        <div className="space-y-2">
          {(form.achievements ?? []).map((a, i) => (
            <div key={`ach-${i}`} className="flex gap-2">
              <Input
                className="flex-1"
                value={a}
                placeholder="e.g. 100% board pass rate · Class 12 · 2025"
                onChange={(e) => {
                  const achievements = (form.achievements ?? []).map((row, idx) =>
                    idx === i ? e.target.value : row,
                  );
                  patch({ achievements });
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Remove achievement"
                onClick={() =>
                  patch({
                    achievements: (form.achievements ?? []).filter((_, idx) => idx !== i),
                  })
                }
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </Section>

      {(form.customFields ?? []).map((section) => (
        <CustomSectionEditor
          key={section.id}
          section={section}
          autoFocus={focusSectionId === section.id}
          onFocused={() => setFocusSectionId(null)}
          onUpdateTitle={(title) =>
            updateCustomFields((sections) =>
              sections.map((s) => (s.id === section.id ? { ...s, title } : s)),
            )
          }
          onRemoveSection={() =>
            updateCustomFields((sections) => sections.filter((s) => s.id !== section.id))
          }
          onAddField={() =>
            updateCustomFields((sections) =>
              sections.map((s) =>
                s.id === section.id
                  ? { ...s, entries: [...s.entries, newSectionEntry()] }
                  : s,
              ),
            )
          }
          onUpdateField={(entryId, entryPatch) =>
            updateCustomFields((sections) =>
              sections.map((s) =>
                s.id === section.id
                  ? {
                      ...s,
                      entries: s.entries.map((e) =>
                        e.id === entryId ? { ...e, ...entryPatch } : e,
                      ),
                    }
                  : s,
              ),
            )
          }
          onRemoveField={(entryId) =>
            updateCustomFields((sections) =>
              sections.map((s) =>
                s.id === section.id
                  ? { ...s, entries: s.entries.filter((e) => e.id !== entryId) }
                  : s,
              ),
            )
          }
          onAddSubField={(entryId) =>
            updateCustomFields((sections) =>
              sections.map((s) =>
                s.id === section.id
                  ? {
                      ...s,
                      entries: s.entries.map((e) =>
                        e.id === entryId
                          ? { ...e, fields: [...e.fields, newSubField()] }
                          : e,
                      ),
                    }
                  : s,
              ),
            )
          }
          onUpdateSubField={(entryId, fieldId, value) =>
            updateCustomFields((sections) =>
              sections.map((s) =>
                s.id === section.id
                  ? {
                      ...s,
                      entries: s.entries.map((e) =>
                        e.id === entryId
                          ? {
                              ...e,
                              fields: e.fields.map((f) =>
                                f.id === fieldId ? { ...f, value } : f,
                              ),
                            }
                          : e,
                      ),
                    }
                  : s,
              ),
            )
          }
          onRemoveSubField={(entryId, fieldId) =>
            updateCustomFields((sections) =>
              sections.map((s) =>
                s.id === section.id
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
            )
          }
        />
      ))}
    </div>
  );
}

function InstituteProfilePhoto({
  name,
  logoLabel,
  photoUrl,
  onPhotoChange,
  onPhotoRemove,
}: {
  name: string;
  logoLabel: string;
  photoUrl: string;
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
    <div className="flex flex-col items-center gap-3">
      <div className="relative size-32 rounded-2xl border-2 border-border bg-muted/20 overflow-hidden shadow-sm">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={`${name || "Institute"} logo`}
            className="size-full object-cover"
          />
        ) : (
          <div className="size-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/25 via-primary/10 to-muted text-primary px-3">
            <span className="text-3xl font-bold tracking-tight">{instituteInitials(name)}</span>
            {logoLabel ? (
              <span className="text-[10px] text-muted-foreground mt-2 text-center line-clamp-2 leading-snug">
                {logoLabel}
              </span>
            ) : (
              <ImagePlus className="size-5 mt-2 text-muted-foreground/70" />
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="size-3.5 mr-1" /> {photoUrl ? "Change photo" : "Upload photo"}
        </Button>
        {photoUrl ? (
          <Button type="button" size="sm" variant="outline" onClick={onPhotoRemove}>
            <Trash2 className="size-3.5 mr-1" /> Remove
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
      <p className="text-[11px] text-muted-foreground text-center max-w-[14rem]">
        Upload a logo or campus photo (PNG, JPG, WebP)
      </p>
    </div>
  );
}

function CustomSectionEditor({
  section,
  autoFocus = false,
  onFocused,
  onUpdateTitle,
  onRemoveSection,
  onAddField,
  onUpdateField,
  onRemoveField,
  onAddSubField,
  onUpdateSubField,
  onRemoveSubField,
}: {
  section: DemoInstituteCustomSection;
  autoFocus?: boolean;
  onFocused?: () => void;
  onUpdateTitle: (title: string) => void;
  onRemoveSection: () => void;
  onAddField: () => void;
  onUpdateField: (
    entryId: string,
    patch: Partial<Pick<DemoInstituteSectionEntry, "heading" | "year">>,
  ) => void;
  onRemoveField: (entryId: string) => void;
  onAddSubField: (entryId: string) => void;
  onUpdateSubField: (entryId: string, fieldId: string, value: string) => void;
  onRemoveSubField: (entryId: string, fieldId: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const onFocusedRef = useRef(onFocused);
  onFocusedRef.current = onFocused;
  const [yearOpenIds, setYearOpenIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const entry of section.entries) {
      if (entry.year.trim()) initial[entry.id] = true;
    }
    return initial;
  });

  useEffect(() => {
    if (!autoFocus) return;
    const frame = requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleInputRef.current?.focus({ preventScroll: true });
      onFocusedRef.current?.();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoFocus]);

  const showYear = (entryId: string, year: string) =>
    Boolean(yearOpenIds[entryId] || year.trim());

  const enableYear = (entryId: string) => {
    setYearOpenIds((prev) => ({ ...prev, [entryId]: true }));
  };

  const clearYear = (entryId: string) => {
    setYearOpenIds((prev) => {
      const next = { ...prev };
      delete next[entryId];
      return next;
    });
    onUpdateField(entryId, { year: "" });
  };

  return (
    <div ref={rootRef} id={`custom-section-${section.id}`}>
      <Section
        title={section.title.trim() || "New section"}
        action={
          <Button type="button" size="sm" variant="ghost" onClick={onRemoveSection}>
            <Trash2 className="size-3.5 mr-1 text-destructive" /> Remove section
          </Button>
        }
      >
        <Field label="Section heading">
          <Input
            ref={titleInputRef}
            value={section.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            placeholder="e.g. Accreditation, Infrastructure, Transport"
          />
        </Field>

        <div className="space-y-3 pt-2">
          <p className="text-xs font-medium text-muted-foreground">Fields</p>

          {section.entries.map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-xl border border-border bg-muted/10 p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Field label={index === 0 ? "Field" : `Field ${index + 1}`}>
                    <Input
                      value={entry.heading}
                      placeholder="Enter matter — e.g. National Board Accreditation"
                      onChange={(e) => onUpdateField(entry.id, { heading: e.target.value })}
                    />
                  </Field>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="mt-6 shrink-0"
                  aria-label="Remove field"
                  onClick={() => onRemoveField(entry.id)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>

              {showYear(entry.id, entry.year) ? (
                <div className="flex items-end gap-2 max-w-[10rem]">
                  <Field label="Year">
                    <Input
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="YYYY"
                      value={entry.year}
                      onChange={(e) =>
                        onUpdateField(entry.id, {
                          year: e.target.value.replace(/\D/g, "").slice(0, 4),
                        })
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remove year"
                    onClick={() => clearYear(entry.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ) : null}

              {entry.fields.length > 0 ? (
                <div className="space-y-2 pl-0 sm:pl-1">
                  <p className="text-xs text-muted-foreground">Sub fields</p>
                  {entry.fields.map((sub, subIndex) => (
                    <div key={sub.id} className="flex items-center gap-2">
                      <Input
                        className="flex-1"
                        value={sub.value}
                        placeholder={`Sub matter ${subIndex + 1}`}
                        onChange={(e) => onUpdateSubField(entry.id, sub.id, e.target.value)}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Remove sub field"
                        onClick={() => onRemoveSubField(entry.id, sub.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {!showYear(entry.id, entry.year) ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => enableYear(entry.id)}
                  >
                    <Plus className="size-3.5 mr-1" /> Year
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onAddSubField(entry.id)}
                >
                  <Plus className="size-3.5 mr-1" /> Sub field
                </Button>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-1">
            <Button type="button" size="sm" variant="outline" onClick={onAddField}>
              <Plus className="size-3.5 mr-1" /> New field
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <h3 className="text-sm font-semibold sm:text-base">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
