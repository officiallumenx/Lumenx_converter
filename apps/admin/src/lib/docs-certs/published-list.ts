/**
 * Shared published-list filter/sort helpers for Documents and Certificates.
 */

export type PublishedListItem = {
  id: string;
  studentName: string;
  classSection?: string | null;
  templateId: string | null;
  templateName: string;
  documentNumber: string | null;
  publishedAt: string | null;
  status: string;
};

export type PublishedListSort = "published_desc" | "published_asc" | "student_asc";

export function filterPublishedItems<T extends PublishedListItem>(
  items: T[],
  options: {
    query?: string;
    templateId?: string;
  },
): T[] {
  const q = options.query?.trim().toLowerCase() || "";
  const templateId = options.templateId?.trim() || "";

  return items.filter((item) => {
    if (templateId && (item.templateId ?? "") !== templateId) return false;
    if (!q) return true;
    const hay = [
      item.studentName,
      item.classSection,
      item.templateName,
      item.documentNumber,
      item.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function sortPublishedItems<T extends PublishedListItem>(
  items: T[],
  sort: PublishedListSort = "published_desc",
): T[] {
  const rows = [...items];
  rows.sort((a, b) => {
    if (sort === "student_asc") {
      return a.studentName.localeCompare(b.studentName);
    }
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    if (sort === "published_asc") return aTime - bTime;
    return bTime - aTime;
  });
  return rows;
}

export function templateFilterOptions(
  templates: Array<{ id: string; name: string }>,
): Array<{ id: string; name: string }> {
  return [...templates]
    .map((t) => ({ id: t.id, name: t.name.trim() || "Untitled template" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
