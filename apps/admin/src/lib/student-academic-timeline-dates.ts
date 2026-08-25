import { loadAcademicYears } from "@/lib/academic-management-data";

export function formatTimelineDate(date = new Date()): string {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function activeAcademicYearLabel(): string {
  const years = loadAcademicYears();
  const active = years.find((y) => y.status === "active");
  return active?.label ?? years[0]?.label ?? "2026-2027";
}
