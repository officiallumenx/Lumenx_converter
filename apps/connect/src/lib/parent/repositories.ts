import { isApiAuthMode } from "@/auth/auth-mode";
import { fetchParentPortalSnapshot } from "@/api/parent-portal";
import { getParentNav } from "./nav";
import type { ParentSearchResults } from "./types";

const empty: ParentSearchResults = {
  modules: [],
  assignments: [],
  notifications: [],
  reportCards: [],
  teachers: [],
};

export const parentRepository = {
  async search(
    instituteId: string | null,
    childId: string,
    studentIncludedMode: boolean,
    query: string,
  ): Promise<ParentSearchResults> {
    if (!instituteId) return empty;
    const q = query.trim().toLowerCase();
    if (!q) return empty;

    if (!isApiAuthMode()) return empty;

    try {
      const snap = await fetchParentPortalSnapshot(instituteId, childId);
      const modules = getParentNav(studentIncludedMode)
        .filter((n) => n.label.toLowerCase().includes(q))
        .map((n) => ({ label: n.label, path: n.to }));

      const assignments = snap.assignments
        .filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.subject.toLowerCase().includes(q) ||
            a.class.toLowerCase().includes(q),
        )
        .map((a) => ({ id: a.id, title: a.title, subject: a.subject }));

      const notifications = snap.notifications
        .filter((n) => n.title.toLowerCase().includes(q) || n.desc.toLowerCase().includes(q))
        .map((n) => ({ id: n.id, title: n.title }));

      const reportCards = snap.reportCards
        .filter((r) => r.term.toLowerCase().includes(q))
        .map((r) => ({ id: r.id, term: r.term, percentage: r.percentage }));

      return {
        modules,
        assignments,
        notifications,
        reportCards,
        teachers: [],
      };
    } catch {
      return empty;
    }
  },
};
