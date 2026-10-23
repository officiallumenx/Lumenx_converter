import { useMemo, useState } from "react";
import { Button, Field, SearchInput, Select } from "@lumenx/ui-admin";
import { X } from "lucide-react";
import type { MessageRecipientDto } from "@/lib/messages";
import {
  filterRecipients,
  removeRecipient,
  resolveClassSectionAudience,
  resolvedRecipientCount,
  selectAllFiltered,
  toggleRecipientSelection,
  uniqueClassLabels,
  uniqueSectionLabels,
  type RecipientAudienceType,
} from "@/lib/messages/recipient-targeting";

function roleLabel(role: MessageRecipientDto["role"]): string {
  switch (role) {
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    case "parent":
      return "Parent";
    case "staff":
      return "Staff";
  }
}

function recipientChipLabel(r: MessageRecipientDto): string {
  const cls = r.classLabel?.trim();
  const sec = r.sectionLabel?.trim();
  const cs =
    r.role === "student" && (cls || sec)
      ? ` · ${cls ?? ""}${cls && sec ? "-" : ""}${sec ?? ""}`
      : "";
  return `${r.displayName} · ${roleLabel(r.role)}${cs}`;
}

type ClassSectionKey = string; // `${class}::${section || *}`

function parseKey(key: ClassSectionKey): {
  classLabel: string;
  sectionLabel: string | null;
} {
  const [cls, sec] = key.split("::");
  return {
    classLabel: (cls ?? "").trim(),
    sectionLabel: !sec || sec === "*" ? null : sec.trim(),
  };
}

function toKey(classLabel: string, sectionLabel?: string | null): ClassSectionKey {
  return `${classLabel.trim()}::${sectionLabel?.trim() || "*"}`;
}

export function MessageRecipientPicker({
  recipients,
  loading,
  selected,
  onChange,
  disabled,
}: {
  recipients: MessageRecipientDto[];
  loading?: boolean;
  selected: MessageRecipientDto[];
  onChange: (next: MessageRecipientDto[]) => void;
  disabled?: boolean;
}) {
  const [audience, setAudience] = useState<RecipientAudienceType>("all");
  const [query, setQuery] = useState("");
  const [classLabel, setClassLabel] = useState("");
  const [sectionLabel, setSectionLabel] = useState("");
  const [classSectionKeys, setClassSectionKeys] = useState<ClassSectionKey[]>([]);
  /** Explicit type when adding from class/section bulk — never silent mix. */
  const [bulkAudience, setBulkAudience] = useState<"student" | "parent">(
    "student",
  );

  const classes = useMemo(() => uniqueClassLabels(recipients), [recipients]);
  const sections = useMemo(
    () => uniqueSectionLabels(recipients, classLabel || null),
    [recipients, classLabel],
  );

  const filtered = useMemo(
    () =>
      filterRecipients({
        recipients,
        query,
        audience,
        classLabel: classLabel || null,
        sectionLabel: sectionLabel || null,
      }),
    [recipients, query, audience, classLabel, sectionLabel],
  );

  const selectedIds = useMemo(
    () => new Set(selected.map((r) => r.userId)),
    [selected],
  );

  const count = resolvedRecipientCount(selected);

  const addClassSections = () => {
    if (classSectionKeys.length === 0) return;
    const resolved = resolveClassSectionAudience({
      recipients,
      selections: classSectionKeys.map(parseKey),
      audience: bulkAudience,
    });
    onChange(selectAllFiltered(selected, resolved));
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Audience type">
          <Select
            value={audience}
            onChange={(e) =>
              setAudience(e.target.value as RecipientAudienceType)
            }
            disabled={disabled}
          >
            <option value="all">All roles</option>
            <option value="teacher">Teachers</option>
            <option value="parent">Parents</option>
            <option value="student">Students</option>
          </Select>
        </Field>
        <Field label="Search">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name…"
            disabled={disabled || loading}
          />
        </Field>
        <Field label="Class filter">
          <Select
            value={classLabel}
            onChange={(e) => {
              setClassLabel(e.target.value);
              setSectionLabel("");
            }}
            disabled={disabled}
          >
            <option value="">Any class</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Section filter">
          <Select
            value={sectionLabel}
            onChange={(e) => setSectionLabel(e.target.value)}
            disabled={disabled || !classLabel}
          >
            <option value="">Any section</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="rounded-lg border border-border p-3 space-y-2">
        <p className="text-xs font-medium text-foreground">
          Class / section targeting
        </p>
        <p className="text-[11px] text-muted-foreground">
          Choose recipient type explicitly, then add one or more classes/sections.
          Overlaps with individual picks are deduplicated by user id.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <Field label="Add as" className="min-w-[8rem]">
            <Select
              value={bulkAudience}
              onChange={(e) =>
                setBulkAudience(e.target.value as "student" | "parent")
              }
              disabled={disabled}
            >
              <option value="student">Students</option>
              <option value="parent">Parents</option>
            </Select>
          </Field>
          <Field label="Class" className="min-w-[6rem]">
            <Select
              value=""
              onChange={(e) => {
                const cls = e.target.value;
                if (!cls) return;
                const key = toKey(cls, null);
                setClassSectionKeys((prev) =>
                  prev.includes(key) ? prev : [...prev, key],
                );
              }}
              disabled={disabled}
            >
              <option value="">Add whole class…</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c} (all sections)
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section" className="min-w-[8rem]">
            <Select
              value=""
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) return;
                const [cls, sec] = raw.split("::");
                if (!cls || !sec) return;
                const key = toKey(cls, sec);
                setClassSectionKeys((prev) =>
                  prev.includes(key) ? prev : [...prev, key],
                );
              }}
              disabled={disabled}
            >
              <option value="">Add class-section…</option>
              {classes.flatMap((c) =>
                uniqueSectionLabels(recipients, c).map((s) => (
                  <option key={`${c}::${s}`} value={`${c}::${s}`}>
                    {c}-{s}
                  </option>
                )),
              )}
            </Select>
          </Field>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || classSectionKeys.length === 0}
            onClick={addClassSections}
          >
            Add to recipients
          </Button>
        </div>
        {classSectionKeys.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {classSectionKeys.map((key) => {
              const { classLabel: c, sectionLabel: s } = parseKey(key);
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px]"
                >
                  {s ? `${c}-${s}` : `${c} (all)`}
                  <button
                    type="button"
                    aria-label={`Remove ${key}`}
                    className="rounded-full p-0.5 hover:bg-background"
                    onClick={() =>
                      setClassSectionKeys((prev) =>
                        prev.filter((k) => k !== key),
                      )
                    }
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {loading
            ? "Loading recipients…"
            : `${filtered.length} matching · ${count} selected`}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || loading || filtered.length === 0}
          onClick={() => onChange(selectAllFiltered(selected, filtered))}
        >
          Select all filtered
        </Button>
      </div>

      <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {loading ? (
          <p className="p-3 text-sm text-muted-foreground">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            No recipients match the current filters.
          </p>
        ) : (
          filtered.map((row) => {
            const checked = selectedIds.has(row.userId);
            return (
              <label
                key={row.userId}
                className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() =>
                    onChange(toggleRecipientSelection(selected, row))
                  }
                />
                <span className="min-w-0 break-words">
                  {recipientChipLabel(row)}
                </span>
              </label>
            );
          })
        )}
      </div>

      {selected.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium">
            Selected recipients ({count})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((row) => (
              <span
                key={row.userId}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[11px]"
              >
                {recipientChipLabel(row)}
                <button
                  type="button"
                  aria-label={`Remove ${row.displayName}`}
                  disabled={disabled}
                  className="rounded-full p-0.5 hover:bg-muted"
                  onClick={() =>
                    onChange(removeRecipient(selected, row.userId))
                  }
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
