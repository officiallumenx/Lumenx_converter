import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  PageToolbar,
  Pill,
  SearchInput,
  Td,
  Th,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { Users } from "lucide-react";
import type { TransportEnrollmentListItem } from "@/lib/transport";

type Props = {
  items: TransportEnrollmentListItem[];
  listBlocked?: boolean;
  listHint?: string | null;
};

function statusTone(
  status: TransportEnrollmentListItem["status"],
): "success" | "warning" | "neutral" {
  if (status === "active") return "success";
  if (status === "inactive") return "warning";
  return "neutral";
}

export function TransportEnrollmentsApiView({
  items,
  listBlocked = false,
  listHint = null,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const rows = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (row) =>
        row.studentName.toLowerCase().includes(needle) ||
        row.studentClass.toLowerCase().includes(needle) ||
        row.routeName.toLowerCase().includes(needle) ||
        row.pickupStopName.toLowerCase().includes(needle) ||
        row.dropStopName.toLowerCase().includes(needle),
    );
  }, [items, searchQuery]);

  return (
    <div className="space-y-4">
      <PageToolbar>
        <SearchInput
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search student, route, or stop…"
          className="w-full max-w-xs"
        />
        <ToolbarSpacer />
        <Pill tone="neutral">Read-only · API mode</Pill>
      </PageToolbar>

      <Card>
        <CardHeader
          title="Transport enrollments"
          hint={
            listBlocked
              ? listHint ?? "Loading enrollments…"
              : `${rows.length} student route assignments`
          }
        />
        {listBlocked ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading…"}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 pb-8">
            <EmptyState
              icon={<Users className="size-5" />}
              title="No transport enrollments"
              hint={listHint ?? "When students are assigned to routes, they appear here."}
            />
          </div>
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Route</Th>
                <Th>Pickup</Th>
                <Th>Drop</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td className="font-medium">{row.studentName}</Td>
                  <Td>{row.studentClass}</Td>
                  <Td>{row.routeName}</Td>
                  <Td className="text-xs text-muted-foreground">{row.pickupStopName}</Td>
                  <Td className="text-xs text-muted-foreground">{row.dropStopName}</Td>
                  <Td>
                    <Pill tone={statusTone(row.status)}>{row.status}</Pill>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        )}
      </Card>
    </div>
  );
}
