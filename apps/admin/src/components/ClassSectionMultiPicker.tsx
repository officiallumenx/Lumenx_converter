import { Button, Modal } from "@lumenx/ui-admin";
import { Check } from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { isCollegeMode } from "@/lib/academic-data";
import {
  getInstituteClassSectionOptions,
  labelsForClassSectionKeys,
  type ClassSectionOption,
} from "@/lib/exam-timetable-data";

/** Multi-select class · section audience (exams, notifications, etc.). */
export function ClassSectionAudienceField({
  scope,
  selectedKeys,
  onScopeChange,
  onSelectedKeysChange,
  required,
  hint,
  options: optionsProp,
}: {
  scope: "all" | "selected";
  selectedKeys: string[];
  onScopeChange: (scope: "all" | "selected") => void;
  onSelectedKeysChange: (keys: string[]) => void;
  required?: boolean;
  hint?: string;
  /** Override institute options (Attendance uses canonical `10::B` keys). */
  options?: ClassSectionOption[];
}) {
  const { profileId } = useDemoProfile();
  const college = isCollegeMode();
  const options = useMemo(
    () => optionsProp ?? getInstituteClassSectionOptions(),
    [profileId, optionsProp],
  );
  const allLabel = college ? "All batches" : "All classes";
  const selectLabel = college ? "Select batches & sections" : "Select classes & sections";

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const openPicker = () => {
    setDraft(selectedKeys.length ? [...selectedKeys] : options.map((o) => o.key));
    setPickerOpen(true);
    onScopeChange("selected");
  };

  const confirm = () => {
    onSelectedKeysChange([...draft]);
    onScopeChange("selected");
    setPickerOpen(false);
  };

  return (
    <>
      <div>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-foreground">
            {college ? "Batches & sections" : "Classes & sections"}
            {required ? <span className="text-destructive"> *</span> : null}
          </span>
        </div>
        {hint ? <p className="mb-2 text-[11px] text-muted-foreground">{hint}</p> : null}
        <div className="mt-1 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onScopeChange("all");
              onSelectedKeysChange([]);
            }}
            className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
              scope === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
            }`}
          >
            {allLabel}
            <div className="mt-0.5 text-[10px] font-normal opacity-80">Entire institute</div>
          </button>
          <button
            type="button"
            onClick={openPicker}
            className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
              scope === "selected"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
            }`}
          >
            {selectLabel}
            <div className="mt-0.5 text-[10px] font-normal opacity-80">
              Pick multiple class · section
            </div>
          </button>
        </div>
        {scope === "selected" && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {selectedKeys.length === 0 ? (
              <span className="text-xs text-destructive">Nothing selected yet</span>
            ) : (
              selectedKeys.map((k) => {
                const label = optionsProp
                  ? (options.find((o) => o.key === k)?.label ?? k.replace("::", " · Sec "))
                  : (labelsForClassSectionKeys([k])[0] ?? k.replace("::", " · Sec "));
                return (
                  <span
                    key={k}
                    className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium"
                  >
                    {label}
                  </span>
                );
              })
            )}
            <Button size="sm" variant="outline" onClick={openPicker}>
              Change
            </Button>
          </div>
        )}
      </div>

      <ClassSectionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={selectLabel}
        options={options}
        draft={draft}
        setDraft={setDraft}
        onConfirm={confirm}
      />
    </>
  );
}

function ClassSectionPickerModal({
  open,
  onClose,
  title,
  options,
  draft,
  setDraft,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  options: ClassSectionOption[];
  draft: string[];
  setDraft: Dispatch<SetStateAction<string[]>>;
  onConfirm: () => void;
}) {
  const byGrade = useMemo(() => {
    const map = new Map<string, ClassSectionOption[]>();
    for (const o of options) {
      const list = map.get(o.grade) ?? [];
      list.push(o);
      map.set(o.grade, list);
    }
    return [...map.entries()];
  }, [options]);

  const draftSet = useMemo(() => new Set(draft), [draft]);

  const toggleGrade = (grade: string, sections: ClassSectionOption[]) => {
    const keys = sections.map((s) => s.key);
    const allOn = keys.every((k) => draftSet.has(k));
    setDraft((prev) =>
      allOn ? prev.filter((k) => !keys.includes(k)) : [...new Set([...prev, ...keys])],
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Tick one or more class · section combinations, then OK"
      size="md"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm} disabled={draft.length === 0}>
            <Check className="size-3.5" /> OK · {draft.length} selected
          </Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setDraft(options.map((o) => o.key))}>
          Select all
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDraft([])}>
          Clear
        </Button>
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-border p-2">
        {options.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No classes found in institute setup.
          </p>
        ) : (
          byGrade.map(([grade, sections]) => {
            const keys = sections.map((s) => s.key);
            const allOn = keys.every((k) => draftSet.has(k));
            const someOn = keys.some((k) => draftSet.has(k));
            return (
              <div key={grade} className="rounded-md border border-border/80">
                <button
                  type="button"
                  onClick={() => toggleGrade(grade, sections)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold ${
                    someOn ? "bg-primary/5 text-foreground" : "bg-muted/30 text-muted-foreground"
                  }`}
                >
                  <span>{grade}</span>
                  <span className="font-normal text-[10px] opacity-80">
                    {allOn ? "All sections" : someOn ? `${keys.filter((k) => draftSet.has(k)).length}/${keys.length}` : "None"}
                  </span>
                </button>
                <div className="divide-y divide-border/60">
                  {sections.map((o) => {
                    const checked = draftSet.has(o.key);
                    return (
                      <label
                        key={o.key}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors ${
                          checked ? "bg-primary/10 text-foreground" : "hover:bg-surface-hover"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setDraft((prev) =>
                              prev.includes(o.key)
                                ? prev.filter((x) => x !== o.key)
                                : [...prev, o.key],
                            )
                          }
                          className="size-4 accent-[var(--primary)]"
                        />
                        <span className="font-medium">Sec {o.section}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}
