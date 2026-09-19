/**
 * Firebase Auth identity extracted from a verified ID token.
 * Mapping to user_profile / Actor lives in domains/firebase-identity.
 * Never construct this from client request bodies — only from Admin-verified tokens.
 */

import type { DecodedIdToken } from "firebase-admin/auth";

export type FirebaseIdentity = {
  /** Firebase Auth UID (stable subject). */
  uid: string;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  name: string | null;
  picture: string | null;
  /** Seconds since epoch (auth_time claim). */
  authTime: number | null;
  /** Seconds since epoch (exp claim). */
  expiresAt: number | null;
  /** Seconds since epoch (iat claim). */
  issuedAt: number | null;
  /** Full decoded token for advanced callers (do not log). */
  claims: DecodedIdToken;
};

export function firebaseIdentityFromDecodedToken(
  decoded: DecodedIdToken,
): FirebaseIdentity {
  const email =
    typeof decoded.email === "string" && decoded.email.trim()
      ? decoded.email.trim().toLowerCase()
      : null;
  const phone =
    typeof decoded.phone_number === "string" && decoded.phone_number.trim()
      ? decoded.phone_number.trim()
      : null;
  const name =
    typeof decoded.name === "string" && decoded.name.trim()
      ? decoded.name.trim()
      : null;
  const picture =
    typeof decoded.picture === "string" && decoded.picture.trim()
      ? decoded.picture.trim()
      : null;

  return {
    uid: decoded.uid,
    email,
    emailVerified: decoded.email_verified === true,
    phoneNumber: phone,
    name,
    picture,
    authTime: typeof decoded.auth_time === "number" ? decoded.auth_time : null,
    expiresAt: typeof decoded.exp === "number" ? decoded.exp : null,
    issuedAt: typeof decoded.iat === "number" ? decoded.iat : null,
    claims: decoded,
  };
}

/** Public DTO — never include raw claims in HTTP responses. */
export function toFirebaseIdentityDto(identity: FirebaseIdentity) {
  return {
    uid: identity.uid,
    email: identity.email,
    email_verified: identity.emailVerified,
    phone_number: identity.phoneNumber,
    name: identity.name,
    picture: identity.picture,
    auth_time: identity.authTime,
    exp: identity.expiresAt,
    iat: identity.issuedAt,
  };
}
