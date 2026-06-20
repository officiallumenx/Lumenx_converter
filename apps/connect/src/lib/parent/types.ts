export type ParentSearchResults = {
  modules: { label: string; path: string }[];
  assignments: { id: string; title: string; subject: string }[];
  notifications: { id: string; title: string }[];
  reportCards: { id: string; term: string; percentage: number }[];
  teachers: { id: string; name: string; subject: string }[];
};
