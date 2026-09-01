export type CertificateRecommendationStatus = "pending" | "issued" | "dismissed";

export type CertificateRecommendationRow = {
  id: string;
  institute_id: string;
  achievement_id: string | null;
  achievement_title: string;
  achievement_type: string;
  student_id: string;
  student_name: string;
  student_class_label: string | null;
  recommended_by_user_id: string | null;
  recommended_by_name: string;
  note: string | null;
  status: CertificateRecommendationStatus;
  issued_certificate_id: string | null;
  issued_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CertificateRecommendationDto = {
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
  status: CertificateRecommendationStatus;
  issuedCertificateId: string | null;
  issuedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCertificateRecommendationInput = {
  instituteId: string;
  achievementId?: string | null;
  achievementTitle: string;
  achievementType: string;
  studentId: string;
  studentName: string;
  studentClassLabel?: string | null;
  recommendedByName?: string;
  note?: string | null;
};

export type UpdateCertificateRecommendationInput = {
  status: "issued" | "dismissed";
  issuedCertificateId?: string | null;
};
