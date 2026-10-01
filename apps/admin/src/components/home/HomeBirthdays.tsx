import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { BirthdayRow } from "@/lib/dashboard";
import { HomePersonAvatar } from "./HomePersonAvatar";
import { Cake, ChevronRight } from "lucide-react";

/** Renders only when there is at least one birthday today. */
export function HomeBirthdays({ rows }: { rows: BirthdayRow[] }) {
  if (rows.length === 0) return null;

  return (
    <section className="lx-home-section lx-home-birthdays" style={{ "--lx-home-i": 5 } as CSSProperties}>
      <div className="lx-home-birthdays__head">
        <div className="lx-home-birthdays__title-row">
          <span className="lx-home-birthdays__icon" aria-hidden>
            <Cake className="size-3.5" />
          </span>
          <h2 className="lx-home-panel__title">Today&apos;s Birthdays</h2>
          <span className="lx-home-birthdays__count">{rows.length}</span>
        </div>
        <ChevronRight className="size-4 text-muted-foreground shrink-0" aria-hidden />
      </div>
      <ul className="lx-home-birthdays__scroller">
        {rows.map((person) => {
          const kind = person.role === "Student" ? "student" : "teacher";
          const body = (
            <>
              <span className="lx-home-birthdays__avatar-wrap">
                <HomePersonAvatar
                  kind={kind}
                  personId={person.id}
                  name={person.name}
                  photoAssetPath={person.photoAssetPath}
                />
                <span className="lx-home-birthdays__cake" aria-hidden>
                  <Cake className="size-2.5" />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground truncate">
                  {person.name}
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {person.role}
                  {person.detail ? ` · ${person.detail}` : ""}
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
                  className="lx-home-birthdays__row"
                >
                  {body}
                </Link>
              ) : (
                <Link to="/teachers" className="lx-home-birthdays__row">
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
