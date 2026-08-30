/**
 * Institutes write API — identity + settings PATCH. API auth mode only.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type {
  InstituteDto,
  InstituteKind,
  InstituteSettingsDto,
  InstituteStatus,
} from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Institutes API is only available in API auth mode");
  }
}

export type CreateInstituteInput = {
  code: string;
  name: string;
  kind: InstituteKind;
  status?: InstituteStatus;
  timezone?: string;
  locale?: string;
};

export type UpdateInstituteInput = {
  name?: string;
  kind?: InstituteKind;
  status?: InstituteStatus;
  code?: string;
};

export type UpdateInstituteSettingsInput = {
  timezone?: string;
  locale?: string;
  settings?: Record<string, unknown>;
};

export async function createInstitute(
  input: CreateInstituteInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteDto> {
  assertApiMode();
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || !name) {
    throw new Error("code and name are required");
  }
  const body: Record<string, unknown> = {
    code,
    name,
    kind: input.kind,
  };
  if (input.status !== undefined) body.status = input.status;
  if (input.timezone !== undefined) body.timezone = input.timezone.trim();
  if (input.locale !== undefined) body.locale = input.locale.trim();
  return client.post<InstituteDto>("/api/v1/institutes", body);
}

export async function updateInstitute(
  instituteId: string,
  input: UpdateInstituteInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body.name = input.name.trim();
  if (input.kind !== undefined) body.kind = input.kind;
  if (input.status !== undefined) body.status = input.status;
  if (input.code !== undefined) body.code = input.code.trim();
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<InstituteDto>(
    `/api/v1/institutes/${instituteId.trim()}`,
    body,
  );
}

export async function updateInstituteSettings(
  instituteId: string,
  input: UpdateInstituteSettingsInput,
  client: AdminApiClient = getAdminApiClient(),
): Promise<InstituteSettingsDto> {
  assertApiMode();
  if (!isInstituteUuid(instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  const body: Record<string, unknown> = {};
  if (input.timezone !== undefined) body.timezone = input.timezone.trim();
  if (input.locale !== undefined) body.locale = input.locale.trim();
  if (input.settings !== undefined) body.settings = input.settings;
  if (Object.keys(body).length === 0) {
    throw new Error("At least one field is required");
  }
  return client.patch<InstituteSettingsDto>(
    `/api/v1/institutes/${instituteId.trim()}/settings`,
    body,
  );
}
