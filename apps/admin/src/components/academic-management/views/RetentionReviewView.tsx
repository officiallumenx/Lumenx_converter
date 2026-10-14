import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Field,
  FormGrid,
  PageStack,
  Pill,
  Select,
  Td,
  TextInput,
  Th,
  Tr,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { isApiAuthMode } from "@/auth/auth-mode";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  decideRetentionReview,
  listRetentionReviews,
  type RetentionReviewDto,
} from "@/lib/retention/api";

function statusTone(
  status: string,
): "success" | "info" | "warning" | "danger" | "neutral" {
  if (status === "review_eligible") return "warning";
  if (status === "legal_hold") return "danger";
  if (status === "deletion_approved") return "info";
  if (status === "active_retention" || status === "extended") return "success";
  return "neutral";
}

export function RetentionReviewView() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const [rows, setRows] = useState<RetentionReviewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [decision, setDecision] = useState("retain");
  const [reason, setReason] = useState("");
  const [extendedUntil, setExtendedUntil] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => {
    if (!isApiAuthMode() || !instituteCtx.activeInstituteId) return;
    setLoading(true);
    void listRetentionReviews(
      instituteCtx.activeInstituteId,
      statusFilter === "all" ? undefined : statusFilter,
    )
      .then((data) => {
        setRows(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load retention reviews");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteCtx.activeInstituteId, statusFilter]);

  if (!isApiAuthMode()) {
    return (
      <PageStack>
        <Card>
          <CardBody className="py-8 text-sm text-muted-foreground">
            Retention review requires API mode. Demo graduation lists are illustrative only
            and do not drive deletion.
          </CardBody>
        </Card>
      </PageStack>
    );
  }

  const runDecision = async () => {
    if (!selectedId) {
      notify("Select a retention review row");
      return;
    }
    if (reason.trim().length < 3) {
      notify("Provide a decision reason");
      return;
    }
    setBusy(true);
    try {
      await decideRetentionReview(selectedId, {
        decision,
        reason: reason.trim(),
        extendedUntil: decision === "extend" ? extendedUntil || null : null,
      });
      notify("Retention decision recorded");
      setReason("");
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Five-year retention review"
          hint="Eligibility is five calendar years after the graduation date. Expiry means review — never automatic permanent deletion."
        />
        <CardBody className="space-y-4">
          <FormGrid cols={2}>
            <Field label="Status filter">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="pending_graduation_date">Pending graduation date</option>
                <option value="active_retention">Active retention</option>
                <option value="review_eligible">Review eligible</option>
                <option value="extended">Extended</option>
                <option value="legal_hold">Legal hold</option>
                <option value="deletion_approved">Deletion approved</option>
              </Select>
            </Field>
          </FormGrid>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No retention reviews yet.</p>
          ) : (
            <DataTable>
              <thead>
                <Tr>
                  <Th>{""}</Th>
                  <Th>Student</Th>
                  <Th>Graduated</Th>
                  <Th>Review eligible</Th>
                  <Th>Status</Th>
                </Tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td>
                      <input
                        type="radio"
                        name="retention-row"
                        checked={selectedId === row.id}
                        onChange={() => setSelectedId(row.id)}
                      />
                    </Td>
                    <Td>{row.studentDisplayName ?? row.studentId.slice(0, 8)}</Td>
                    <Td>{row.graduatedOn ?? "Unknown — needs review"}</Td>
                    <Td>{row.reviewEligibleOn ?? "—"}</Td>
                    <Td>
                      <Pill tone={statusTone(row.status)}>{row.status}</Pill>
                      {row.legalHold ? <Pill tone="danger">Hold</Pill> : null}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          )}

          {writesEnabled ? (
            <FormGrid cols={2}>
              <Field label="Decision">
                <Select value={decision} onChange={(e) => setDecision(e.target.value)}>
                  <option value="retain">Retain</option>
                  <option value="extend">Extend</option>
                  <option value="legal_hold">Legal hold</option>
                  <option value="clear_legal_hold">Clear legal hold</option>
                  <option value="approve_deletion">Approve deletion (separate purge later)</option>
                </Select>
              </Field>
              {decision === "extend" ? (
                <Field label="Extended until" required>
                  <TextInput
                    type="date"
                    value={extendedUntil}
                    onChange={(e) => setExtendedUntil(e.target.value)}
                  />
                </Field>
              ) : (
                <div />
              )}
              <Field label="Reason" required>
                <TextInput
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Decision rationale"
                />
              </Field>
              <div className="flex items-end">
                <Button
                  size="sm"
                  disabled={busy || !selectedId}
                  onClick={() => void runDecision()}
                >
                  {busy ? "Saving…" : "Record decision"}
                </Button>
              </div>
            </FormGrid>
          ) : null}
        </CardBody>
      </Card>
    </PageStack>
  );
}
