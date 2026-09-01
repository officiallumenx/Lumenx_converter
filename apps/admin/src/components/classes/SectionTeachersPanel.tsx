import { useEffect, useState } from "react";
import { Loader2, Plus, UserRound } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  Select,
} from "@lumenx/ui-admin";
import type { SectionDetailItem } from "@/lib/classes/types";
import {
  assignTeacherToSection,
  listSubjectsForSectionPicker,
  listTeachersForSectionPicker,
  loadSectionTeacherAssignments,
} from "@/lib/classes/section-teachers";
import type { TeacherAssignmentListItem } from "@/lib/timetable/types";

type Props = {
  section: SectionDetailItem;
  writesEnabled: boolean;
  onChanged: () => void;
  notify: (message: string) => void;
};

export function SectionTeachersPanel({
  section,
  writesEnabled,
  onChanged,
  notify,
}: Props) {
  const [rows, setRows] = useState<TeacherAssignmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [teachers, setTeachers] = useState<Array<{ id: string; label: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadSectionTeacherAssignments(section).then((next) => {
      if (cancelled) return;
      setRows(next);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [section.id, section.instituteId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all([
      listTeachersForSectionPicker(section.instituteId),
      listSubjectsForSectionPicker(section.instituteId),
    ]).then(([t, s]) => {
      if (cancelled) return;
      setTeachers(t);
      setSubjects(s);
      setTeacherId(t[0]?.id ?? "");
      setSubjectId(s[0]?.id ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [open, section.instituteId]);

  async function handleAssign() {
    if (!teacherId || !subjectId) {
      notify("Choose a teacher and subject");
      return;
    }
    setSaving(true);
    try {
      await assignTeacherToSection({ section, teacherId, subjectId });
      setOpen(false);
      const next = await loadSectionTeacherAssignments(section);
      setRows(next);
      onChanged();
      notify("Teacher assigned to section");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to assign teacher");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Section teachers"
        hint="Subject teachers assigned via timetable"
        action={
          writesEnabled ? (
            <Button type="button" size="sm" className="gap-1" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" /> Assign teacher
            </Button>
          ) : undefined
        }
      />
      <div className="px-4 pb-5 sm:px-5">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading assignments…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <UserRound className="size-8 opacity-60" />
            <p>No teachers assigned to this section yet.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {rows.map((row) => (
              <div key={row.id} className="px-3 py-2.5 text-sm">
                <div className="font-medium">{row.label}</div>
                <div className="text-xs text-muted-foreground capitalize">{row.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Assign teacher to section"
        footer={
          <>
            <Button type="button" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={() => void handleAssign()} disabled={saving}>
              {saving ? "Saving…" : "Assign"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Teacher">
            <Select value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Choose teacher</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject">
            <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">Choose subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
