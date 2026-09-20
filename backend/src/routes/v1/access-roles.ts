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
} from "../../domains/access-roles/staff-login.js";

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
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
  const { identityProvisioned: _ignored, ...data } = provisioned;
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
    }),
    await c.req.json(),
  );
  const data = await requestStaffLoginOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
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
        password: z.string().min(1).max(200),
        pin: z.string().min(4).max(8),
      })
      .superRefine((val, ctx) => {
        const hasMobileOtp = Boolean(val.mobile_otp ?? val.otp);
        const hasMobileGrant = Boolean(val.mobile_otp_grant?.trim());
        const hasEmailOtp = Boolean(val.email_otp?.trim());
        const hasEmailGrant = Boolean(val.email_otp_grant?.trim());
        if (!hasMobileOtp && !hasMobileGrant) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "mobile_otp or mobile_otp_grant is required",
            path: ["mobile_otp"],
          });
        }
        // Email OTP may be skipped when a server mobile grant is supplied.
        if (!hasEmailOtp && !hasEmailGrant && !hasMobileGrant) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "email_otp or email_otp_grant is required",
            path: ["email_otp"],
          });
        }
      }),
    await c.req.json(),
  );

  const data = await verifyStaffLogin(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    otp: body.otp,
    mobileOtp: body.mobile_otp,
    emailOtp: body.email_otp,
    mobileOtpGrant: body.mobile_otp_grant,
    emailOtpGrant: body.email_otp_grant,
    password: body.password,
    pin: body.pin,
  });
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
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      password: z.string().min(1).max(200),
      pin: z.string().min(4).max(8),
    }),
    await c.req.json(),
  );
  const data = await verifyStaffPasswordLogin(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    password: body.password,
    pin: body.pin,
  });
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

staffAuth.post("/forgot-password/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: channelSchema,
    }),
    await c.req.json(),
  );
  const data = await requestStaffPasswordResetOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
  });
  return c.json({ data });
});

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
  return c.json({ data: { ok: true as const } });
});

staffAuth.post("/forgot-pin/request-otp", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      channel: channelSchema,
    }),
    await c.req.json(),
  );
  const data = await requestStaffPinResetOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    channel: body.channel,
  });
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
