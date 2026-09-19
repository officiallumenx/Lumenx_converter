import { Hono } from "hono";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";

const parentAuth = new Hono<AppBindings>();

/**
 * Retired: parent login is now the shared Connect passwordless flow
 * (`/api/v1/auth/connect/*`). Kept as stubs so old clients get a clear error.
 */
parentAuth.post("/request-otp", async () => {
  throw AppError.validation(
    "Parent login moved to Connect passwordless auth. Use /api/v1/auth/connect/login-mode.",
  );
});

parentAuth.post("/verify-otp", async () => {
  throw AppError.validation(
    "Parent login moved to Connect passwordless auth. Use /api/v1/auth/connect/firebase-login or /login.",
  );
});

export default parentAuth;
