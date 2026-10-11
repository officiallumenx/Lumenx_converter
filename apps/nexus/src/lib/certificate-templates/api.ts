/**
 * Nexus platform certificate template API (DB catalog).
 *
 * Flag OFF (default): UI uses localStorage; these helpers are unused.
 * Flag ON: dual-read via {@link listNexusPlatformCertificateTemplates}; optional
 * best-effort dual-write via {@link mirrorLocalTemplateToPlatformCatalog} after
 * local publish (localStorage remains SoT if the API/migration is unavailable).
 *
 * Full DB cutover still requires migration `20261011140000` + private bucket +
 * explicit product approval — do not enable the flag against hosted prod casually.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import type { NexusApiClient } from "@/lib/api";
import {
  isDbCertificateCatalogEnabled,
  mapPlatformDtoToCertificateTemplate,
  type PlatformCertificateTemplateApiDto,
  type CertificateTemplate,
} from "@lumenx/module-certificates";

const BASE = "/api/nexus/certificate-templates";

export async function listNexusPlatformCertificateTemplates(
  status?: "draft" | "active" | "archived",
  client: NexusApiClient = getNexusApiClient(),
): Promise<CertificateTemplate[]> {
  const query = status ? `?status=${status}` : "";
  const rows = await client.get<PlatformCertificateTemplateApiDto[]>(
    `${BASE}${query}`,
  );
  return rows.map(mapPlatformDtoToCertificateTemplate);
}

export async function createNexusPlatformCertificateTemplate(
  input: {
    name: string;
    description?: string | null;
    category?: string | null;
    familyId?: string;
    pptxMeta?: Record<string, unknown>;
  },
  client: NexusApiClient = getNexusApiClient(),
): Promise<PlatformCertificateTemplateApiDto> {
  return client.post<PlatformCertificateTemplateApiDto>(BASE, {
    name: input.name,
    description: input.description ?? null,
    category: input.category ?? null,
    family_id: input.familyId,
    pptx_meta: input.pptxMeta,
  });
}

export async function uploadNexusPlatformCertificateTemplateFile(
  templateId: string,
  file: File,
  client: NexusApiClient = getNexusApiClient(),
): Promise<PlatformCertificateTemplateApiDto> {
  const form = new FormData();
  form.append("file", file);
  return client.postForm<PlatformCertificateTemplateApiDto>(
    `${BASE}/${encodeURIComponent(templateId.trim())}/upload`,
    form,
  );
}

export async function publishNexusPlatformCertificateTemplate(
  templateId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<PlatformCertificateTemplateApiDto> {
  return client.post<PlatformCertificateTemplateApiDto>(
    `${BASE}/${templateId.trim()}/publish`,
    {},
  );
}

export async function archiveNexusPlatformCertificateTemplate(
  templateId: string,
  client: NexusApiClient = getNexusApiClient(),
): Promise<PlatformCertificateTemplateApiDto> {
  return client.post<PlatformCertificateTemplateApiDto>(
    `${BASE}/${templateId.trim()}/archive`,
    {},
  );
}

export async function getNexusPlatformCertificateTemplateSignedUrl(
  templateId: string,
  expiresIn?: number,
  client: NexusApiClient = getNexusApiClient(),
): Promise<{ signedUrl: string; expiresAt: string; templateId: string }> {
  const query =
    expiresIn != null ? `?expires_in=${encodeURIComponent(String(expiresIn))}` : "";
  return client.get<{
    signedUrl: string;
    expiresAt: string;
    templateId: string;
  }>(`${BASE}/${templateId.trim()}/signed-url${query}`);
}

function dataUrlToFile(template: CertificateTemplate): File | null {
  const dataUrl = template.file?.dataUrl?.trim();
  const fileName = template.file?.fileName?.trim() || "template.pptx";
  if (!dataUrl?.startsWith("data:")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma < 0) return null;
  const meta = dataUrl.slice(0, comma);
  const b64 = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:([^;]+)/i.exec(meta);
  const mime =
    mimeMatch?.[1] ||
    "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], fileName, { type: mime });
  } catch {
    return null;
  }
}

export type MirrorLocalTemplateResult =
  | { ok: true; platformId: string }
  | { ok: false; reason: "flag_off" | "no_file" | "api_error"; message?: string };

/**
 * Best-effort dual-write after a localStorage publish.
 * Never throws to callers — localStorage remains the UI SoT on failure.
 * Requires migration + private bucket when the flag is enabled against a real API.
 */
export async function mirrorLocalTemplateToPlatformCatalog(
  template: CertificateTemplate,
  client: NexusApiClient = getNexusApiClient(),
): Promise<MirrorLocalTemplateResult> {
  if (!isDbCertificateCatalogEnabled()) {
    return { ok: false, reason: "flag_off" };
  }
  const file = dataUrlToFile(template);
  if (!file) {
    return { ok: false, reason: "no_file" };
  }
  try {
    const created = await createNexusPlatformCertificateTemplate(
      {
        name: template.name,
        description: template.description || null,
        category: template.categoryId || null,
        pptxMeta: {
          targets: template.targets ?? [],
          mappings: template.mappings ?? [],
          localTemplateId: template.id,
          localFamilyId: template.familyId,
          localVersion: template.version,
        },
      },
      client,
    );
    await uploadNexusPlatformCertificateTemplateFile(created.id, file, client);
    const published = await publishNexusPlatformCertificateTemplate(
      created.id,
      client,
    );
    return { ok: true, platformId: published.id };
  } catch (err) {
    return {
      ok: false,
      reason: "api_error",
      message: err instanceof Error ? err.message : "Platform mirror failed",
    };
  }
}
