import { Link } from "@tanstack/react-router";
import { Cake, MessageCircle, PhoneOff } from "lucide-react";
import { useMemo, useSyncExternalStore } from "react";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { IconChip } from "@/components/IconChip";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { adminDataFacade } from "@/lib/admin-data-facade";
import { subscribeTeacherDirectory, loadTeacherDirectory } from "@/lib/career-to-teacher";
import {
  loadBirthdayBoard,
  loadWishedBirthdayIds,
  openBirthdayWhatsApp,
  subscribeBirthdayWishes,
  whatsAppRecipientId,
  type BirthdayPerson,
} from "@/lib/birthday-workflow";

function BirthdayRow({
  person,
  wished,
  instituteName,
}: {
  person: BirthdayPerson;
  wished: boolean;
  instituteName: string;
}) {
  const canWish = Boolean(whatsAppRecipientId(person.phone));
  const nameClass = wished
    ? "block text-sm font-normal text-muted-foreground"
    : "block text-sm font-semibold text-foreground";
  const detailClass = wished
    ? "block text-[11px] text-muted-foreground/80"
    : "block text-[11px] text-muted-foreground";

  return (
    <li
      className={`flex items-center gap-2.5 px-2.5 py-2 ${wished ? "opacity-90" : ""}`}
      aria-label={wished ? `${person.name} — wished` : `${person.name} — not wished yet`}
    >
      <IconChip icon={Cake} size="sm" variant={wished ? "soft" : "brand"} />
      <span className="min-w-0 flex-1">
        {person.href ? (
          person.role === "Teacher" ? (
            <Link to="/teachers" className={`${nameClass} hover:underline`}>
              {person.name}
            </Link>
          ) : (
            <Link
              to="/students/$id"
              params={{ id: person.id }}
              className={`${nameClass} hover:underline`}
            >
              {person.name}
            </Link>
          )
        ) : (
          <span className={nameClass}>{person.name}</span>
        )}
        <span className={detailClass}>
          {person.role} · {person.detail} · Turning {person.turningAge}
        </span>
      </span>
      {canWish ? (
        <Button
          size="sm"
          variant={wished ? "outline" : "default"}
          className="gap-1.5 shrink-0"
          onClick={() => openBirthdayWhatsApp(person, instituteName)}
        >
          <MessageCircle className="size-3.5" />
          {wished ? "Wished" : "Wish"}
        </Button>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
          <PhoneOff className="size-3.5" />
          No phone
        </span>
      )}
    </li>
  );
}

export function HomeBirthdaysCard() {
  const { instituteSummary } = useDemoProfile();
  const wishCount = useSyncExternalStore(
    subscribeBirthdayWishes,
    () => loadWishedBirthdayIds().size,
    () => 0,
  );
  const directoryStamp = useSyncExternalStore(
    adminDataFacade.students.channel.subscribe,
    () =>
      adminDataFacade.students
        .listDirectory()
        .map((row) => `${row.id}:${row.dateOfBirth ?? ""}:${row.parentPhone}`)
        .join("|"),
    () => "",
  );
  const teacherStamp = useSyncExternalStore(
    subscribeTeacherDirectory,
    () =>
      loadTeacherDirectory()
        .map((row) => `${row.id}:${row.dateOfBirth ?? ""}:${row.phone}`)
        .join("|"),
    () => "",
  );
  const board = useMemo(() => loadBirthdayBoard(), [wishCount, directoryStamp, teacherStamp]);
  const wishedIds = useMemo(() => loadWishedBirthdayIds(), [wishCount]);
  const todayRows = useMemo(() => {
    const unwished = board.today.filter((person) => !wishedIds.has(person.id));
    const wished = board.today.filter((person) => wishedIds.has(person.id));
    return [...unwished, ...wished];
  }, [board.today, wishedIds]);
  const remaining = todayRows.filter((person) => !wishedIds.has(person.id)).length;

  return (
    <Card>
      <CardHeader
        title="Today's Birthdays"
        hint="Wish opens WhatsApp — wished names appear gray"
        action={
          <Pill tone={board.today.length ? (remaining ? "warning" : "success") : "neutral"}>
            {board.today.length === 0
              ? "None today"
              : remaining
                ? `${remaining} to wish`
                : "All wished"}
          </Pill>
        }
      />
      <div className="px-3 pb-3">
        {todayRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No birthdays today.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {todayRows.map((person) => (
              <BirthdayRow
                key={person.id}
                person={person}
                wished={wishedIds.has(person.id)}
                instituteName={instituteSummary.name}
              />
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
