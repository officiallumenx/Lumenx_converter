import { Pill } from "@lumenx/ui-admin";
import type { PortalAccountStatus } from "@lumenx/types";

export type AccStatus = PortalAccountStatus;

export function AccountStatusPill({ status }: { status: AccStatus }) {
  if (status === "active") return <Pill tone="success">Active</Pill>;
  if (status === "pending") return <Pill tone="warning">Pending invite</Pill>;
  if (status === "hold") return <Pill tone="warning">On hold</Pill>;
  return <Pill tone="danger">Suspended</Pill>;
}
