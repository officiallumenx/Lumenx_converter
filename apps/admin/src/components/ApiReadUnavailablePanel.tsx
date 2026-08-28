import { Card, EmptyState, Pill } from "@lumenx/ui-admin";
import { ShieldOff } from "lucide-react";

type Props = {
  title: string;
  hint?: string;
  /** Short label for the deferred read API, e.g. "transport trips". */
  domainLabel: string;
};

export function ApiReadUnavailablePanel({
  title,
  hint,
  domainLabel,
}: Props) {
  return (
    <Card>
      <div className="px-4 py-3 sm:px-5">
        <Pill tone="neutral">Read-only · API mode · unavailable</Pill>
      </div>
      <EmptyState
        icon={<ShieldOff className="size-5" />}
        title={title}
        hint={
          hint ??
          `${domainLabel} does not have an institute-scoped read API yet. Demo data is not shown in API mode. Use demo auth mode for the local workflow, or defer this cutover until a backend read endpoint exists.`
        }
      />
    </Card>
  );
}
