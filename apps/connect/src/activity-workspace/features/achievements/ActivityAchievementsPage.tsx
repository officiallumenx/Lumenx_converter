import { useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";

export function ActivityAchievementsPage() {
  const [filter, setFilter] = useState<"sports" | "eca">("sports");

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Achievements"
        subtitle="View team and group achievements — filter by Sports or Extra-Curricular."
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("sports")}
          className={filter === "sports" ? "activity-filter-chip is-active" : "activity-filter-chip"}
        >
          Sports
        </button>
        <button
          type="button"
          onClick={() => setFilter("eca")}
          className={filter === "eca" ? "activity-filter-chip is-active" : "activity-filter-chip"}
        >
          Extra-Curricular
        </button>
      </div>

      <ul className="space-y-2">
        {(filter === "sports"
          ? [
              { team: "Cricket Team 1", title: "District semi-finalists", section: "Cricket" },
              { team: "Kabaddi Team 1", title: "Inter-house winners", section: "Kabaddi" },
            ]
          : [
              { team: "Dance Team", title: "Annual day best performance", section: "Dance" },
              { team: "Music Group", title: "State youth festival — silver", section: "Music" },
            ]
        ).map((item) => (
          <li
            key={item.team}
            className="activity-list-row rounded-2xl border border-border bg-card p-4 text-sm shadow-soft"
          >
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.section} · {item.team}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
