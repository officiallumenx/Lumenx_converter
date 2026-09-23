import { createFileRoute, redirect } from "@tanstack/react-router";
import { isModuleCategoryId } from "@/content/module-categories";
import type { ModuleSectionId } from "@/content/modules";

/** Old category URLs redirect into the single modules directory. */
const CATEGORY_TO_SECTION: Partial<Record<string, ModuleSectionId>> = {
  transport: "transport",
  admissions: "admissions",
  academics: "admin",
  administration: "admin",
  finance: "admin",
  communication: "admin",
  documents: "admin",
  growth: "admin",
};

export const Route = createFileRoute("/modules/$category")({
  beforeLoad: ({ params }) => {
    const section =
      isModuleCategoryId(params.category) && CATEGORY_TO_SECTION[params.category]
        ? CATEGORY_TO_SECTION[params.category]
        : undefined;
    throw redirect({
      to: "/modules",
      search: section ? { section } : {},
      replace: true,
    });
  },
  component: () => null,
});
