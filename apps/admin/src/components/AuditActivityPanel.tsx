import { useEffect, useMemo, useRef, useState } from "react";
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
  type AuditEntry,
  type AuditModule,
  type AuditStatus,
} from "@/lib/audit-activity-data";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import {
  loadInstituteAuditList,
  resolveAuditListView,
  shouldCommitAuditLoad,
  type AuditListStatus,
} from "@/lib/audit";

function statusTone(s: AuditStatus): "success" | "warning" | "info" | "danger" {
  if (s === "success") return "success";
  if (s === "warning") return "warning";
  if (s === "error") return "danger";
  return "info";
}

export function AuditActivityPanel({ id }: { id?: string }) {
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();

  const [q, setQ] = useState("");
  const [module, setModule] = useState<AuditModule | "all">("all");
  const [status, setStatus] = useState<AuditStatus | "all">("all");

  const [items, setItems] = useState<AuditEntry[]>(() =>
    apiMode ? [] : getAuditLog(),
  );
  const [listStatus, setListStatus] = useState<AuditListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveAuditListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: items,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems = listView.items;
  const displayStatus = listView.status;
  const displayError = listView.errorMessage;

  useEffect(() => {
    if (!apiMode) {
      setItems(getAuditLog());
      setListStatus("demo");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "loading") {
      setItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setListStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadInstituteAuditList(requestInstituteId).then((next) => {
      if (
        !shouldCommitAuditLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
  ]);

  const filtered = useMemo(
    () => filterAuditLog(displayItems, q, module, status),
    [displayItems, q, module, status],
  );

  const hint =
    displayStatus === "loading"
      ? "Loading audit log…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load the audit log"
        : displayStatus === "forbidden"
          ? "You do not have access to the audit log for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load audit log"
            : displayStatus === "empty"
              ? "No audit events yet"
              : "Admin changes only · private chats are never logged";

  const showTable =
    displayStatus === "ready" ||
    displayStatus === "demo" ||
    (displayStatus === "empty" && filtered.length === 0);

  return (
    <Card id={id}>
      <CardHeader title="Audit log" hint={hint} />
      <PageToolbar>
        <SearchInput
          placeholder="Search user, action, target…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 min-w-[200px] max-w-md"
          disabled={apiMode && displayStatus !== "ready" && displayStatus !== "empty"}
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
        <ToolbarMeta>
          {displayStatus === "loading"
            ? "…"
            : `${filtered.length} events`}
        </ToolbarMeta>
      </PageToolbar>
      {displayStatus === "loading" ? (
        <CardBody>
          <p className="text-sm text-muted-foreground text-center py-6">
            Loading…
          </p>
        </CardBody>
      ) : displayStatus === "needs_institute" ||
        displayStatus === "forbidden" ||
        displayStatus === "error" ? (
        <CardBody>
          <p className="text-sm text-muted-foreground text-center py-6">{hint}</p>
        </CardBody>
      ) : (
        <>
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
                  <Td className="max-w-[220px] truncate text-muted-foreground">
                    {e.target}
                  </Td>
                  <Td>{e.module}</Td>
                  <Td>
                    <Pill tone={statusTone(e.status)}>{e.status}</Pill>
                  </Td>
                  <Td mono>{e.at}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
          {showTable && filtered.length === 0 && (
            <CardBody>
              <p className="text-sm text-muted-foreground text-center py-6">
                {displayStatus === "empty"
                  ? "No audit events yet"
                  : "No activity matches your filters."}
              </p>
            </CardBody>
          )}
        </>
      )}
    </Card>
  );
}
