/**
 * Classes directory API repository — API auth mode only.
 * Loads institute sections with supporting class labels.
 */
import { getAdminApiClient } from "@/lib/admin-api";
import type { AdminApiClient } from "@/lib/api";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import type { ClassDto, ListClassesParams, SectionDto } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Classes API is only available in API auth mode");
  }
}

export { assertApiMode };

function buildQuery(instituteId: string): string {
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  return query.toString();
}

export async function listSections(
  params: ListClassesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SectionDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<SectionDto[]>(`/api/v1/sections?${buildQuery(params.instituteId)}`);
}

export async function listClasses(
  params: ListClassesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ClassDto[]> {
  assertApiMode();
  if (!isInstituteUuid(params.instituteId)) {
    throw new Error("institute_id must be a valid UUID");
  }
  return client.get<ClassDto[]>(`/api/v1/classes?${buildQuery(params.instituteId)}`);
}

export async function getClass(
  classId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<ClassDto> {
  assertApiMode();
  if (!isInstituteUuid(classId)) {
    throw new Error("class_id must be a valid UUID");
  }
  return client.get<ClassDto>(`/api/v1/classes/${classId.trim()}`);
}

export async function getSection(
  sectionId: string,
  client: AdminApiClient = getAdminApiClient(),
): Promise<SectionDto> {
  assertApiMode();
  if (!isInstituteUuid(sectionId)) {
    throw new Error("section_id must be a valid UUID");
  }
  return client.get<SectionDto>(`/api/v1/sections/${sectionId.trim()}`);
}

export async function listClassesCatalog(
  params: ListClassesParams,
  client: AdminApiClient = getAdminApiClient(),
): Promise<{ sections: SectionDto[]; classes: ClassDto[] }> {
  const [sections, classes] = await Promise.all([
    listSections(params, client),
    listClasses(params, client),
  ]);
  return { sections, classes };
}
