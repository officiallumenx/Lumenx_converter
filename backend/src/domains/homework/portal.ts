import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  requireInstituteId,
} from "../../authorization/index.js";
import { findAssetById } from "../assets/repository.js";
import { findStudentById } from "../students/repository.js";
import { findTeacherById } from "../teachers/repository.js";
import {
  findHomeworkById,
  listActiveEnrollmentsForStudents,
  listHomework,
  listSubmissionsForHomework,
} from "./repository.js";
import {
  assertCanReadHomework,
  filterHomeworkForActor,
  resolveAccessibleStudentIds,
} from "./service.js";
import type {
  HomeworkAttachmentDto,
  HomeworkRow,
  LearnerHomeworkItemDto,
  TeacherHomeworkSheetDto,
} from "./types.js";

async function loadSubjectLabel(
  admin: SupabaseClient,
  subjectId: string,
): Promise<string> {
  const res = await admin
    .from("subject")
    .select("name, code")
    .eq("id", subjectId)
    .maybeSingle();
  const row = res.data as { name: string | null; code: string | null } | null;
  return row?.name?.trim() || row?.code?.trim() || "Subject";
}

async function loadAttachmentDto(
  admin: SupabaseClient,
  assetId: string | null,
): Promise<HomeworkAttachmentDto | null> {
  if (!assetId) return null;
  const asset = await findAssetById(admin, assetId);
  if (!asset || asset.deleted_at) return null;
  return {
    assetId: asset.id,
    fileName: asset.file_name,
    contentType: asset.content_type,
  };
}

function homeworkRowToLearnerItem(
  row: HomeworkRow,
  subjectName: string,
  teacherName: string,
  attachment: HomeworkAttachmentDto | null,
): LearnerHomeworkItemDto {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    dueDate: row.due_date,
    subjectName,
    teacherName,
    publishedOn: row.published_at?.slice(0, 10) ?? null,
    attachment,
  };
}

export async function getLearnerHomeworkItemsForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; studentId: string; kind?: "homework" | "assignment" },
): Promise<LearnerHomeworkItemDto[]> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  assertInstituteAccess(actor, instituteId);

  const accessible = await resolveAccessibleStudentIds(admin, actor, instituteId);
  if (!accessible.has(input.studentId)) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const student = await findStudentById(admin, input.studentId);
  if (!student || student.institute_id !== instituteId) {
    throw AppError.notFound("Student not found");
  }

  const enrollments = await listActiveEnrollmentsForStudents(admin, {
    instituteId,
    studentIds: [input.studentId],
  });
  if (enrollments.length === 0) return [];

  const sectionIds = [...new Set(enrollments.map((e) => e.section_id))];
  const groups = await Promise.all(
    sectionIds.map((sectionId) =>
      listHomework(admin, {
        instituteId,
        sectionId,
        status: "published",
        kind: input.kind,
      }),
    ),
  );
  const rows = groups.flat();
  const visible = await filterHomeworkForActor(admin, actor, instituteId, rows);

  const items: LearnerHomeworkItemDto[] = [];
  for (const row of visible) {
    const subjectName = await loadSubjectLabel(admin, row.subject_id);
    const teacher = await findTeacherById(admin, row.teacher_id);
    const teacherName = teacher?.display_name?.trim() || "Teacher";
    const attachment = await loadAttachmentDto(admin, row.attachment_asset_id);
    items.push(homeworkRowToLearnerItem(row, subjectName, teacherName, attachment));
  }

  return items.sort((a, b) => b.dueDate.localeCompare(a.dueDate));
}

export async function getTeacherHomeworkSheetForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: { instituteId: string; homeworkId: string },
): Promise<TeacherHomeworkSheetDto> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  const row = await findHomeworkById(admin, input.homeworkId);
  if (!row || row.institute_id !== instituteId) {
    throw AppError.notFound("Homework not found");
  }

  await assertCanReadHomework(admin, actor, row);

  const submissions = await listSubmissionsForHomework(admin, row.id);
  const subjectName = await loadSubjectLabel(admin, row.subject_id);

  const sheetRows = [];
  for (const sub of submissions) {
    const student = await findStudentById(admin, sub.student_id);
    const enrollmentRes = await admin
      .from("enrollment")
      .select("roll_no")
      .eq("id", sub.enrollment_id)
      .maybeSingle();
    const rollNo =
      (enrollmentRes.data as { roll_no: string | null } | null)?.roll_no ?? null;
    sheetRows.push({
      id: sub.id,
      homeworkId: sub.homework_id,
      studentId: sub.student_id,
      enrollmentId: sub.enrollment_id,
      studentName: student?.display_name?.trim() || "Student",
      rollNo,
      status: sub.status,
      markedAt: sub.marked_at,
    });
  }

  sheetRows.sort(
    (a, b) =>
      (a.rollNo ?? "").localeCompare(b.rollNo ?? "", undefined, { numeric: true }) ||
      a.studentName.localeCompare(b.studentName),
  );

  const submittedCount = sheetRows.filter((r) => r.status === "submitted").length;

  return {
    homeworkId: row.id,
    title: row.title,
    kind: row.kind,
    dueDate: row.due_date,
    status: row.status,
    sectionId: row.section_id,
    subjectName,
    submittedCount,
    totalCount: sheetRows.length,
    rows: sheetRows,
  };
}
