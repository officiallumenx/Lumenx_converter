import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { BirthdayRow } from "@/lib/dashboard";
import { HomePersonAvatar } from "./HomePersonAvatar";
import { Cake } from "lucide-react";

/** Renders only when there is at least one birthday today. */
export function HomeBirthdays({ rows }: { rows: BirthdayRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 5 } as CSSProperties}>
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title flex items-center gap-2">
          <Cake className="size-4 text-primary" aria-hidden />
          Today&apos;s birthdays
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums">{rows.length}</span>
      </div>
      <ul className="lx-home-people-list">
        {rows.map((person) => {
          const kind = person.role === "Student" ? "student" : "teacher";
          const body = (
            <>
              <HomePersonAvatar
                kind={kind}
                personId={person.id}
                name={person.name}
                photoAssetPath={person.photoAssetPath}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground truncate">
                  {person.name}
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {person.role} · {person.detail}
                  {person.turningAge != null ? ` · Turning ${person.turningAge}` : ""}
                </span>
              </span>
            </>
          );

          return (
            <li key={`${person.role}-${person.id}`}>
              {person.role === "Student" ? (
                <Link
                  to="/students/$id"
                  params={{ id: person.id }}
                  className="lx-home-people-row"
                >
                  {body}
                </Link>
              ) : (
                <Link to="/teachers" className="lx-home-people-row">
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
