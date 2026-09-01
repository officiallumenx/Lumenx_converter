import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CertificateRecommendationRow,
  CertificateRecommendationStatus,
} from "./recommendations-types.js";

export const CERTIFICATE_RECOMMENDATION_COLS =
  "id, institute_id, achievement_id, achievement_title, achievement_type, student_id, student_name, student_class_label, recommended_by_user_id, recommended_by_name, note, status, issued_certificate_id, issued_at, dismissed_at, created_at, updated_at, deleted_at";

export async function listCertificateRecommendations(
  admin: SupabaseClient,
  instituteId: string,
  status?: CertificateRecommendationStatus,
): Promise<CertificateRecommendationRow[]> {
  let query = admin
    .from("certificate_recommendation")
    .select(CERTIFICATE_RECOMMENDATION_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const result = await query;
  return ensureDbOk(result) as CertificateRecommendationRow[];
}

export async function findCertificateRecommendationById(
  admin: SupabaseClient,
  id: string,
): Promise<CertificateRecommendationRow | null> {
  const result = await admin
    .from("certificate_recommendation")
    .select(CERTIFICATE_RECOMMENDATION_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CertificateRecommendationRow | null) ?? null;
}

export async function findPendingRecommendationByAchievement(
  admin: SupabaseClient,
  instituteId: string,
  achievementId: string,
): Promise<CertificateRecommendationRow | null> {
  const result = await admin
    .from("certificate_recommendation")
    .select(CERTIFICATE_RECOMMENDATION_COLS)
    .eq("institute_id", instituteId)
    .eq("achievement_id", achievementId)
    .eq("status", "pending")
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CertificateRecommendationRow | null) ?? null;
}

export async function insertCertificateRecommendation(
  admin: SupabaseClient,
  row: {
    id: string;
    instituteId: string;
    achievementId: string | null;
    achievementTitle: string;
    achievementType: string;
    studentId: string;
    studentName: string;
    studentClassLabel: string | null;
    recommendedByUserId: string | null;
    recommendedByName: string;
    note: string | null;
  },
): Promise<CertificateRecommendationRow> {
  const result = await admin
    .from("certificate_recommendation")
    .insert({
      id: row.id,
      institute_id: row.instituteId,
      achievement_id: row.achievementId,
      achievement_title: row.achievementTitle,
      achievement_type: row.achievementType,
      student_id: row.studentId,
      student_name: row.studentName,
      student_class_label: row.studentClassLabel,
      recommended_by_user_id: row.recommendedByUserId,
      recommended_by_name: row.recommendedByName,
      note: row.note,
      status: "pending",
    })
    .select(CERTIFICATE_RECOMMENDATION_COLS)
    .single();
  return ensureDbOk(result) as CertificateRecommendationRow;
}

export async function updateCertificateRecommendationFields(
  admin: SupabaseClient,
  id: string,
  fields: Record<string, unknown>,
): Promise<CertificateRecommendationRow | null> {
  const result = await admin
    .from("certificate_recommendation")
    .update(fields)
    .eq("id", id)
    .is("deleted_at", null)
    .select(CERTIFICATE_RECOMMENDATION_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as CertificateRecommendationRow | null) ?? null;
}
