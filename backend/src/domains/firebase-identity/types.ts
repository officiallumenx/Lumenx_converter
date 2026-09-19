/** Firebase Auth ↔ LumenX user_profile mapping (Phase 2). */

export type FirebaseLinkedProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  firebase_uid: string | null;
  firebase_linked_at: string | null;
  phone_verified_at: string | null;
  email_verified_at: string | null;
  deleted_at: string | null;
};

export type LinkFirebaseIdentityInput = {
  /** Existing LumenX user_profile.id (== auth.users.id). */
  userProfileId: string;
  firebaseUid: string;
};

export type ResolveFirebaseIdentityOptions = {
  /**
   * When mapping is missing, attempt a unique verified email (or unique phone)
   * candidate lookup. Does not write unless autoLink is true.
   */
  allowCandidateLookup?: boolean;
  /** Persist candidate match as firebase_uid when uniquely resolved. */
  autoLink?: boolean;
  /** Require active membership in this institute (tenant isolation). */
  requiredInstituteId?: string;
};

export type FirebaseIdentityMapping = {
  userProfileId: string;
  firebaseUid: string;
  linkedAt: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  status: string;
  /** How the mapping was obtained. */
  source: "firebase_uid" | "linked_now" | "email_candidate" | "phone_candidate";
};
