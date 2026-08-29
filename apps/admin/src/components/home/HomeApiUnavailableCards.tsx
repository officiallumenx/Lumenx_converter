import { Card, EmptyState } from "@lumenx/ui-admin";
import { BookMarked, Cake } from "lucide-react";

export function HomeApiUnavailableCard({
  title,
  domainLabel,
}: {
  title: string;
  domainLabel: string;
}) {
  return (
    <Card>
      <EmptyState
        icon={<BookMarked className="size-5" />}
        title={title}
        hint={`${domainLabel} has no institute-scoped read API. Demo data is not shown in API mode.`}
      />
    </Card>
  );
}

export function HomeBirthdaysApiUnavailableCard() {
  return (
    <Card>
      <EmptyState
        icon={<Cake className="size-5" />}
        title="Today's birthdays"
        hint="Birthday roster has no institute-scoped read API. Demo data is not shown in API mode."
      />
    </Card>
  );
}
