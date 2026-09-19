import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../validation/validate.js";
import {
  createAccessAssigneeForActor,
  createAccessRoleForActor,
  deleteAccessAssigneeForActor,
  deleteAccessRoleForActor,
  getEffectivePermissionsForActor,
  listAccessAssigneesForActor,
  listAccessRolesForActor,
  updateAccessAssigneeForActor,
  updateAccessRoleForActor,
} from "../../domains/access-roles/service.js";
import {
  requestStaffLoginOtp,
  verifyStaffLogin,
  verifyStaffPasswordLogin,
  listInstitutesForStaffLogin,
  resolveStaffLoginMode,
  verifyStaffChannelOtp,
  requestStaffPasswordResetOtp,
  verifyStaffPasswordResetOtp,
  completeStaffPasswordReset,
  requestStaffPinResetOtp,
  verifyStaffPinResetOtp,
  completeStaffPinReset,
  verifyStaffRecoveryFirebasePhone,
} from "../../domains/access-roles/staff-login.js";
import { verifyFirebaseIdToken } from "../../integrations/firebase.js";
import { getFirebaseAuth } from "../../integrations/firebase.js";
import { linkFirebaseIdentityToExistingUser } from "../../domains/firebase-identity/service.js";

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

function toFirebasePhone(phone: string | null): string | undefined {
  if (!phone) return undefined;
  const trimmed = phone.trim();
  if (trimmed.startsWith("+")) return `+${trimmed.replace(/\D/g, "")}`;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  return digits.length > 10 ? `+${digits}` : undefined;
}

async function syncAccessAssigneeToFirebase(
  c: { get: (k: "firebaseApp") => AppBindings["Variables"]["firebaseApp"] },
  admin: ReturnType<typeof requireAdmin>,
  assignee: {
    userId: string;
    email: string | null;
    phone: string | null;
    displayName: string;
    membershipStatus: string;
  },
  password?: string,
): Promise<void> {
  const firebaseApp = c.get("firebaseApp");
  const auth = getFirebaseAuth(firebaseApp);
  if (!auth) return;

  const { data: profile, error: profileError } = await admin
    .from("user_profile")
    .select("firebase_uid")
    .eq("id", assignee.userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const fields = {
    email: assignee.email ?? undefined,
    phoneNumber: toFirebasePhone(assignee.phone),
    displayName: assignee.displayName,
    disabled: assignee.membershipStatus === "suspended",
    ...(password ? { password } : {}),
  };

  let firebaseUser;
  const linkedUid = (profile as { firebase_uid?: string | null } | null)
    ?.firebase_uid;
  if (linkedUid) {
    // Already linked (possibly shared across apps). Only refresh the Admin
    // login password — never rewrite phone/email on the shared identity.
    if (password) {
      await auth.updateUser(linkedUid, { password });
    }
    return;
  } else {
    if (!password) return;
    try {
      firebaseUser = assignee.email
        ? await auth.getUserByEmail(assignee.email)
        : assignee.phone
          ? await auth.getUserByPhoneNumber(toFirebasePhone(assignee.phone)!)
          : null;
    } catch (error) {
      if (
        !error ||
        typeof error !== "object" ||
        !("code" in error) ||
        error.code !== "auth/user-not-found"
      ) {
        throw error;
      }
      firebaseUser = null;
    }
    let createdHere = false;
    if (!firebaseUser) {
      firebaseUser = await auth.createUser(fields);
      createdHere = true;
    } else if (password) {
      // Provisioning Admin login: ensure the assigned password is set on the
      // matched Firebase identity (email/phone lookup) before linking.
      await auth.updateUser(firebaseUser.uid, {
        password,
        ...(assignee.email ? { email: assignee.email } : {}),
        ...(fields.phoneNumber ? { phoneNumber: fields.phoneNumber } : {}),
        displayName: assignee.displayName,
        disabled: assignee.membershipStatus === "suspended",
      });
    }
    try {
      await linkFirebaseIdentityToExistingUser(admin, {
        userProfileId: assignee.userId,
        firebaseUid: firebaseUser.uid,
      });
    } catch (error) {
      if (createdHere) {
        await auth.deleteUser(firebaseUser.uid).catch(() => undefined);
      }
      throw error;
    }
  }
}

const uuid = z.string().uuid();
const idParamsSchema = z.object({ id: uuid });
const permissionSchema = z.enum(["full", "read", "none"]);

function mountAuth(app: Hono<AppBindings>) {
  app.use("*", requireAuth);
  return app;
}

// ── Access roles (authenticated admin) ───────────────────────────

const accessRoles = mountAuth(new Hono<AppBindings>());

accessRoles.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listAccessRolesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

accessRoles.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      name: z.string().min(1).max(120),
      scope: z.string().max(120).optional(),
      description: z.string().max(500).nullable().optional(),
      permissions: z.record(permissionSchema),
    }),
    await c.req.json(),
  );
  const data = await createAccessRoleForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    scope: body.scope,
    description: body.description,
    permissions: body.permissions,
  });
  return c.json({ data }, 201);
});

accessRoles.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(120).optional(),
        scope: z.string().max(120).optional(),
        description: z.string().max(500).nullable().optional(),
        permissions: z.record(permissionSchema).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateAccessRoleForActor(admin, actor, id, {
    name: body.name,
    scope: body.scope,
    description: body.description,
    permissions: body.permissions,
  });
  return c.json({ data });
});

accessRoles.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const removeAssignees =
    c.req.query("remove_assignees") === "true" ||
    c.req.query("remove_assignees") === "1";
  const data = await deleteAccessRoleForActor(admin, actor, id, {
    removeAssignees,
  });
  return c.json({ data: { ok: true, removed_assignees: data.removedAssignees } });
});

// ── Access assignees ─────────────────────────────────────────────

const accessAssignees = mountAuth(new Hono<AppBindings>());

accessAssignees.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listAccessAssigneesForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

accessAssignees.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      access_role_id: uuid,
      password: z.string().min(8).max(200),
      display_name: z.string().min(1).max(200),
      email: z.string().email().max(200).nullable().optional(),
      phone: z.string().max(40).nullable().optional(),
      username: z.string().min(3).max(64).nullable().optional(),
      pin: z.string().min(4).max(8).nullable().optional(),
      linked_teacher_id: uuid.nullable().optional(),
      linked_staff_id: uuid.nullable().optional(),
      assigned_section_keys: z.array(z.string().max(40)).max(50).optional(),
      membership_status: z.enum(["active", "invited", "suspended"]).optional(),
    }),
    await c.req.json(),
  );
  const provisioned = await createAccessAssigneeForActor(admin, actor, {
    instituteId: body.institute_id,
    accessRoleId: body.access_role_id,
    password: body.password,
    displayName: body.display_name,
    email: body.email,
    phone: body.phone,
    username: body.username,
    pin: body.pin,
    linkedTeacherId: body.linked_teacher_id,
    linkedStaffId: body.linked_staff_id,
    assignedSectionKeys: body.assigned_section_keys,
    membershipStatus: body.membership_status,
  });
  const { identityProvisioned, ...data } = provisioned;
  try {
    await syncAccessAssigneeToFirebase(c, admin, data, body.password);
  } catch (error) {
    // Firebase creation/linking is part of provisioning. Remove the assignment
    // and freshly-created Supabase identity so callers can safely retry.
    await deleteAccessAssigneeForActor(admin, actor, data.id).catch(() => undefined);
    if (identityProvisioned) {
      await admin.auth.admin.deleteUser(data.userId).catch(() => undefined);
    }
    throw error;
  }
  return c.json({ data }, 201);
});

accessAssignees.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        access_role_id: uuid.optional(),
        password: z.string().min(8).max(200).optional(),
        display_name: z.string().min(1).max(200).optional(),
        email: z.string().email().max(200).nullable().optional(),
        phone: z.string().max(40).nullable().optional(),
        assigned_section_keys: z.array(z.string().max(40)).max(50).optional(),
        membership_status: z.enum(["active", "invited", "suspended"]).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateAccessAssigneeForActor(admin, actor, id, {
    accessRoleId: body.access_role_id,
    password: body.password,
    displayName: body.display_name,
    email: body.email,
    phone: body.phone,
    assignedSectionKeys: body.assigned_section_keys,
    membershipStatus: body.membership_status,
  });
  await syncAccessAssigneeToFirebase(c, admin, data, body.password);
  return c.json({ data });
});

accessAssignees.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteAccessAssigneeForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Effective permissions for current user ───────────────────────

const myAccess = mountAuth(new Hono<AppBindings>());

myAccess.get("/permissions", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await getEffectivePermissionsForActor(
    admin,
    actor,
    query.institute_id,
  );
  return c.json({ data });
});

// ── Public staff login (OTP + password) ──────────────────────────

const staffAuth = new Hono<AppBindings>();

staffAuth.get("/institutes", async (c) => {
  const admin = requireAdmin(c);
  const data = await listInstitutesForStaffLogin(admin);
  return c.json({ data });
});

staffAuth.post("/login-mode", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
    }),
    await c.req.json(),
  );
  const data = await resolveStaffLoginMode(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
  });
  return c.json({ data });
});

staffAuth.post("/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: z.enum(["email", "mobile"]).optional(),
      delivery: z.enum(["server", "firebase_client"]).optional(),
    }),
    await c.req.json(),
  );
  const data = await requestStaffLoginOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
    delivery: body.delivery,
  });
  return c.json({ data });
});

staffAuth.post("/verify-login", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z
      .object({
        institute_id: uuid,
        identifier: z.string().min(3).max(200),
        otp: z.string().length(6).optional(),
        mobile_otp: z.string().length(6).optional(),
        email_otp: z.string().length(6).optional(),
        mobile_otp_grant: z.string().length(64).optional(),
        email_otp_grant: z.string().length(64).optional(),
        firebase_id_token: z.string().min(20).max(4096).optional(),
        password: z.string().min(1).max(200).optional(),
        pin: z.string().min(4).max(8),
      })
      .superRefine((val, ctx) => {
        const hasFirebase = Boolean(val.firebase_id_token?.trim());
        const hasMobileOtp = Boolean(val.mobile_otp ?? val.otp);
        const hasMobileGrant = Boolean(val.mobile_otp_grant?.trim());
        const hasEmailOtp = Boolean(val.email_otp?.trim());
        const hasEmailGrant = Boolean(val.email_otp_grant?.trim());
        if (!hasFirebase && !hasMobileOtp && !hasMobileGrant) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "mobile_otp, mobile_otp_grant, or firebase_id_token is required",
            path: ["mobile_otp"],
          });
        }
        if (!val.password) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "password is required after OTP verification",
            path: ["password"],
          });
        }
        // Email OTP may be skipped when Firebase phone proof is supplied
        // (ID token or mobile grant from verify-firebase-phone). Service enforces.
        if (!hasFirebase && !hasEmailOtp && !hasEmailGrant && !hasMobileGrant) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "email_otp or email_otp_grant is required",
            path: ["email_otp"],
          });
        }
      }),
    await c.req.json(),
  );

  const firebaseApp = c.get("firebaseApp");
  const data = await verifyStaffLogin(
    admin,
    {
      instituteId: body.institute_id,
      identifier: body.identifier,
      otp: body.otp,
      mobileOtp: body.mobile_otp,
      emailOtp: body.email_otp,
      mobileOtpGrant: body.mobile_otp_grant,
      emailOtpGrant: body.email_otp_grant,
      firebaseIdToken: body.firebase_id_token,
      password: body.password,
      pin: body.pin,
    },
    {
      verifyFirebaseIdToken: firebaseApp
        ? async (idToken) => {
            const decoded = await verifyFirebaseIdToken(firebaseApp, idToken, {
              checkRevoked: true,
            });
            return {
              uid: decoded.uid,
              phone_number: decoded.phone_number,
              signInProvider: decoded.firebase?.sign_in_provider,
            };
          }
        : undefined,
    },
  );
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      institute_id: data.instituteId,
      display_name: data.displayName,
    },
  });
});

staffAuth.post("/password-login", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z
      .object({
        institute_id: uuid,
        identifier: z.string().min(3).max(200),
        password: z.string().min(1).max(200).optional(),
        firebase_id_token: z.string().min(20).max(4096).optional(),
        pin: z.string().min(4).max(8),
      })
      .superRefine((val, ctx) => {
        if (!val.password && !val.firebase_id_token) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "password or firebase_id_token is required",
            path: ["password"],
          });
        }
      }),
    await c.req.json(),
  );
  const firebaseApp = c.get("firebaseApp");
  const data = await verifyStaffPasswordLogin(
    admin,
    {
      instituteId: body.institute_id,
      identifier: body.identifier,
      password: body.password,
      firebaseIdToken: body.firebase_id_token,
      pin: body.pin,
    },
    {
      verifyFirebaseIdToken: firebaseApp
        ? async (idToken) => {
            const decoded = await verifyFirebaseIdToken(firebaseApp, idToken, {
              checkRevoked: true,
            });
            return {
              uid: decoded.uid,
              email: decoded.email,
              signInProvider: decoded.firebase?.sign_in_provider,
            };
          }
        : undefined,
    },
  );
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      institute_id: data.instituteId,
      display_name: data.displayName,
    },
  });
});

const channelSchema = z.enum(["email", "mobile"]);
const otpSchema = z.string().length(6);
const grantSchema = z.string().length(64);

staffAuth.post("/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: channelSchema,
      otp: otpSchema,
    }),
    await c.req.json(),
  );
  const data = await verifyStaffChannelOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
    otp: body.otp,
  });
  return c.json({ data });
});

staffAuth.post("/verify-firebase-phone", async (c) => {
  const admin = requireAdmin(c);
  const firebaseApp = c.get("firebaseApp");
  if (!firebaseApp) {
    throw AppError.internal("Firebase Auth is not configured on the API.");
  }
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      firebase_id_token: z.string().min(20).max(4096),
    }),
    await c.req.json(),
  );
  const data = await verifyStaffRecoveryFirebasePhone(
    admin,
    {
      instituteId: body.institute_id,
      identifier: body.identifier,
      purpose: "staff_login",
      firebaseIdToken: body.firebase_id_token,
    },
    {
      verifyFirebaseIdToken: async (idToken) => {
        const decoded = await verifyFirebaseIdToken(firebaseApp, idToken, {
          checkRevoked: true,
        });
        return {
          uid: decoded.uid,
          phone_number: decoded.phone_number,
          signInProvider: decoded.firebase?.sign_in_provider,
        };
      },
    },
  );
  return c.json({ data });
});

staffAuth.post("/forgot-password/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: channelSchema,
      delivery: z.enum(["server", "firebase_client"]).optional(),
    }),
    await c.req.json(),
  );
  const data = await requestStaffPasswordResetOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
    delivery: body.delivery,
  });
  return c.json({ data });
});

staffAuth.post(
  "/forgot-password/verify-firebase-phone",
  async (c) => {
    const admin = requireAdmin(c);
    const firebaseApp = c.get("firebaseApp");
    if (!firebaseApp) {
      throw AppError.internal("Firebase Auth is not configured on the API.");
    }
    const body = validateBody(
      z.object({
        institute_id: uuid,
        identifier: z.string().min(3).max(200),
        firebase_id_token: z.string().min(20).max(4096),
      }),
      await c.req.json(),
    );
    const data = await verifyStaffRecoveryFirebasePhone(
      admin,
      {
        instituteId: body.institute_id,
        identifier: body.identifier,
        purpose: "password_reset",
        firebaseIdToken: body.firebase_id_token,
      },
      {
        verifyFirebaseIdToken: async (idToken) => {
          const decoded = await verifyFirebaseIdToken(firebaseApp, idToken, {
            checkRevoked: true,
          });
          return {
            uid: decoded.uid,
            phone_number: decoded.phone_number,
            signInProvider: decoded.firebase?.sign_in_provider,
          };
        },
      },
    );
    return c.json({ data });
  },
);

staffAuth.post("/forgot-password/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: channelSchema,
      otp: otpSchema,
    }),
    await c.req.json(),
  );
  const data = await verifyStaffPasswordResetOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
    otp: body.otp,
  });
  return c.json({ data });
});

staffAuth.post("/forgot-password/complete", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      mobile_otp_grant: grantSchema,
      email_otp_grant: grantSchema.optional(),
      new_password: z.string().min(8).max(128),
    }),
    await c.req.json(),
  );
  const data = await completeStaffPasswordReset(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    mobileOtpGrant: body.mobile_otp_grant,
    emailOtpGrant: body.email_otp_grant,
    newPassword: body.new_password,
  });
  // Keep Firebase email/password in sync when Auth is configured.
  const firebaseApp = c.get("firebaseApp");
  const firebaseAuth = getFirebaseAuth(firebaseApp);
  if (firebaseAuth && data.email) {
    try {
      const { data: profile } = await admin
        .from("user_profile")
        .select("firebase_uid")
        .eq("id", data.userId)
        .maybeSingle();
      const uid = (profile as { firebase_uid?: string | null } | null)?.firebase_uid;
      if (uid) {
        await firebaseAuth.updateUser(uid, { password: body.new_password });
      } else {
        try {
          const existing = await firebaseAuth.getUserByEmail(data.email);
          await firebaseAuth.updateUser(existing.uid, { password: body.new_password });
        } catch {
          // No Firebase user yet — login can create/link later.
        }
      }
    } catch {
      // Supabase password is authoritative for this reset; Firebase sync is best-effort.
    }
  }
  return c.json({ data: { ok: true as const } });
});

staffAuth.post("/forgot-pin/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: channelSchema,
      delivery: z.enum(["server", "firebase_client"]).optional(),
    }),
    await c.req.json(),
  );
  const data = await requestStaffPinResetOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
    delivery: body.delivery,
  });
  return c.json({ data });
});

staffAuth.post("/forgot-pin/verify-firebase-phone", async (c) => {
  const admin = requireAdmin(c);
  const firebaseApp = c.get("firebaseApp");
  if (!firebaseApp) {
    throw AppError.internal("Firebase Auth is not configured on the API.");
  }
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      firebase_id_token: z.string().min(20).max(4096),
    }),
    await c.req.json(),
  );
  const data = await verifyStaffRecoveryFirebasePhone(
    admin,
    {
      instituteId: body.institute_id,
      identifier: body.identifier,
      purpose: "pin_reset",
      firebaseIdToken: body.firebase_id_token,
    },
    {
      verifyFirebaseIdToken: async (idToken) => {
        const decoded = await verifyFirebaseIdToken(firebaseApp, idToken, {
          checkRevoked: true,
        });
        return {
          uid: decoded.uid,
          phone_number: decoded.phone_number,
          signInProvider: decoded.firebase?.sign_in_provider,
        };
      },
    },
  );
  return c.json({ data });
});

staffAuth.post("/forgot-pin/verify-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: channelSchema,
      otp: otpSchema,
    }),
    await c.req.json(),
  );
  const data = await verifyStaffPinResetOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
    otp: body.otp,
  });
  return c.json({ data });
});

staffAuth.post("/forgot-pin/complete", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      mobile_otp_grant: grantSchema,
      email_otp_grant: grantSchema.optional(),
      new_pin: z.string().min(4).max(8),
    }),
    await c.req.json(),
  );
  const data = await completeStaffPinReset(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    mobileOtpGrant: body.mobile_otp_grant,
    emailOtpGrant: body.email_otp_grant,
    newPin: body.new_pin,
  });
  return c.json({ data });
});

export { accessRoles, accessAssignees, myAccess, staffAuth };
