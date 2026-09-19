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
        <Pill tone="neutral">Unavailable</Pill>
      </div>
      <EmptyState
        icon={<ShieldOff className="size-5" />}
        title={title}
        hint={
          hint ??
          `${domainLabel} is not available for this institute yet. Check back after the backend endpoint is enabled.`
        }
      />
    </Card>
  );
}
