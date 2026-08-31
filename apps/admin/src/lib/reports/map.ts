import type { ReportDefinitionDto, ReportJobDto } from "./types";

export function catalogById(
  catalog: ReportDefinitionDto[],
): Map<string, ReportDefinitionDto> {
  return new Map(catalog.map((item) => [item.id, item]));
}

export function listReportModules(catalog: ReportDefinitionDto[]): string[] {
  return [...new Set(catalog.map((item) => item.module))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function filterCatalogByModule(
  catalog: ReportDefinitionDto[],
  module: string,
): ReportDefinitionDto[] {
  if (module === "all") return catalog;
  return catalog.filter((item) => item.module === module);
}

export function resolveReportName(
  reportId: string,
  catalog: ReportDefinitionDto[],
): string {
  return catalogById(catalog).get(reportId)?.name ?? reportId;
}

export function formatReportJobWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function countSupportedReports(catalog: ReportDefinitionDto[]): number {
  return catalog.filter((item) => item.generationSupported !== false).length;
}

export function sortJobsNewestFirst(jobs: ReportJobDto[]): ReportJobDto[] {
  return [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
