import { Hono } from "hono";
import { z } from "zod";
import { assertAuthenticated, requireAuth } from "../../auth/require-auth.js";
import { AppError } from "../../errors/app-error.js";
import {
  consumeAuthHandoff,
  issueAuthHandoff,
} from "../../domains/auth-handoff/repository.js";
import type { AppBindings } from "../../types/app.js";

const authHandoff = new Hono<AppBindings>();

const issueSchema = z.object({
  app: z.enum(["admissions", "careers"]),
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  institute_id: z.string().uuid(),
  institute_name: z.string().min(1).max(200),
  destination: z.string().min(1).max(40),
  name: z.string().min(1).max(200),
  phone: z.string().max(40).optional(),
});

authHandoff.post("/issue", requireAuth, async (c) => {
  const parsed = issueSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw AppError.validation("Invalid handoff request");
  const actor = assertAuthenticated(c);
  const bearerToken = c.req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (bearerToken !== parsed.data.access_token) {
    throw AppError.forbidden("Handoff token must match the authenticated session");
  }
  const membership = actor.memberships.find(
    (item) =>
      item.instituteId === parsed.data.institute_id &&
      ["active", "approved"].includes(item.status),
  );
  if (!membership) throw AppError.forbidden("No active access to this institute");

  const issued = issueAuthHandoff({
    app: parsed.data.app,
    accessToken: parsed.data.access_token,
    refreshToken: parsed.data.refresh_token,
    instituteId: parsed.data.institute_id,
    instituteName: parsed.data.institute_name,
    destination: parsed.data.destination,
    name: parsed.data.name,
    phone: parsed.data.phone,
  });
  return c.json({ data: { code: issued.code, expires_at: issued.expiresAt } }, 201);
});

authHandoff.post("/exchange", async (c) => {
  const parsed = z
    .object({ code: z.string().min(20), app: z.enum(["admissions", "careers"]) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw AppError.validation("Invalid handoff code");
  const record = consumeAuthHandoff(parsed.data.code, parsed.data.app);
  if (!record) throw AppError.unauthenticated("Handoff code is invalid, expired, or already used");
  return c.json({
    data: {
      access_token: record.accessToken,
      refresh_token: record.refreshToken,
      institute_id: record.instituteId,
      institute_name: record.instituteName,
      destination: record.destination,
      name: record.name,
      phone: record.phone,
    },
  });
});

export default authHandoff;
