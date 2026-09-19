/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Recovery Service
 *  Demo credential lookup / password overrides removed (Wave 1).
 *  Staff PIN/password reset uses AdminLoginFlow API OTP paths.
 * ───────────────────────────────────────────────────────────── */

const DEMO_RECOVERY_REMOVED =
  "Demo account recovery has been removed. Use Login → Forgot password / Forgot PIN with your institute staff credentials.";

export function getPasswordOverride(_email: string): string | null {
  return null;
}

export function resolveDemoPassword(_credential: unknown): string {
  throw new Error(DEMO_RECOVERY_REMOVED);
}

export function findDemoUserByEmail(_email: string): null {
  return null;
}

export function findDemoUserByIdentifier(_identifier: string): null {
  return null;
}

export async function mockVerifyRecoveryLogin(
  _identifier: string,
  _password: string,
): Promise<never> {
  throw new Error(DEMO_RECOVERY_REMOVED);
}

export async function mockLookupAccountByEmail(_email: string): Promise<never> {
  throw new Error(DEMO_RECOVERY_REMOVED);
}

export async function mockResetPassword(_email: string, _newPassword: string): Promise<never> {
  throw new Error(DEMO_RECOVERY_REMOVED);
}

export async function mockResetPin(_userId: string, _newPin: string): Promise<never> {
  throw new Error(DEMO_RECOVERY_REMOVED);
}
