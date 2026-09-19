import { getConnectApiClient } from "@/lib/connect-api";

export type ConnectLoginInstitute = {
  id: string;
  name: string;
  code: string;
  kind: string;
};

/**
 * Public institute directory for Connect login (no auth).
 * Same backend list as Admin staff login picker.
 */
export async function listConnectLoginInstitutes(): Promise<ConnectLoginInstitute[]> {
  return getConnectApiClient().get<ConnectLoginInstitute[]>(
    "/api/v1/auth/staff/institutes",
    { skipAuth: true },
  );
}
