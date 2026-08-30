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
  createReportJobForActor,
  downloadReportJobForActor,
  listReportCatalogForActor,
  listReportJobsForActor,
} from "../../domains/reports/service.js";

const reports = new Hono<AppBindings>();
reports.use("*", requireAuth);

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

reports.get("/catalog", async (c) => {
  const actor = assertAuthenticated(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = listReportCatalogForActor(actor, query.institute_id);
  return c.json({ data });
});

reports.get("/jobs", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = await listReportJobsForActor(admin, actor, query.institute_id);
  return c.json({ data });
});

reports.post("/jobs", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      report_id: z.string().min(1).max(100),
    }),
    await c.req.json(),
  );
  const data = await createReportJobForActor(admin, actor, {
    instituteId: body.institute_id,
    reportId: body.report_id,
  });
  return c.json({ data }, 201);
});

reports.get("/jobs/:id/download", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const { id } = validateParams(idParamsSchema, c.req.param());
  const file = await downloadReportJobForActor(admin, actor, id);
  const disposition = `attachment; filename="${file.fileName.replace(/"/g, "")}"`;
  return c.newResponse(file.contentText, 200, {
    "Content-Type": file.contentType,
    "Content-Disposition": disposition,
    "Cache-Control": "no-store",
  });
});

export default reports;
