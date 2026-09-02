import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteRoles,
  requireInstituteId,
} from "../../authorization/index.js";
import { findStudentById } from "../students/repository.js";
import { findParentById, listLinksForStudent } from "../parents/repository.js";
import { listActiveMemberUserIdsForAudience } from "../notifications/repository.js";
import { emitNotificationForActor } from "../notifications/service.js";
import {
  acknowledgeAllForUser,
  acknowledgeRecipient,
  countRecipientsForAlert,
  findAlertsByIds,
  findRecipientById,
  insertSchoolAlert,
  insertSchoolAlertRecipients,
  listRecentSchoolAlerts,
  listRecipientsForUser,
} from "./repository.js";
import type {
  AdminSchoolAlertDto,
  BroadcastSchoolAlertInput,
  PortalSchoolAlertDto,
  SchoolAlertCategory,
  SchoolAlertRow,
} from "./types.js";

const WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

const LEARNER_READ_ROLES = ["student", "parent"] as const;

function toPortalDto(
  alert: SchoolAlertRow,
  recipient: { read_at: string | null; acknowledged_at: string | null; id: string },
  childName: string | null,
): PortalSchoolAlertDto {
  return {
    id: recipient.id,
    instituteId: alert.institute_id,
    title: alert.title,
    summary: alert.summary,
    detail: alert.detail,
    severity: alert.severity,
    category: (alert.category as SchoolAlertCategory) || "general",
    source: alert.source_label,
    studentId: alert.student_id,
    childName,
    time: alert.created_at,
    unread: recipient.read_at == null,
    acknowledged: recipient.acknowledged_at != null,
  };
}

async function resolveStudentDisplayName(
  admin: SupabaseClient,
  studentId: string | null,
): Promise<string | null> {
  if (!studentId) return null;
  const student = await findStudentById(admin, studentId);
  if (!student) return null;
  return student.display_name?.trim() || `${student.first_name} ${student.surname}`.trim();
}

export async function listPortalSchoolAlertsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<PortalSchoolAlertDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const isLearner = LEARNER_READ_ROLES.some((role) =>
    actor.memberships.some(
      (m) => m.instituteId === instituteId && m.roles.includes(role),
    ),
  );
  if (!actor.isPlatformOperator && !isLearner) {
    throw AppError.forbidden("Insufficient permissions");
  }

  const recipients = await listRecipientsForUser(admin, {
    instituteId,
    userProfileId: actor.userId,
  });
  const alerts = await findAlertsByIds(
    admin,
    recipients.map((r) => r.school_alert_id),
  );
  const alertById = new Map(alerts.map((a) => [a.id, a]));

  const out: PortalSchoolAlertDto[] = [];
  for (const recipient of recipients) {
    const alert = alertById.get(recipient.school_alert_id);
    if (!alert || alert.institute_id !== instituteId) continue;
    const childName = await resolveStudentDisplayName(admin, alert.student_id);
    out.push(toPortalDto(alert, recipient, childName));
  }
  return out;
}

export async function acknowledgePortalSchoolAlertForActor(
  admin: SupabaseClient,
  actor: Actor,
  recipientId: string,
): Promise<PortalSchoolAlertDto> {
  const recipient = await findRecipientById(admin, recipientId);
  if (!recipient || recipient.user_profile_id !== actor.userId) {
    throw AppError.notFound("Alert not found");
  }
  requireInstituteId(actor, recipient.institute_id);
  const updated = await acknowledgeRecipient(admin, recipientId);
  if (!updated) throw AppError.notFound("Alert not found");
  const alerts = await findAlertsByIds(admin, [updated.school_alert_id]);
  const alert = alerts[0];
  if (!alert) throw AppError.notFound("Alert not found");
  const childName = await resolveStudentDisplayName(admin, alert.student_id);
  return toPortalDto(alert, updated, childName);
}

export async function acknowledgeAllPortalSchoolAlertsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<{ acknowledged: number }> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  const count = await acknowledgeAllForUser(admin, {
    instituteId,
    userProfileId: actor.userId,
  });
  return { acknowledged: count };
}

async function resolveRecipientUserIds(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    audience: BroadcastSchoolAlertInput["audience"];
    studentId?: string | null;
  },
): Promise<Array<{ userProfileId: string; studentId: string | null }>> {
  if (input.studentId) {
    const student = await findStudentById(admin, input.studentId);
    if (!student || student.institute_id !== input.instituteId) {
      throw AppError.validation("student_id is invalid for institute");
    }
    const rows: Array<{ userProfileId: string; studentId: string | null }> = [];
    if (student.user_profile_id && input.audience !== "parents") {
      rows.push({ userProfileId: student.user_profile_id, studentId: input.studentId });
    }
    if (input.audience !== "students") {
      const links = await listLinksForStudent(admin, input.studentId, input.instituteId);
      for (const link of links) {
        const parent = await findParentById(admin, link.parent_id);
        if (parent?.user_profile_id) {
          rows.push({ userProfileId: parent.user_profile_id, studentId: input.studentId });
        }
      }
    }
    const seen = new Set<string>();
    return rows.filter((row) => {
      const key = `${row.userProfileId}:${row.studentId ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const audiences: Array<"parents" | "students"> =
    input.audience === "parents_and_students"
      ? ["parents", "students"]
      : [input.audience];

  const out: Array<{ userProfileId: string; studentId: string | null }> = [];
  for (const audience of audiences) {
    const ids = await listActiveMemberUserIdsForAudience(
      admin,
      input.instituteId,
      audience,
    );
    for (const userProfileId of ids) {
      out.push({ userProfileId, studentId: null });
    }
  }
  const seen = new Set<string>();
  return out.filter((row) => {
    const key = `${row.userProfileId}:${row.studentId ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function broadcastSchoolAlertForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: BroadcastSchoolAlertInput,
): Promise<{ alertId: string; recipientCount: number }> {
  const instituteId = requireInstituteId(actor, input.instituteId);
  if (!actor.isPlatformOperator) {
    assertInstituteRoles(actor, instituteId, [...WRITE_ROLES]);
  }

  const title = input.title.trim();
  if (!title) {
    throw AppError.validation("title is required", { title: ["Required"] });
  }

  const severity = input.severity ?? "mandatory";
  const category = input.category ?? "general";
  const summary = input.summary?.trim() || title;
  const detail = input.detail?.trim() || summary;
  const sourceLabel = input.sourceLabel?.trim() || "Institute";

  const alert = await insertSchoolAlert(admin, {
    instituteId,
    title,
    summary,
    detail,
    severity,
    category,
    sourceLabel,
    studentId: input.studentId ?? null,
    createdByUserProfileId: actor.userId,
  });

  const targets = await resolveRecipientUserIds(admin, {
    instituteId,
    audience: input.audience,
    studentId: input.studentId ?? null,
  });

  await insertSchoolAlertRecipients(
    admin,
    targets.map((target) => ({
      instituteId,
      schoolAlertId: alert.id,
      userProfileId: target.userProfileId,
      studentId: target.studentId,
    })),
  );

  const recipientUserIds = [...new Set(targets.map((target) => target.userProfileId))];
  if (recipientUserIds.length > 0) {
    await emitNotificationForActor(admin, actor, {
      instituteId,
      category: "system",
      priority: severity === "emergency" ? "critical" : "important",
      title,
      body: summary,
      deepLink: "/alerts",
      payload: {
        presentation: "alert",
        alertSeverity: severity,
        schoolAlertId: alert.id,
      },
      recipientUserIds,
    });
  }

  return { alertId: alert.id, recipientCount: targets.length };
}

function toAdminDto(
  alert: SchoolAlertRow,
  recipientCount: number,
): AdminSchoolAlertDto {
  return {
    id: alert.id,
    instituteId: alert.institute_id,
    title: alert.title,
    summary: alert.summary,
    detail: alert.detail,
    severity: alert.severity as AdminSchoolAlertDto["severity"],
    category: (alert.category as SchoolAlertCategory) || "general",
    sourceLabel: alert.source_label,
    studentId: alert.student_id,
    recipientCount,
    createdAt: alert.created_at,
    createdByUserId: alert.created_by_user_profile_id,
  };
}

export async function listRecentSchoolAlertsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteIdRaw: string,
): Promise<AdminSchoolAlertDto[]> {
  const instituteId = requireInstituteId(actor, instituteIdRaw);
  if (!actor.isPlatformOperator) {
    assertInstituteRoles(actor, instituteId, [...WRITE_ROLES]);
  }
  const alerts = await listRecentSchoolAlerts(admin, instituteId);
  const out: AdminSchoolAlertDto[] = [];
  for (const alert of alerts) {
    const recipientCount = await countRecipientsForAlert(admin, alert.id);
    out.push(toAdminDto(alert, recipientCount));
  }
  return out;
}
