import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  EmptyState,
  Field,
  Modal,
  Pill,
  Select,
  TextInput,
  Th,
  Td,
  Tr,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { createAttendanceConfig, loadAttendanceConfigList } from "@/lib/attendance";
import {
  resolveAttendanceConfigView,
  shouldCommitAttendanceConfigLoad,
} from "@/lib/attendance/config-view";
import type {
  AttendanceConfigDto,
  AttendanceConfigScope,
  AttendanceMethod,
  AttendanceOwner,
} from "@/lib/attendance/types";
import type { AttendanceConfigLoadStatus } from "@/lib/attendance/config-load";
import { ClipboardCheck, Plus } from "lucide-react";

function listHint(status: AttendanceConfigLoadStatus, error: string | null): string {
  if (status === "loading") return "Loading attendance configuration…";
  if (status === "needs_institute") return "Select an institute.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load attendance configuration.";
  if (status === "empty") return "No attendance configuration versions found.";
  return "";
}

const METHOD_OPTIONS: AttendanceMethod[] = [
  "daily",
  "morning_first_period",
  "morning_afternoon",
  "period_wise",
];

const OWNER_OPTIONS: AttendanceOwner[] = [
  "class_teacher",
  "current_period_teacher",
  "attendance_incharge",
];

const SCOPE_OPTIONS: AttendanceConfigScope[] = ["institute", "class", "section"];

export function AttendanceConfigApiPanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [items, setItems] = useState<AttendanceConfigDto[]>([]);
  const [loadStatus, setLoadStatus] = useState<AttendanceConfigLoadStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [effectiveFrom, setEffectiveFrom] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [method, setMethod] = useState<AttendanceMethod>("daily");
  const [owner, setOwner] = useState<AttendanceOwner>("class_teacher");
  const [scope, setScope] = useState<AttendanceConfigScope>("institute");
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setItems([]);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setItems([]);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setItems([]);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadAttendanceConfigList(requestInstituteId).then((next) => {
      if (
        !shouldCommitAttendanceConfigLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setItems(next.items);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const view = resolveAttendanceConfigView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: items,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = listHint(view.status, view.errorMessage);
  const displayItems = view.rowsValid ? view.items : [];

  const createConfig = () => {
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute first");
      return;
    }
    if (!effectiveFrom) {
      notify("Effective from date is required");
      return;
    }
    setCreating(true);
    void createAttendanceConfig({
      instituteId,
      effectiveFrom,
      method,
      owner,
      scope,
    })
      .then(() => {
        setCreateOpen(false);
        setReloadKey((k) => k + 1);
        notify("Attendance configuration created");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create config");
      })
      .finally(() => {
        setCreating(false);
      });
  };

  return (
    <>
      <Card>
        <CardHeader
          title="Attendance configuration"
          hint="From GET /attendance/config · create via POST /attendance/config"
          action={
            writesEnabled ? (
              <Button size="sm" variant="primary" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" /> New config
              </Button>
            ) : undefined
          }
        />
        {hint && view.status !== "ready" ? (
          <EmptyState
            icon={<ClipboardCheck className="size-5" />}
            title="Attendance config"
            hint={hint}
          />
        ) : (
          <DataTable>
            <thead>
              <tr>
                <Th>Effective from</Th>
                <Th>Method</Th>
                <Th>Owner</Th>
                <Th>Scope</Th>
                <Th>Classes</Th>
              </tr>
            </thead>
            <tbody>
              {displayItems.length === 0 ? (
                <tr>
                  <Td>
                    <p className="py-6 text-center text-sm text-muted-foreground">No config rows.</p>
                  </Td>
                </tr>
              ) : (
                displayItems.map((row) => (
                  <Tr key={row.id}>
                    <Td mono>{row.effectiveFrom}</Td>
                    <Td>{row.method.replace(/_/g, " ")}</Td>
                    <Td>{row.owner.replace(/_/g, " ")}</Td>
                    <Td>{row.scope}</Td>
                    <Td>{row.classCodes.join(", ") || "—"}</Td>
                  </Tr>
                ))
              )}
            </tbody>
          </DataTable>
        )}
      </Card>

      <Modal
        open={writesEnabled && createOpen}
        onClose={() => setCreateOpen(false)}
        title="New attendance configuration"
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createConfig} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Effective from" required>
            <TextInput
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </Field>
          <Field label="Scope" required>
            <Select
              value={scope}
              onChange={(e) => setScope(e.target.value as AttendanceConfigScope)}
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Method" required>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value as AttendanceMethod)}
            >
              {METHOD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Owner" required>
            <Select
              value={owner}
              onChange={(e) => setOwner(e.target.value as AttendanceOwner)}
            >
              {OWNER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Pill tone="neutral">Creates a new config version for the active institute</Pill>
          </div>
        </div>
      </Modal>
    </>
  );
}
