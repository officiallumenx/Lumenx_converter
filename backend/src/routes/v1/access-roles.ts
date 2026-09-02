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
  await deleteAccessRoleForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
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
      linked_teacher_id: uuid.nullable().optional(),
      linked_staff_id: uuid.nullable().optional(),
      assigned_section_keys: z.array(z.string().max(40)).max(50).optional(),
      membership_status: z.enum(["active", "invited", "suspended"]).optional(),
    }),
    await c.req.json(),
  );
  const data = await createAccessAssigneeForActor(admin, actor, {
    instituteId: body.institute_id,
    accessRoleId: body.access_role_id,
    password: body.password,
    displayName: body.display_name,
    email: body.email,
    phone: body.phone,
    linkedTeacherId: body.linked_teacher_id,
    linkedStaffId: body.linked_staff_id,
    assignedSectionKeys: body.assigned_section_keys,
    membershipStatus: body.membership_status,
  });
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
    }),
    await c.req.json(),
  );
  const data = await requestStaffLoginOtp(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
  });
  return c.json({ data });
});

staffAuth.post("/verify-login", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      identifier: z.string().min(3).max(200),
      otp: z.string().length(6),
      password: z.string().min(1).max(200),
    }),
    await c.req.json(),
  );
  const data = await verifyStaffLogin(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    otp: body.otp,
    password: body.password,
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
    }),
    await c.req.json(),
  );
  const data = await verifyStaffPasswordLogin(admin, {
    instituteId: body.institute_id,
    identifier: body.identifier,
    password: body.password,
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

export { accessRoles, accessAssignees, myAccess, staffAuth };
