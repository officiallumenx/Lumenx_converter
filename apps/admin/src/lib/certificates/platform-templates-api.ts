/**
 * Published platform certificate templates (Nexus DB catalog) — Admin consumption.
 * Used only when VITE_NEXUS_TEMPLATE_DB_CATALOG is enabled (dual-read).
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  mapPlatformDtoToCertificateTemplate,
  type PlatformCertificateTemplateApiDto,
  type CertificateTemplate,
} from "@lumenx/module-certificates";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Platform templates API is only available in API auth mode");
  }
}

export async function listPublishedPlatformCertificateTemplates(
  client: AdminApiClient = getAdminApiClient(),
): Promise<CertificateTemplate[]> {
  assertApiMode();
  const rows = await client.get<PlatformCertificateTemplateApiDto[]>(
    "/api/v1/certificates/platform-templates",
  );
  return rows.map(mapPlatformDtoToCertificateTemplate);
}

export async function getPlatformCertificateTemplateSignedUrl(
  templateId: string,
  expiresInSec?: number,
  client: AdminApiClient = getAdminApiClient(),
): Promise<{ signedUrl: string; expiresAt: string; templateId: string }> {
  assertApiMode();
  const query = expiresInSec ? `?expires_in=${expiresInSec}` : "";
  return client.get<{ signedUrl: string; expiresAt: string; templateId: string }>(
    `/api/v1/certificates/platform-templates/${templateId.trim()}/signed-url${query}`,
  );
}
