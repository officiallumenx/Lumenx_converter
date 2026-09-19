import { randomBytes } from "node:crypto";

export type AuthHandoffApp = "admissions" | "careers";

export type AuthHandoffRecord = {
  app: AuthHandoffApp;
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  instituteName: string;
  name: string;
  phone?: string;
  destination: string;
  expiresAt: number;
};

const handoffs = new Map<string, AuthHandoffRecord>();
const DEFAULT_TTL_MS = 60_000;

export function issueAuthHandoff(
  input: Omit<AuthHandoffRecord, "expiresAt">,
  now = Date.now(),
  ttlMs = DEFAULT_TTL_MS,
): { code: string; expiresAt: number } {
  const code = randomBytes(24).toString("base64url");
  const expiresAt = now + ttlMs;
  handoffs.set(code, { ...input, expiresAt });
  return { code, expiresAt };
}

export function consumeAuthHandoff(
  code: string,
  app: AuthHandoffApp,
  now = Date.now(),
): AuthHandoffRecord | null {
  const record = handoffs.get(code);
  if (!record) return null;
  handoffs.delete(code);
  if (record.app !== app || record.expiresAt <= now) return null;
  return record;
}

export function clearAuthHandoffsForTests(): void {
  handoffs.clear();
}
