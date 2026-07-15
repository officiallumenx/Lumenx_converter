import { Link } from "@tanstack/react-router";
import { Sparkles, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { ACTIVITY_WORKSPACE_BASE } from "@/activity-workspace/core/routes";

const SECTIONS = [
  { name: "Dance", examples: "Groups & teams" },
  { name: "Music / Singing", examples: "Choir & solo groups" },
  { name: "Drama / Skits", examples: "Performance teams" },
  { name: "Art & Craft", examples: "Studio groups" },
];

export function ActivityExtraCurricularPage() {
  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Extra-Curricular"
        subtitle="Create sections (dance, singing, skits…), add teams or groups, assign students, and track performance."
      />

      <p className="text-sm text-muted-foreground">
        Same flow as Sports: <strong>Section</strong> → <strong>Teams / groups</strong> →{" "}
        <strong>Students</strong>, wins & achievements.
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SECTIONS.map((section) => (
          <article
            key={section.name}
            className="flex min-h-[7rem] flex-col rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <Sparkles className="size-5 text-primary" aria-hidden />
            <h3 className="mt-2 font-medium text-sm">{section.name}</h3>
            <p className="mt-1 text-[10px] text-muted-foreground">{section.examples}</p>
            <p className="mt-auto pt-2 text-[10px] text-muted-foreground">Coming next — full ECA builder</p>
          </article>
        ))}
      </div>

      <Link
        to={`${ACTIVITY_WORKSPACE_BASE}/sports`}
        className="activity-section-link inline-flex items-center gap-1 text-sm"
      >
        See Sports module for the live section → team flow <ChevronRight className="size-3" />
      </Link>
    </div>
  );
}
