import { canonicalAttendanceSectionKey } from "@lumenx/module-attendance";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadApiClassSectionAudienceOptions } from "@/lib/class-section-audience";
import { getInstituteClassSectionOptions } from "@/lib/exam-timetable-data";

export type AttendanceSectionOption = {
  key: string;
  grade: string;
  section: string;
  label: string;
};

/** Demo uses exam-timetable keys; API maps institute class · section → canonical `10::A`. */
export async function loadAttendanceCoordinatorSectionOptions(
  instituteId: string | null,
): Promise<AttendanceSectionOption[]> {
  if (isApiAuthMode() && instituteId) {
    const rows = await loadApiClassSectionAudienceOptions(instituteId);
    return rows.map((row) => ({
      key: canonicalAttendanceSectionKey(row.grade, row.section),
      grade: row.grade,
      section: row.section,
      label: row.label,
    }));
  }
  return getInstituteClassSectionOptions().map((o) => ({
    key: canonicalAttendanceSectionKey(o.grade, o.section),
    grade: o.grade,
    section: o.section,
    label: o.label,
  }));
}
