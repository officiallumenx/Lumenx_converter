import { useEffect, useMemo, useState } from "react";
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
import { useCatalogClassesQuery } from "@/lib/admin-queries";
import { listAcademicYears } from "@/lib/academic-years";
import type { AcademicYearDto } from "@/lib/academic-years/types";
import {
  acceptTransfer,
  cancelTransfer,
  initiateTransfer,
  listTransfers,
  rejectTransfer,
  type TransferRequestDto,
} from "@/lib/transfers/api";

export function TransfersView() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const catalogQuery = useCatalogClassesQuery(
    instituteCtx.activeInstituteId,
    instituteCtx.status === "ready",
  );
  const [rows, setRows] = useState<TransferRequestDto[]>([]);
  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [destinationInstituteId, setDestinationInstituteId] = useState("");
  const [sourceStudentId, setSourceStudentId] = useState("");
  const [effectiveOn, setEffectiveOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptYearId, setAcceptYearId] = useState("");
  const [acceptClassId, setAcceptClassId] = useState("");
  const [acceptSectionId, setAcceptSectionId] = useState("");

  const acceptClasses = useMemo(() => {
    if (!acceptYearId || !catalogQuery.data) return [];
    return catalogQuery.data.classes.filter((c) => c.academicYearId === acceptYearId);
  }, [acceptYearId, catalogQuery.data]);

  const acceptSections = useMemo(() => {
    if (!acceptYearId || !acceptClassId || !catalogQuery.data) return [];
    return catalogQuery.data.sections.filter(
      (s) => s.academicYearId === acceptYearId && s.classId === acceptClassId,
    );
  }, [acceptYearId, acceptClassId, catalogQuery.data]);

  const reload = () => {
    if (!isApiAuthMode() || !instituteCtx.activeInstituteId) return;
    setLoading(true);
    void Promise.all([
      listTransfers(instituteCtx.activeInstituteId),
      listAcademicYears({ instituteId: instituteCtx.activeInstituteId }),
    ])
      .then(([transferRows, yearRows]) => {
        setRows(transferRows);
        setYears(yearRows.filter((y) => y.status === "active" || y.status === "upcoming"));
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load transfers");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!acceptYearId && years[0]?.id) {
      setAcceptYearId(years[0].id);
    }
  }, [years, acceptYearId]);

  useEffect(() => {
    const firstClass = acceptClasses[0];
    if (!firstClass) {
      setAcceptClassId("");
      setAcceptSectionId("");
      return;
    }
    if (!acceptClasses.some((c) => c.id === acceptClassId)) {
      setAcceptClassId(firstClass.id);
    }
  }, [acceptClasses, acceptClassId]);

  useEffect(() => {
    const firstSection = acceptSections[0];
    if (!firstSection) {
      setAcceptSectionId("");
      return;
    }
    if (!acceptSections.some((s) => s.id === acceptSectionId)) {
      setAcceptSectionId(firstSection.id);
    }
  }, [acceptSections, acceptSectionId]);

  if (!isApiAuthMode()) {
    return (
      <PageStack>
        <Card>
          <CardBody className="py-8 text-sm text-muted-foreground">
            Cross-institution transfers require API mode.
          </CardBody>
        </Card>
      </PageStack>
    );
  }

  const initiate = async () => {
    if (!instituteCtx.activeInstituteId) return;
    if (!destinationInstituteId.trim() || !sourceStudentId.trim()) {
      notify("Destination institute and source student are required");
      return;
    }
    setBusy(true);
    try {
      await initiateTransfer({
        sourceInstituteId: instituteCtx.activeInstituteId,
        destinationInstituteId: destinationInstituteId.trim(),
        sourceStudentId: sourceStudentId.trim(),
        effectiveOn: effectiveOn || null,
        sharedFields: {
          firstName: true,
          surname: true,
          displayName: true,
          gender: true,
          dateOfBirth: true,
        },
      });
      notify("Transfer request initiated");
      setSourceStudentId("");
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Initiate failed");
    } finally {
      setBusy(false);
    }
  };

  const acceptIncoming = async (transferId: string) => {
    if (!acceptYearId || !acceptClassId || !acceptSectionId) {
      notify("Select destination academic year, class, and section");
      return;
    }
    setBusy(true);
    try {
      await acceptTransfer(transferId, {
        destinationAcademicYearId: acceptYearId,
        destinationClassId: acceptClassId,
        destinationSectionId: acceptSectionId,
      });
      notify("Transfer accepted — destination student created");
      setAcceptingId(null);
      reload();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Cross-institution transfers"
          hint="Source history stays at the source institute. Destination creates a new student from explicitly shared fields only."
        />
        <CardBody className="space-y-4">
          {writesEnabled ? (
            <FormGrid cols={2}>
              <Field label="Destination institute ID" required>
                <TextInput
                  value={destinationInstituteId}
                  onChange={(e) => setDestinationInstituteId(e.target.value)}
                  placeholder="UUID"
                />
              </Field>
              <Field label="Source student ID" required>
                <TextInput
                  value={sourceStudentId}
                  onChange={(e) => setSourceStudentId(e.target.value)}
                  placeholder="UUID"
                />
              </Field>
              <Field label="Effective on">
                <TextInput
                  type="date"
                  value={effectiveOn}
                  onChange={(e) => setEffectiveOn(e.target.value)}
                />
              </Field>
              <div className="flex items-end">
                <Button size="sm" disabled={busy} onClick={() => void initiate()}>
                  {busy ? "Submitting…" : "Initiate transfer"}
                </Button>
              </div>
            </FormGrid>
          ) : null}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transfer requests.</p>
          ) : (
            <DataTable>
              <thead>
                <Tr>
                  <Th>Student</Th>
                  <Th>Direction</Th>
                  <Th>Status</Th>
                  <Th>Effective</Th>
                  <Th>{""}</Th>
                </Tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const outgoing =
                    row.sourceInstituteId === instituteCtx.activeInstituteId;
                  const incomingPending =
                    writesEnabled && row.status === "pending" && !outgoing;
                  return (
                    <Tr key={row.id}>
                      <Td>
                        {row.sourceStudentPreview?.displayName ??
                          row.sourceStudentId.slice(0, 8)}
                      </Td>
                      <Td>{outgoing ? "Outgoing" : "Incoming"}</Td>
                      <Td>
                        <Pill
                          tone={
                            row.status === "completed"
                              ? "success"
                              : row.status === "pending"
                                ? "info"
                                : "neutral"
                          }
                        >
                          {row.status}
                        </Pill>
                      </Td>
                      <Td>{row.effectiveOn ?? "—"}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          {writesEnabled && row.status === "pending" && outgoing ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() =>
                                void cancelTransfer(row.id, "Cancelled by source")
                                  .then(() => {
                                    notify("Transfer cancelled");
                                    reload();
                                  })
                                  .catch((err) =>
                                    notify(
                                      err instanceof Error
                                        ? err.message
                                        : "Cancel failed",
                                    ),
                                  )
                              }
                            >
                              Cancel
                            </Button>
                          ) : null}
                          {incomingPending ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  setAcceptingId((prev) =>
                                    prev === row.id ? null : row.id,
                                  )
                                }
                              >
                                {acceptingId === row.id ? "Hide accept" : "Accept"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() =>
                                  void rejectTransfer(
                                    row.id,
                                    "Rejected by destination",
                                  )
                                    .then(() => {
                                      notify("Transfer rejected");
                                      reload();
                                    })
                                    .catch((err) =>
                                      notify(
                                        err instanceof Error
                                          ? err.message
                                          : "Reject failed",
                                      ),
                                    )
                                }
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                        </div>
                        {incomingPending && acceptingId === row.id ? (
                          <div className="mt-3 space-y-2 rounded-md border border-border p-3">
                            <p className="text-xs text-muted-foreground">
                              Place the new destination student into this
                              institute&apos;s academic structure. Source student
                              row is never re-homed.
                            </p>
                            <FormGrid cols={2}>
                              <Field label="Academic year" required>
                                <Select
                                  value={acceptYearId}
                                  onChange={(e) => setAcceptYearId(e.target.value)}
                                >
                                  <option value="">Select year</option>
                                  {years.map((y) => (
                                    <option key={y.id} value={y.id}>
                                      {y.name} ({y.status})
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              <Field label="Class" required>
                                <Select
                                  value={acceptClassId}
                                  onChange={(e) => setAcceptClassId(e.target.value)}
                                  disabled={!acceptYearId}
                                >
                                  <option value="">Select class</option>
                                  {acceptClasses.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              <Field label="Section" required>
                                <Select
                                  value={acceptSectionId}
                                  onChange={(e) =>
                                    setAcceptSectionId(e.target.value)
                                  }
                                  disabled={!acceptClassId}
                                >
                                  <option value="">Select section</option>
                                  {acceptSections.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              <div className="flex items-end">
                                <Button
                                  size="sm"
                                  disabled={
                                    busy ||
                                    !acceptYearId ||
                                    !acceptClassId ||
                                    !acceptSectionId
                                  }
                                  onClick={() => void acceptIncoming(row.id)}
                                >
                                  {busy ? "Accepting…" : "Confirm accept"}
                                </Button>
                              </div>
                            </FormGrid>
                          </div>
                        ) : null}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </CardBody>
      </Card>
    </PageStack>
  );
}
