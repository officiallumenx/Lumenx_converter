import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus, Users } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import type { SectionDetailItem } from "@/lib/classes/types";
import {
  enrollStudentInSection,
  listStudentsForEnrollPicker,
  loadSectionRoster,
  type SectionRosterRow,
} from "@/lib/classes/section-roster";

type Props = {
  section: SectionDetailItem;
  writesEnabled: boolean;
  onChanged: () => void;
  notify: (message: string) => void;
};

export function SectionRosterPanel({
  section,
  writesEnabled,
  onChanged,
  notify,
}: Props) {
  const [rows, setRows] = useState<SectionRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [students, setStudents] = useState<Array<{ id: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadSectionRoster(section).then((next) => {
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
    void listStudentsForEnrollPicker(section.instituteId).then((next) => {
      if (cancelled) return;
      setStudents(next);
      setStudentId(next[0]?.id ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [open, section.instituteId]);

  async function handleEnroll() {
    if (!studentId || !rollNo.trim()) {
      notify("Choose a student and enter a roll number");
      return;
    }
    setSaving(true);
    try {
      await enrollStudentInSection({ section, studentId, rollNo });
      setOpen(false);
      setRollNo("");
      const next = await loadSectionRoster(section);
      setRows(next);
      onChanged();
      notify("Student enrolled in section");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to enroll student");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Student roster"
        hint={`${rows.length} active enrollment(s)`}
        action={
          writesEnabled ? (
            <Button type="button" size="sm" className="gap-1" onClick={() => setOpen(true)}>
              <Plus className="size-3.5" /> Add student
            </Button>
          ) : undefined
        }
      />
      <div className="px-4 pb-5 sm:px-5">
        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading roster…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Users className="size-8 opacity-60" />
            <p>No students enrolled in this section yet.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
              >
                <div>
                  <div className="font-medium">{row.studentName}</div>
                  <div className="text-xs text-muted-foreground">
                    Roll {row.rollNo} · enrolled {row.enrolledOn}
                  </div>
                </div>
                <Link
                  to="/students/$id"
                  params={{ id: row.studentId }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View profile
                </Link>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Institute-wide enrollments are also available on{" "}
          <Link to="/enrollments" className="text-primary hover:underline">
            Enrollments
          </Link>
          .
        </p>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add student to section"
        footer={
          <>
            <Button type="button" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={() => void handleEnroll()} disabled={saving}>
              {saving ? "Saving…" : "Enroll"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Student">
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Choose student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Roll number">
            <TextInput value={rollNo} onChange={(e) => setRollNo(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
