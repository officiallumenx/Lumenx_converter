import { sportsSectionsSeed } from "./sections-mock";
import type { SportsProgramSection, SportsProgramSectionInput } from "./sections-types";

let sectionsStore: SportsProgramSection[] = sportsSectionsSeed.map((s) => ({ ...s }));

export function listSectionsFromStore(): SportsProgramSection[] {
  return sectionsStore.map((s) => ({ ...s }));
}

export function createSectionInStore(input: SportsProgramSectionInput): SportsProgramSection {
  const section: SportsProgramSection = {
    id: `sec-${Date.now()}`,
    name: input.name.trim(),
    environment: input.environment,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  sectionsStore = [...sectionsStore, section];
  return { ...section };
}

export function resetSectionsStore() {
  sectionsStore = sportsSectionsSeed.map((s) => ({ ...s }));
}
