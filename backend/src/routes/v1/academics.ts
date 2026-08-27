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
  createAcademicYearForActor,
  createClassForActor,
  createSectionForActor,
  createSubjectForActor,
  deleteAcademicYearForActor,
  deleteClassForActor,
  deleteSectionForActor,
  deleteSubjectForActor,
  getAcademicYearForActor,
  getClassForActor,
  getSectionForActor,
  getSubjectForActor,
  listAcademicYearsForActor,
  listClassesForActor,
  listSectionsForActor,
  listSubjectsForActor,
  updateAcademicYearForActor,
  updateClassForActor,
  updateSectionForActor,
  updateSubjectForActor,
} from "../../domains/academics/service.js";

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
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD");
const idParamsSchema = z.object({ id: uuid });

const yearStatusSchema = z.enum(["active", "completed", "upcoming", "archived"]);
const classStatusSchema = z.enum(["active", "inactive"]);
const sectionStatusSchema = z.enum(["active", "inactive"]);
const subjectStatusSchema = z.enum(["active", "draft"]);

function mountAuth(app: Hono<AppBindings>) {
  app.use("*", requireAuth);
  return app;
}

// ── Academic years ───────────────────────────────────────────────

const academicYears = mountAuth(new Hono<AppBindings>());

academicYears.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: yearStatusSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listAcademicYearsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
  });
  return c.json({ data });
});

academicYears.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getAcademicYearForActor(admin, actor, id);
  return c.json({ data });
});

academicYears.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z
      .object({
        institute_id: uuid,
        name: z.string().min(1).max(200),
        code: z.string().min(1).max(50),
        starts_on: dateOnly,
        ends_on: dateOnly,
        status: yearStatusSchema.optional(),
      })
      .superRefine((val, ctx) => {
        if (val.ends_on < val.starts_on) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "ends_on must be on or after starts_on",
            path: ["ends_on"],
          });
        }
      }),
    await c.req.json(),
  );
  const data = await createAcademicYearForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    code: body.code,
    startsOn: body.starts_on,
    endsOn: body.ends_on,
    status: body.status,
  });
  return c.json({ data }, 201);
});

academicYears.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        code: z.string().min(1).max(50).optional(),
        starts_on: dateOnly.optional(),
        ends_on: dateOnly.optional(),
        status: yearStatusSchema.optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateAcademicYearForActor(admin, actor, id, {
    name: body.name,
    code: body.code,
    startsOn: body.starts_on,
    endsOn: body.ends_on,
    status: body.status,
  });
  return c.json({ data });
});

academicYears.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteAcademicYearForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Classes ──────────────────────────────────────────────────────

const classes = mountAuth(new Hono<AppBindings>());

classes.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      academic_year_id: uuid.optional(),
      status: classStatusSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listClassesForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    status: query.status,
  });
  return c.json({ data });
});

classes.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getClassForActor(admin, actor, id);
  return c.json({ data });
});

classes.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      academic_year_id: uuid,
      name: z.string().min(1).max(200),
      code: z.string().min(1).max(50),
      sort_order: z.number().int().min(0).optional(),
      status: classStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createClassForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    name: body.name,
    code: body.code,
    sortOrder: body.sort_order,
    status: body.status,
  });
  return c.json({ data }, 201);
});

classes.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        code: z.string().min(1).max(50).optional(),
        sort_order: z.number().int().min(0).optional(),
        status: classStatusSchema.optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateClassForActor(admin, actor, id, {
    name: body.name,
    code: body.code,
    sortOrder: body.sort_order,
    status: body.status,
  });
  return c.json({ data });
});

classes.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteClassForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Sections ─────────────────────────────────────────────────────

const sections = mountAuth(new Hono<AppBindings>());

sections.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      academic_year_id: uuid.optional(),
      class_id: uuid.optional(),
      status: sectionStatusSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listSectionsForActor(admin, actor, {
    instituteId: query.institute_id,
    academicYearId: query.academic_year_id,
    classId: query.class_id,
    status: query.status,
  });
  return c.json({ data });
});

sections.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getSectionForActor(admin, actor, id);
  return c.json({ data });
});

sections.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      academic_year_id: uuid,
      class_id: uuid,
      name: z.string().min(1).max(200),
      code: z.string().min(1).max(50),
      capacity: z.number().int().min(0).nullable().optional(),
      room: z.string().max(120).nullable().optional(),
      sort_order: z.number().int().min(0).optional(),
      status: sectionStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createSectionForActor(admin, actor, {
    instituteId: body.institute_id,
    academicYearId: body.academic_year_id,
    classId: body.class_id,
    name: body.name,
    code: body.code,
    capacity: body.capacity,
    room: body.room,
    sortOrder: body.sort_order,
    status: body.status,
  });
  return c.json({ data }, 201);
});

sections.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        code: z.string().min(1).max(50).optional(),
        capacity: z.number().int().min(0).nullable().optional(),
        room: z.string().max(120).nullable().optional(),
        sort_order: z.number().int().min(0).optional(),
        status: sectionStatusSchema.optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateSectionForActor(admin, actor, id, {
    name: body.name,
    code: body.code,
    capacity: body.capacity,
    room: body.room,
    sortOrder: body.sort_order,
    status: body.status,
  });
  return c.json({ data });
});

sections.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteSectionForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

// ── Subjects ─────────────────────────────────────────────────────

const subjects = mountAuth(new Hono<AppBindings>());

subjects.get("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      status: subjectStatusSchema.optional(),
    }),
    c.req.query(),
  );
  const data = await listSubjectsForActor(admin, actor, {
    instituteId: query.institute_id,
    status: query.status,
  });
  return c.json({ data });
});

subjects.get("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const data = await getSubjectForActor(admin, actor, id);
  return c.json({ data });
});

subjects.post("/", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      name: z.string().min(1).max(200),
      code: z.string().min(1).max(50),
      category: z.string().min(1).max(100),
      periods_per_week: z.number().int().min(1).max(40),
      applicable_class_codes: z.array(z.string().min(1).max(50)).max(50),
      status: subjectStatusSchema.optional(),
    }),
    await c.req.json(),
  );
  const data = await createSubjectForActor(admin, actor, {
    instituteId: body.institute_id,
    name: body.name,
    code: body.code,
    category: body.category,
    periodsPerWeek: body.periods_per_week,
    applicableClassCodes: body.applicable_class_codes,
    status: body.status,
  });
  return c.json({ data }, 201);
});

subjects.patch("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const body = validateBody(
    z
      .object({
        name: z.string().min(1).max(200).optional(),
        code: z.string().min(1).max(50).optional(),
        category: z.string().min(1).max(100).optional(),
        periods_per_week: z.number().int().min(1).max(40).optional(),
        applicable_class_codes: z
          .array(z.string().min(1).max(50))
          .max(50)
          .optional(),
        status: subjectStatusSchema.optional(),
      })
      .refine((b) => Object.keys(b).length > 0, {
        message: "At least one field is required",
      }),
    await c.req.json(),
  );
  const data = await updateSubjectForActor(admin, actor, id, {
    name: body.name,
    code: body.code,
    category: body.category,
    periodsPerWeek: body.periods_per_week,
    applicableClassCodes: body.applicable_class_codes,
    status: body.status,
  });
  return c.json({ data });
});

subjects.delete("/:id", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  await deleteSubjectForActor(admin, actor, id);
  return c.json({ data: { ok: true } });
});

export { academicYears, classes, sections, subjects };
