import { getNexusApiClient } from "@/lib/nexus-api";

export type CreateInstituteApiInput = {
  code: string;
  name: string;
  kind: "school" | "college" | "university" | "training_center" | "other";
  timezone?: string;
  locale?: string;
};

export type InstituteApiDto = {
  id: string;
  code: string;
  name: string;
  kind: string;
  status: string;
};

/**
 * Platform-operator create via identity API. Seeds trial subscription server-side.
 */
export async function createInstituteViaApi(
  input: CreateInstituteApiInput,
): Promise<InstituteApiDto> {
  const client = getNexusApiClient();
  return client.post<InstituteApiDto>("/api/v1/institutes", {
    code: input.code.trim(),
    name: input.name.trim(),
    kind: input.kind,
    timezone: input.timezone,
    locale: input.locale,
  });
}

export function slugifyInstituteCode(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 24);
  return base || `INST${Date.now().toString(36).toUpperCase()}`;
}
