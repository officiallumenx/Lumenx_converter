import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { listTeachersForActor } from "../teachers/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import type { TeacherPerformanceDto } from "./types.js";

/**
 * Placeholder neutral rating until student/parent feedback tables exist.
 * Documented for Stage 9 consumers — not real performance data.
 */
const PLACEHOLDER_RATING = 4.0;
const PLACEHOLDER_TREND = "0.00";

function assertPerformanceReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

export async function listTeacherPerformanceForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<TeacherPerformanceDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  assertPerformanceReader(actor, instituteId);

  const teachers = await listTeachersForActor(admin, actor, { instituteId });
  return teachers
    .map((t) => ({
      teacherId: t.id,
      name: t.displayName,
      department: t.department,
      rating: PLACEHOLDER_RATING,
      trend: PLACEHOLDER_TREND,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
