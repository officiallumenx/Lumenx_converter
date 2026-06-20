import { buildParentPortalSnapshot } from "@/lib/parent-portal-data";
import { teachers } from "@/lib/mock-data";
import { getParentNav } from "./nav";
import type { ParentSearchResults } from "./types";

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const parentRepository = {
  async search(
    instituteId: string | null,
    childId: string,
    studentIncludedMode: boolean,
    query: string,
  ): Promise<ParentSearchResults> {
    await delay();
    const snap = buildParentPortalSnapshot(instituteId, childId);
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        modules: [],
        assignments: [],
        notifications: [],
        reportCards: [],
        teachers: [],
      };
    }

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

    const teacherMatches = teachers
      .filter((t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q))
      .map((t) => ({ id: t.id, name: t.name, subject: t.subject }));

    return { modules, assignments, notifications, reportCards, teachers: teacherMatches };
  },
};
