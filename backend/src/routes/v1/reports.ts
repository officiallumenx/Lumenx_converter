import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { validateBody, validateQuery } from "../../validation/validate.js";
import {
  createReportJobForActor,
  listReportCatalogForActor,
  listReportJobsForActor,
} from "../../domains/reports/service.js";

const reports = new Hono<AppBindings>();
reports.use("*", requireAuth);

const uuid = z.string().uuid();

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
  const query = validateQuery(
    z.object({ institute_id: uuid }),
    c.req.query(),
  );
  const data = listReportJobsForActor(actor, query.institute_id);
  return c.json({ data });
});

reports.post("/jobs", async (c) => {
  const actor = assertAuthenticated(c);
  const body = validateBody(
    z.object({
      institute_id: uuid,
      report_id: z.string().min(1).max(100),
    }),
    await c.req.json(),
  );
  const data = createReportJobForActor(actor, {
    instituteId: body.institute_id,
    reportId: body.report_id,
  });
  return c.json({ data }, 201);
});

export default reports;
