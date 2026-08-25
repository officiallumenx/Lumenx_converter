import { createFileRoute } from "@tanstack/react-router";

import { RolesAccessPage } from "@/components/RolesAccessPage";
import { adminPageTitle } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/permissions")({
  head: () => ({ meta: [{ title: adminPageTitle("/permissions") }] }),
  component: RolesAccessPage,
});
