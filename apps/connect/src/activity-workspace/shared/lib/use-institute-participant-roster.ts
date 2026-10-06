/** Shared institute roster for Activity participant pickers (API-backed). */
import { useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useApp } from "@/lib/app-state";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";
import { isInstituteUuid } from "@/lib/institute-id";
import type { ParticipantStudentOption } from "./participant-mock-data";

export type InstituteParticipantRoster = {
  classNames: string[];
  /** Unique className-section pairs for section pickers. */
  sections: { className: string; section: string }[];
  students: ParticipantStudentOption[];
  loading: boolean;
};

function mapApiStudent(row: StudentDto): ParticipantStudentOption {
  return {
    id: row.id,
    name: row.displayName?.trim() || "Student",
    className: row.classLabel?.trim() || "—",
    section: row.sectionLabel?.trim() || "—",
    rollNo: row.rollNo?.trim() || "—",
  };
}

/**
 * Loads active institute students for Activity Hub pickers.
 * Returns empty lists when institute is missing (no demo grades).
 */
export function useInstituteParticipantRoster(): InstituteParticipantRoster {
  const { activeInstituteId } = useApp();
  const apiMode = isApiAuthMode();
  const [classNames, setClassNames] = useState<string[]>([]);
  const [sections, setSections] = useState<{ className: string; section: string }[]>([]);
  const [students, setStudents] = useState<ParticipantStudentOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!apiMode || !activeInstituteId || !isInstituteUuid(activeInstituteId)) {
      setClassNames([]);
      setSections([]);
      setStudents([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listStudents({ instituteId: activeInstituteId, status: "active" })
      .then((rows) => {
        if (cancelled) return;
        const mapped = rows.map(mapApiStudent);
        const classes = [...new Set(mapped.map((s) => s.className).filter(Boolean))].sort(
          (a, b) => a.localeCompare(b, undefined, { numeric: true }),
        );
        const sectionKeys = new Map<string, { className: string; section: string }>();
        for (const s of mapped) {
          const key = `${s.className}\0${s.section}`;
          if (!sectionKeys.has(key)) {
            sectionKeys.set(key, { className: s.className, section: s.section });
          }
        }
        setStudents(mapped);
        setClassNames(classes);
        setSections(
          [...sectionKeys.values()].sort(
            (a, b) =>
              a.className.localeCompare(b.className, undefined, { numeric: true }) ||
              a.section.localeCompare(b.section),
          ),
        );
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setClassNames([]);
        setSections([]);
        setStudents([]);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, activeInstituteId]);

  return { classNames, sections, students, loading };
}
