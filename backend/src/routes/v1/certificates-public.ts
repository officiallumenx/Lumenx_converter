import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateQuery } from "../../validation/validate.js";
import { verifyIssuedCertificatePublic } from "../../domains/certificates/recommendations-service.js";

const certificatesPublic = new Hono<AppBindings>();

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

/** Anonymous certificate verification — no auth required. */
certificatesPublic.get("/verify", async (c) => {
  const admin = requireAdmin(c);
  const query = validateQuery(
    z.object({
      institute_id: uuid,
      certificate_number: z.string().min(1).max(120),
    }),
    c.req.query(),
  );
  const data = await verifyIssuedCertificatePublic(
    admin,
    query.institute_id,
    query.certificate_number,
  );
  return c.json({ data });
});

export default certificatesPublic;
