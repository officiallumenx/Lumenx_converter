/**
 * Shared signup OTP helpers for Admin / Admissions / Careers.
 */

export async function requestSignupOtp(input: {
  subjectKey: string;
  channel: "email" | "mobile";
  destination: string;
  apiBaseUrl: string;
}): Promise<{ maskedDestination: string; channel: "email" | "mobile"; devOtp?: string }> {
  const res = await fetch(`${input.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/signup/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_key: input.subjectKey,
      channel: input.channel,
      destination: input.destination,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { maskedDestination: string; channel: "email" | "mobile"; devOtp?: string };
    error?: { message?: string };
  };
  if (!res.ok || !json.data) {
    throw new Error(json.error?.message || "Unable to send verification code.");
  }
  return json.data;
}

export async function verifySignupOtp(input: {
  subjectKey: string;
  channel: "email" | "mobile";
  otp: string;
  apiBaseUrl: string;
}): Promise<{ grant: string; expiresAt: string }> {
  const res = await fetch(`${input.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/signup/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_key: input.subjectKey,
      channel: input.channel,
      otp: input.otp,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: { grant?: string; expiresAt?: string };
    error?: { message?: string };
  };
  if (!res.ok || !json.data?.grant || !json.data.expiresAt) {
    throw new Error(json.error?.message || "Incorrect or expired code.");
  }
  return { grant: json.data.grant, expiresAt: json.data.expiresAt };
}

export async function completeVerifiedAppSignup(input: {
  apiBaseUrl: string;
  app: "admissions" | "careers";
  accountType: "parent" | "institute_admin" | "job_seeker" | "recruiter";
  email: string;
  password: string;
  displayName: string;
  phone?: string;
  verificationGrants: string[];
  metadata?: Record<string, unknown>;
}): Promise<{
  userId: string;
  firebaseUid: string;
  accessToken: string;
  refreshToken: string;
}> {
  const res = await fetch(`${input.apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/signup/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app: input.app,
      account_type: input.accountType,
      email: input.email,
      password: input.password,
      display_name: input.displayName,
      phone: input.phone,
      verification_grants: input.verificationGrants,
      metadata: input.metadata,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: {
      user_id: string;
      firebase_uid: string;
      access_token: string;
      refresh_token: string;
    };
    error?: { message?: string };
  };
  if (!res.ok || !json.data) {
    throw new Error(json.error?.message || "Unable to complete signup.");
  }
  return {
    userId: json.data.user_id,
    firebaseUid: json.data.firebase_uid,
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
  };
}
