import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Pill,
  Th,
  Td,
  Tr,
} from "@lumenx/ui-admin";
import {
  loadRolesCatalog,
  resolveRolesCatalogView,
  type RoleCatalogItem,
} from "@/lib/identity";
import { ShieldCheck } from "lucide-react";

export function RolesCatalogApiPanel() {
  const [items, setItems] = useState<RoleCatalogItem[]>([]);
  const [status, setStatus] = useState<
    "loading" | "ready" | "empty" | "forbidden" | "error" | "demo"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadRolesCatalog().then((next) => {
      if (cancelled) return;
      setItems(next.items);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const view = resolveRolesCatalogView({
    apiMode: true,
    storedItems: items,
    storedStatus: status,
    storedErrorMessage: errorMessage,
  });

  const hint =
    view.status === "loading"
      ? "Loading roles catalog…"
      : view.status === "forbidden"
        ? view.errorMessage ?? "Access denied."
        : view.status === "error"
          ? view.errorMessage ?? "Failed to load roles."
          : view.status === "empty"
            ? "No roles returned from the backend catalog."
            : null;

  return (
    <Card>
      <CardHeader
        title="Backend roles catalog"
        hint="From GET /roles · assign institute roles on memberships below"
        action={<Pill tone="neutral">Read-only · API mode</Pill>}
      />
      {hint ? (
        <EmptyState icon={<ShieldCheck className="size-5" />} title="Roles catalog" hint={hint} />
      ) : (
        <DataTable>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Label</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody>
            {view.items.map((row) => (
              <Tr key={row.code}>
                <Td mono>{row.code}</Td>
                <Td>{row.label}</Td>
                <Td>{row.description ?? "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </Card>
  );
}
