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
  createInstituteForActor,
  createMembershipForActor,
  deleteInstituteForActor,
  deleteMembershipForActor,
  getInstituteForActor,
  getInstitutePublicProfileForActor,
  getInstituteSettingsForActor,
  getMembershipForActor,
  getProfileForActor,
  listInstitutesForActor,
  listMembershipsForActor,
  listRolesForActor,
  updateInstituteForActor,
  updateInstituteSettingsForActor,
  updateMembershipForActor,
  updateOwnProfileForActor,
} from "../../domains/identity/service.js";

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

const instituteKindSchema = z.enum([
  "school",
  "junior_college",
  "degree_college",
  "engineering",
  "university",
]);
const instituteStatusSchema = z.enum([
  "active",
  "inactive",
  "suspended",
  "archived",
]);
const membershipStatusSchema = z.enum([
  "active",
  "invited",
  "suspended",
  "ended",
]);

function mountAuth(app: Hono<AppBindings>) {
  app.use("*", requireAuth);
  return app;
}

// ── Institutes ───────────────────────────────────────────────────

const institutes = mountAuth(new Hono<AppBindings>());

institutes.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listInstitutesForActor(admin, actor);
  return c.json({ data });
});

institutes.get("/:id/public-profile", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getInstitutePublicProfileForActor(admin, actor, id);
  return c.json({ data });
});

institutes.get("/:id/settings", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getInstituteSettingsForActor(admin, actor, id);
  return c.json({ data });
});

institutes.patch("/:id/settings", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        timezone: z.string().min(1).max(80).optional(),
        locale: z.string().min(1).max(40).optional(),
        settings: z.record(z.unknown()).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateInstituteSettingsForActor(admin, actor, id, {
    timezone: body.timezone,
    locale: body.locale,
    settings: body.settings,
  });
  return c.json({ data });
});

institutes.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getInstituteForActor(admin, actor, id);
  return c.json({ data });
});

institutes.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      code: z.string().min(1).max(50),
      name: z.string().min(1).max(200),
      kind: instituteKindSchema,
      status: instituteStatusSchema.optional(),
      timezone: z.string().min(1).max(80).optional(),
      locale: z.string().min(1).max(40).optional(),
    }),
    await c.req.json(),
  );
  const data = await createInstituteForActor(admin, actor, {
    code: body.code,
    name: body.name,
    kind: body.kind,
    status: body.status,
    timezone: body.timezone,
    locale: body.locale,
  });
  return c.json({ data }, 201);
});

institutes.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        kind: instituteKindSchema.optional(),
        status: instituteStatusSchema.optional(),
        code: z.string().min(1).max(50).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateInstituteForActor(admin, actor, id, {
    name: body.name,
    kind: body.kind,
    status: body.status,
    code: body.code,
  });
  return c.json({ data });
});

institutes.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteInstituteForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Profiles ─────────────────────────────────────────────────────

const profiles = mountAuth(new Hono<AppBindings>());

profiles.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getProfileForActor(admin, actor, id);
  return c.json({ data });
});

profiles.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  if (id !== actor.userId) {
    throw AppError.forbidden("Can only update own profile");
  }
  const body = validateBody(
    z
      .object({
        display_name: z.string().min(1).max(200).optional(),
        phone: z.string().max(40).nullable().optional(),
        avatar_url: z.string().url().max(500).nullable().optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateOwnProfileForActor(admin, actor, {
    displayName: body.display_name,
    phone: body.phone,
    avatarUrl: body.avatar_url,
  });
  return c.json({ data });
});

// ── Memberships ──────────────────────────────────────────────────

const memberships = mountAuth(new Hono<AppBindings>());

memberships.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: membershipStatusSchema.optional(),
      user_id: uuid.optional(),
    }),
    c.req.query(),
  );
  const data = await listMembershipsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
    userId: query.user_id,
  });
  return c.json({ data });
});

memberships.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getMembershipForActor(admin, actor, id);
  return c.json({ data });
});

memberships.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      user_id: uuid,
      status: membershipStatusSchema.optional(),
      roles: z.array(z.string().min(1).max(80)).min(1).max(20),
    }),
    await c.req.json(),
  );
  const data = await createMembershipForActor(admin, actor, {
    instituteId: body.institute_id,
    userId: body.user_id,
    status: body.status,
    roles: body.roles,
  });
  return c.json({ data }, 201);
});

memberships.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        status: membershipStatusSchema.optional(),
        roles: z.array(z.string().min(1).max(80)).min(1).max(20).optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateMembershipForActor(admin, actor, id, {
    status: body.status,
    roles: body.roles,
  });
  return c.json({ data });
});

memberships.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteMembershipForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Roles catalog ────────────────────────────────────────────────

const roles = mountAuth(new Hono<AppBindings>());

roles.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listRolesForActor(admin, actor);
  return c.json({ data });
});

export { institutes, profiles, memberships, roles };
