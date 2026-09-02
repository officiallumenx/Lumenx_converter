import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Save, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  PageStack,
  Pill,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  createParentLink,
  deleteParent,
  deleteParentLink,
  loadParentDetail,
  relationshipToLabel,
  resolveParentsDetailView,
  shouldCommitParentsLoad,
  updateParent,
  updateParentLink,
  type GuardianLinkStatus,
  type GuardianRelationship,
  type ParentDetailItem,
  type ParentsListStatus,
  type PortalAccessStatus,
} from "@/lib/parents";
import { normalizeParentPhone } from "@/lib/parent-directory-store";
import { StudentLinkPicker } from "@/components/parents/StudentLinkPicker";

function detailHint(status: ParentsListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading parent profile…";
  if (status === "needs_institute") return "Select an institute to load this parent profile.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this parent.";
  }
  if (status === "error") return errorMessage ?? "Failed to load parent profile.";
  if (status === "empty") return errorMessage ?? "Parent not found.";
  return null;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium leading-relaxed">{value?.trim() || "—"}</div>
    </div>
  );
}

type EditDraft = {
  name: string;
  phone: string;
  email: string;
  address: string;
  accessStatus: PortalAccessStatus;
};

export function ParentProfileApiPage({ parentId }: { parentId: string }) {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [parent, setParent] = useState<ParentDetailItem | null>(null);
  const [status, setStatus] = useState<ParentsListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [saveError, setSaveError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [linkStudentId, setLinkStudentId] = useState("");
  const [linkRelationship, setLinkRelationship] =
    useState<GuardianRelationship>("guardian");
  const [linkPrimary, setLinkPrimary] = useState(false);
  const [linkEmergency, setLinkEmergency] = useState(false);
  const [linkBusy, setLinkBusy] = useState(false);

  const detailView = resolveParentsDetailView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedParent: parent,
    storedStatus: status,
    storedErrorMessage: errorMessage,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    setEditing(false);
    setDraft(null);
    setPendingDelete(false);
    setSaveError("");
    setLinkStudentId("");
  }, [instituteCtx.activeInstituteId, parentId]);

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setParent(null);
      setStatus("loading");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setParent(null);
      setStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setErrorMessage(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setParent(null);
      setStatus("needs_institute");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setParent(null);
    setStatus("loading");
    setErrorMessage(null);
    void loadParentDetail(parentId, requestInstituteId).then((next) => {
      if (
        !shouldCommitParentsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setParent(next.parent);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    parentId,
    reloadKey,
  ]);

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displayParent = detailView.detailValid ? detailView.parent : null;

  const startEdit = () => {
    if (!writesEnabled || !displayParent) return;
    setDraft({
      name: displayParent.name,
      phone: displayParent.phone,
      email: displayParent.email,
      address: displayParent.address,
      accessStatus: displayParent.accessStatus,
    });
    setSaveError("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setSaveError("");
    setEditing(false);
  };

  const saveEdit = () => {
    if (!writesEnabled || !draft) return;
    const email = draft.email.trim().toLowerCase();
    const phone = normalizeParentPhone(draft.phone);
    if (!draft.name.trim()) {
      setSaveError("Parent name is required.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSaveError("Enter a valid email address.");
      return;
    }
    if (!/^\d{10}$/.test(phone)) {
      setSaveError("Phone must contain exactly 10 digits.");
      return;
    }
    void updateParent(parentId, {
      name: draft.name.trim(),
      phone,
      email: email || null,
      address: draft.address.trim() || null,
      accessStatus: draft.accessStatus,
    })
      .then(() => {
        setEditing(false);
        setDraft(null);
        setSaveError("");
        setReloadKey((k) => k + 1);
        notify("Parent updated");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update parent");
      });
  };

  const confirmDelete = () => {
    if (!writesEnabled) return;
    void deleteParent(parentId)
      .then(() => {
        setPendingDelete(false);
        notify("Parent deleted");
        void navigate({ to: "/parents" });
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete parent");
      });
  };

  const addLink = () => {
    if (!writesEnabled || !linkStudentId.trim()) return;
    setLinkBusy(true);
    void createParentLink(parentId, {
      studentId: linkStudentId.trim(),
      relationship: linkRelationship,
      isPrimary: linkPrimary,
      isEmergencyContact: linkEmergency,
      status: "active",
    })
      .then(() => {
        setLinkStudentId("");
        setLinkPrimary(false);
        setLinkEmergency(false);
        setReloadKey((k) => k + 1);
        notify("Student link created");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create link");
      })
      .finally(() => setLinkBusy(false));
  };

  const patchLink = (
    linkId: string,
    patch: {
      relationship?: GuardianRelationship;
      isPrimary?: boolean;
      isEmergencyContact?: boolean;
      status?: GuardianLinkStatus;
    },
  ) => {
    if (!writesEnabled) return;
    void updateParentLink(parentId, linkId, patch)
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Link updated");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update link");
      });
  };

  const removeLink = (linkId: string) => {
    if (!writesEnabled) return;
    void deleteParentLink(parentId, linkId)
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Student link removed");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to remove link");
      });
  };

  const linkedStudentLabel = (studentId: string) =>
    displayParent?.linkStudentLabels?.[studentId] ??
    `Student · ${studentId.slice(0, 8)}…`;

  return (
    <AppShell
      title={displayParent?.name ?? "Parent profile"}
      subtitle="API mode · guardian directory record"
      actions={
        <>
          {displayParent && editing ? (
            <>
              <Button onClick={cancelEdit}>
                <X className="size-3.5" /> Cancel
              </Button>
              <Button variant="primary" onClick={saveEdit}>
                <Save className="size-3.5" /> Save
              </Button>
            </>
          ) : displayParent && writesEnabled ? (
            <>
              <Button
                variant="outline"
                onClick={() => setPendingDelete(true)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>
              <Button variant="primary" onClick={startEdit}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            </>
          ) : null}
          <Link to="/parents">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-3.5" /> Back to parents
            </Button>
          </Link>
        </>
      }
    >
      <PageStack>
        {saveError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {saveError}
          </div>
        ) : null}
        {detailView.status !== "ready" || !displayParent ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : editing && draft ? (
          <Card>
            <CardHeader title={displayParent.name} hint={displayParent.identityLabel} />
            <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5">
              <Field label="Full name" required>
                <TextInput
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </Field>
              <Field label="Phone" required>
                <TextInput
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: normalizeParentPhone(e.target.value) })
                  }
                  inputMode="numeric"
                  maxLength={10}
                />
              </Field>
              <Field label="Email">
                <TextInput
                  type="email"
                  value={draft.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                />
              </Field>
              <Field label="Access status">
                <Select
                  value={draft.accessStatus}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      accessStatus: e.target.value as PortalAccessStatus,
                    })
                  }
                >
                  <option value="active">active</option>
                  <option value="hold">hold</option>
                  <option value="suspended">suspended</option>
                </Select>
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <TextArea
                    value={draft.address}
                    onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                  />
                </Field>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader
                title={displayParent.name}
                hint={displayParent.identityLabel}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="info">{displayParent.relationship}</Pill>
                    <Pill tone={displayParent.accessStatus === "active" ? "success" : "warning"}>
                      {displayParent.accessStatus}
                    </Pill>
                    <Pill tone="info">OTP login</Pill>
                    <Pill tone={displayParent.hasPortalLogin ? "success" : "neutral"}>
                      {displayParent.hasPortalLogin ? "Session ready" : "OTP on first sign-in"}
                    </Pill>
                  </div>
                }
              />
              <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                <DetailField label="Phone" value={displayParent.phone} />
                <DetailField
                  label="Connect sign-in"
                  value="Mobile OTP only (select institute + this number in Connect)"
                />
                <DetailField label="Email" value={displayParent.email} />
                <DetailField label="Address" value={displayParent.address} />
                <DetailField label="Legacy code" value={displayParent.legacyCode} />
                <DetailField
                  label="Linked children"
                  value={displayParent.linkedChildrenDisplay}
                />
              </div>
            </Card>
            <Card>
              <CardHeader
                title="Student links"
                hint={`Last updated ${new Date(displayParent.updatedAt).toLocaleString()}`}
              />
              {displayParent.links.length === 0 ? (
                <div className="px-5 pb-5 text-sm text-muted-foreground">No student links.</div>
              ) : (
                <ul className="divide-y divide-border px-4 pb-4 sm:px-5">
                  {displayParent.links.map((link) => (
                    <li key={link.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          {linkedStudentLabel(link.studentId)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {relationshipToLabel(link.relationship)}
                          {link.isPrimary ? " · primary" : ""}
                          {link.isEmergencyContact ? " · emergency" : ""}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Pill tone={link.status === "active" ? "success" : "neutral"}>
                          {link.status}
                        </Pill>
                        {writesEnabled ? (
                          <>
                            <Select
                              value={link.relationship}
                              onChange={(e) =>
                                patchLink(link.id, {
                                  relationship: e.target.value as GuardianRelationship,
                                })
                              }
                            >
                              <option value="mother">mother</option>
                              <option value="father">father</option>
                              <option value="guardian">guardian</option>
                            </Select>
                            <Button
                              size="sm"
                              variant={link.isPrimary ? "primary" : "outline"}
                              onClick={() => patchLink(link.id, { isPrimary: !link.isPrimary })}
                            >
                              Primary
                            </Button>
                            <Button
                              size="sm"
                              variant={link.isEmergencyContact ? "primary" : "outline"}
                              onClick={() =>
                                patchLink(link.id, {
                                  isEmergencyContact: !link.isEmergencyContact,
                                })
                              }
                            >
                              Emergency
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                patchLink(link.id, {
                                  status: link.status === "active" ? "inactive" : "active",
                                })
                              }
                            >
                              {link.status === "active" ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => removeLink(link.id)}
                            >
                              Remove
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {writesEnabled && instituteCtx.activeInstituteId ? (
                <div className="grid gap-3 border-t border-border px-4 py-4 sm:grid-cols-2 sm:px-5">
                  <StudentLinkPicker
                    instituteId={instituteCtx.activeInstituteId}
                    value={linkStudentId}
                    onChange={setLinkStudentId}
                    excludeIds={displayParent.links.map((link) => link.studentId)}
                  />
                  <Field label="Relationship">
                    <Select
                      value={linkRelationship}
                      onChange={(e) =>
                        setLinkRelationship(e.target.value as GuardianRelationship)
                      }
                    >
                      <option value="mother">mother</option>
                      <option value="father">father</option>
                      <option value="guardian">guardian</option>
                    </Select>
                  </Field>
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={linkPrimary}
                        onChange={(e) => setLinkPrimary(e.target.checked)}
                      />
                      Primary guardian
                    </label>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={linkEmergency}
                        onChange={(e) => setLinkEmergency(e.target.checked)}
                      />
                      Emergency contact
                    </label>
                    <Button
                      variant="primary"
                      onClick={addLink}
                      disabled={linkBusy || !linkStudentId.trim()}
                    >
                      {linkBusy ? "Linking…" : "Add link"}
                    </Button>
                  </div>
                </div>
              ) : null}
            </Card>
          </>
        )}
      </PageStack>

      <Modal
        open={pendingDelete}
        onClose={() => setPendingDelete(false)}
        title="Delete parent account?"
        subtitle={
          displayParent
            ? `This will permanently remove ${displayParent.name}.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingDelete(false)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete parent
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Linked student records will remain available; only this parent account and its links are
          removed.
        </p>
      </Modal>
    </AppShell>
  );
}
