import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  DataTable,
  Th,
  Td,
  Tr,
  Pill,
  SearchInput,
  SegmentedControl,
  PageToolbar,
  ToolbarMeta,
} from "@lumenx/ui-admin";
import {
  AUDIT_MODULES,
  filterAuditLog,
  getAuditLog,
  type AuditModule,
  type AuditStatus,
} from "@/lib/audit-activity-data";

function statusTone(s: AuditStatus): "success" | "warning" | "info" | "danger" {
  if (s === "success") return "success";
  if (s === "warning") return "warning";
  if (s === "error") return "danger";
  return "info";
}

export function AuditActivityPanel({ id }: { id?: string }) {
  const [q, setQ] = useState("");
  const [module, setModule] = useState<AuditModule | "all">("all");
  const [status, setStatus] = useState<AuditStatus | "all">("all");
  const entries = useMemo(() => getAuditLog(), []);
  const filtered = useMemo(
    () => filterAuditLog(entries, q, module, status),
    [entries, q, module, status],
  );

  return (
    <Card id={id}>
      <CardHeader
        title="Audit log"
        hint="Admin changes only · private chats are never logged"
      />
      <PageToolbar>
        <SearchInput
          placeholder="Search user, action, target…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md"
        />
        <SegmentedControl
          value={module}
          onChange={setModule}
          options={[
            { value: "all", label: "All modules" },
            ...AUDIT_MODULES.map((m) => ({ value: m, label: m })),
          ]}
        />
        <SegmentedControl
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All status" },
            { value: "success", label: "Success" },
            { value: "info", label: "Info" },
            { value: "warning", label: "Warning" },
            { value: "error", label: "Error" },
          ]}
        />
        <ToolbarMeta>{filtered.length} events</ToolbarMeta>
      </PageToolbar>
      <DataTable>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Action</Th>
            <Th>Target</Th>
            <Th>Module</Th>
            <Th>Status</Th>
            <Th>When</Th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <Tr key={e.id}>
              <Td>
                <div className="font-medium">{e.user}</div>
                <div className="text-[10px] text-muted-foreground">{e.role}</div>
              </Td>
              <Td>{e.action}</Td>
              <Td className="max-w-[220px] truncate text-muted-foreground">{e.target}</Td>
              <Td>{e.module}</Td>
              <Td>
                <Pill tone={statusTone(e.status)}>{e.status}</Pill>
              </Td>
              <Td mono>{e.at}</Td>
            </Tr>
          ))}
        </tbody>
      </DataTable>
      {filtered.length === 0 && (
        <CardBody>
          <p className="text-sm text-muted-foreground text-center py-6">No activity matches your filters.</p>
        </CardBody>
      )}
    </Card>
  );
}
