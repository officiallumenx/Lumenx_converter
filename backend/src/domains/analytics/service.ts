import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { listStudentsForActor } from "../students/service.js";
import { STUDENT_STAFF_READ_ROLES } from "../students/service.js";
import { listTeachersForActor } from "../teachers/service.js";
import { listParentsForActor } from "../parents/service.js";
import { listComplaintsForActor } from "../complaints/service.js";
import { listLeaveRequestsForActor } from "../leave/service.js";
import { listHomeworkForActor } from "../homework/service.js";
import type { AnalyticsSummaryDto } from "./types.js";

function assertAnalyticsReader(actor: Actor, instituteId: string): void {
  requireInstituteId(actor, instituteId);
  if (actor.isPlatformOperator) return;
  assertInstituteRoles(actor, instituteId, [...STUDENT_STAFF_READ_ROLES]);
}

async function safeCount(fn: () => Promise<unknown[]>): Promise<number> {
  try {
    const rows = await fn();
    return rows.length;
  } catch {
    return 0;
  }
}

/**
 * Aggregate institute counts from existing domain list functions.
 * Individual list failures degrade to zero so the summary shape stays stable.
 */
export async function getAnalyticsSummaryForActor(
  admin: SupabaseClient,
  actor: Actor,
  opts: { instituteId: string },
): Promise<AnalyticsSummaryDto> {
  const instituteId = requireInstituteId(actor, opts.instituteId);
  assertAnalyticsReader(actor, instituteId);

  const [students, teachers, parents, complaints, leave, homework] =
    await Promise.all([
      safeCount(() => listStudentsForActor(admin, actor, { instituteId })),
      safeCount(() => listTeachersForActor(admin, actor, { instituteId })),
      safeCount(() => listParentsForActor(admin, actor, { instituteId })),
      (async () => {
        try {
          const rows = await listComplaintsForActor(admin, actor, {
            instituteId,
          });
          return rows.filter(
            (c) =>
              c.status === "pending" ||
              c.status === "review" ||
              c.status === "forwarded",
          ).length;
        } catch {
          return 0;
        }
      })(),
      (async () => {
        try {
          const rows = await listLeaveRequestsForActor(admin, actor, {
            instituteId,
          });
          return rows.filter((r) => r.status === "pending").length;
        } catch {
          return 0;
        }
      })(),
      safeCount(() => listHomeworkForActor(admin, actor, { instituteId })),
    ]);

  return {
    instituteId,
    students,
    teachers,
    parents,
    openComplaints: complaints,
    pendingLeave: leave,
    homeworkItems: homework,
  };
}
