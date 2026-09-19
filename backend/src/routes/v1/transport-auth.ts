import { Hono } from "hono";
import { z } from "zod";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import { validateBody } from "../../validation/validate.js";
import { loginDriverWithAppPin } from "../../domains/transport/driver-pin-login.js";

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) throw AppError.internal("Database unavailable");
  return clients.admin;
}

const transportAuth = new Hono<AppBindings>();

/**
 * Public: phone + app account PIN → Transport driver session.
 * Account only when Admin set PIN and assigned a vehicle.
 */
transportAuth.post("/pin-login", async (c) => {
  const admin = requireAdmin(c);
  const body = validateBody(
    z.object({
      phone: z.string().min(10).max(40),
      pin: z.string().min(4).max(8),
      institute_id: z.string().uuid().optional(),
    }),
    await c.req.json(),
  );
  const data = await loginDriverWithAppPin(admin, {
    phone: body.phone,
    pin: body.pin,
    instituteId: body.institute_id,
  });
  return c.json({
    data: {
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      institute_id: data.instituteId,
      display_name: data.displayName,
      driver_id: data.driverId,
      account_created: data.accountCreated,
    },
  });
});

export default transportAuth;
