import type { CSSProperties } from "react";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { BirthdayRow } from "@/lib/dashboard";
import { resolveBirthdayWishPhone } from "@/lib/dashboard/resolve-birthday-phone";
import {
  loadWishedBirthdayIds,
  openBirthdayWhatsAppCompose,
  subscribeBirthdayWishes,
  whatsAppRecipientId,
} from "@/lib/birthday-workflow";
import { useAdminToast } from "@/components/AdminActionToast";
import { HomePersonAvatar } from "./HomePersonAvatar";
import { Cake, ChevronRight, MessageCircle } from "lucide-react";

type HomeBirthdaysStatus =
  | "ready"
  | "empty"
  | "error"
  | "needs_institute"
  | "demo"
  | undefined;

/** Stable snapshot for useSyncExternalStore (must be Object.is-equal when unchanged). */
function wishedBirthdaySnapshot(): string {
  return [...loadWishedBirthdayIds()].sort().join("|");
}

/** Today's student/teacher birthdays (month + day match; year ignored). */
export function HomeBirthdays({
  rows,
  loading = false,
  status,
  errorMessage = null,
  warningMessage = null,
  instituteName = "our school",
  principalName = null,
}: {
  rows: BirthdayRow[];
  loading?: boolean;
  status?: HomeBirthdaysStatus;
  errorMessage?: string | null;
  warningMessage?: string | null;
  instituteName?: string | null;
  principalName?: string | null;
}) {
  const notify = useAdminToast();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const wishedSnapshot = useSyncExternalStore(
    subscribeBirthdayWishes,
    wishedBirthdaySnapshot,
    () => "",
  );
  const wishedIds = useMemo(
    () => new Set(wishedSnapshot ? wishedSnapshot.split("|") : []),
    [wishedSnapshot],
  );
  const school = instituteName?.trim() || "our school";
  const principal = principalName?.trim() || "Principal";

  const wishOnWhatsApp = async (person: BirthdayRow) => {
    if (openingId) return;
    setOpeningId(person.id);
    try {
      const phone = await resolveBirthdayWishPhone(person);
      const opened = openBirthdayWhatsAppCompose(
        {
          id: person.id,
          name: person.name,
          role: person.role,
          phone: phone ?? "",
        },
        { instituteName: school, principalName: principal },
      );
      if (!opened) {
        notify(
          person.role === "Student"
            ? `No linked parent phone for ${person.name}`
            : `No phone number on file for ${person.name}`,
        );
      }
    } finally {
      setOpeningId(null);
    }
  };

  if (loading && rows.length === 0 && status !== "error") {
    return (
      <section
        className="lx-home-section lx-home-birthdays"
        style={{ "--lx-home-i": 4 } as CSSProperties}
      >
        <div className="lx-home-birthdays__head">
          <div className="lx-home-birthdays__title-row">
            <span className="lx-home-birthdays__icon" aria-hidden>
              <Cake className="size-3.5" />
            </span>
            <div className="min-w-0">
              <h2 className="lx-home-panel__title">Today&apos;s Birthdays</h2>
              <p className="lx-home-panel__hint mt-0.5">Checking student and teacher birthdays…</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-12 rounded-xl" />
          <div className="skeleton h-12 rounded-xl" />
        </div>
      </section>
    );
  }

  const isError = status === "error";
  const isEmpty = !isError && rows.length === 0;

  return (
    <section
      className={`lx-home-section lx-home-birthdays${isEmpty && !isError ? " lx-home-birthdays--empty" : ""}`}
      style={{ "--lx-home-i": 4 } as CSSProperties}
    >
      <div className="lx-home-birthdays__head">
        <div className="lx-home-birthdays__title-row">
          <span className="lx-home-birthdays__icon" aria-hidden>
            <Cake className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="lx-home-panel__title">Today&apos;s Birthdays</h2>
              {rows.length > 0 ? (
                <span className="lx-home-birthdays__count">{rows.length}</span>
              ) : null}
            </div>
            <p className="lx-home-panel__hint mt-0.5">
              {isError
                ? "Could not load today's birthdays"
                : isEmpty
                  ? "No one's birthday today"
                  : "Tap a name to wish on WhatsApp"}
            </p>
          </div>
        </div>
        {rows.length > 0 ? (
          <ChevronRight className="size-4 text-muted-foreground shrink-0" aria-hidden />
        ) : null}
      </div>

      {isError ? (
        <p className="text-sm text-destructive px-0.5" role="alert">
          {/too many requests|rate.?limit/i.test(errorMessage ?? "")
            ? "Home is loading too many lists at once. Wait a moment and refresh."
            : errorMessage?.trim() ||
              "Failed to load birthdays. Try refreshing Home."}
        </p>
      ) : null}

      {!isError && warningMessage?.trim() ? (
        <p className="text-xs text-amber-700 dark:text-amber-400 px-0.5 mb-2" role="status">
          {warningMessage.trim()}
        </p>
      ) : null}

      {isEmpty && !isError ? (
        <div className="lx-home-birthdays__empty" role="status">
          <span className="lx-home-birthdays__empty-icon" aria-hidden>
            <Cake className="size-5" />
          </span>
          <p className="lx-home-birthdays__empty-title">No one&apos;s birthday today</p>
          <p className="lx-home-birthdays__empty-hint">
            Celebrate here when a student or teacher has a birthday.
          </p>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <ul className="lx-home-birthdays__scroller">
          {rows.map((person) => {
            const kind = person.role === "Student" ? "student" : "teacher";
            const wished = wishedIds.has(person.id);
            const hasPhone = Boolean(whatsAppRecipientId(person.phone ?? ""));
            const busy = openingId === person.id;

            return (
              <li key={`${person.role}-${person.id}`}>
                <button
                  type="button"
                  className={`lx-home-birthdays__row w-full text-left ${wished ? "opacity-80" : ""}`}
                  disabled={Boolean(openingId)}
                  onClick={() => void wishOnWhatsApp(person)}
                  aria-label={
                    wished
                      ? `Wish ${person.name} again on WhatsApp`
                      : `Wish ${person.name} happy birthday on WhatsApp`
                  }
                >
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
                    <span
                      className={`block text-sm truncate ${
                        wished
                          ? "font-normal text-muted-foreground"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      {person.name}
                    </span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {person.detail ? `${person.detail} · ` : ""}
                      {person.role}
                      {person.turningAge != null ? ` · Turning ${person.turningAge}` : ""}
                      {busy
                        ? " · Opening…"
                        : wished
                          ? " · Wished"
                          : hasPhone
                            ? ""
                            : person.role === "Student"
                              ? " · Parent phone"
                              : " · Needs phone"}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted-foreground" aria-hidden>
                    <MessageCircle className="size-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
