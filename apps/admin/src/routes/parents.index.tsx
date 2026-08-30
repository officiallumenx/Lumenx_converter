import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { isInstituteUuid } from "@/lib/active-institute";
import {
  loadParentsList,
  resolveParentsListView,
  shouldCommitParentsLoad,
  createParent as createParentApi,
  updateParent as updateParentApi,
  deleteParent as deleteParentApi,
  createParentLink as createParentLinkApi,
  type GuardianRelationship,
  type ParentListItem,
  type ParentsListStatus,
} from "@/lib/parents";
import { Mail, MoreHorizontal, Phone, Plus, Users } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import { softDeleteToRecycleBin } from "@lumenx/utils";
import { useAnchoredRowMenu } from "@/hooks/useAnchoredRowMenu";
import { useDemoProfile } from "@/lib/demo-profile-context";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  Modal,
  PageToolbar,
  Pill,
  SearchInput,
  Select,
  TextArea,
  TextInput,
  Th,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
  CascadingFiltersMenu,
} from "@lumenx/ui-admin";
import {
  classSectionLabel,
  formatStudentGradeDisplay,
  getClassFilterOptions,
  getSectionFilterOptions,
  matchesClassSection,
  type ClassFilter,
  type SectionFilter,
} from "@/lib/class-section-filter";
import {
  loadParentDirectory,
  nextParentId,
  normalizeParentPhone,
  saveParentDirectory,
  type ParentAccessStatus,
  type ParentDirectoryRecord,
  type ParentRelationship,
} from "@/lib/parent-directory-store";
import {
  loadStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";
import { PeopleDirectoryCard } from "@/components/people/PeopleDirectoryCard";

export const Route = createFileRoute("/parents/")({
  head: () => ({ meta: [{ title: "Parents — LumenX Admin" }] }),
  component: ParentsPage,
});

type ParentRow = ParentDirectoryRecord | ParentListItem;

type ParentListEntry = {
  parent: ParentRow;
  visibleChildren: StudentDirectoryRecord[];
};

function parentIdentityCode(parent: ParentRow): string {
  if ("identityLabel" in parent && parent.identityLabel) {
    return parent.identityLabel;
  }
  return parent.id;
}

function parentLinkedChildrenText(
  parent: ParentRow,
  visibleChildren: StudentDirectoryRecord[],
): string {
  if ("linkedChildrenLabel" in parent) {
    return parent.linkedChildrenLabel;
  }
  if (visibleChildren.length === 0) return "No linked children";
  return visibleChildren
    .map((student) => `${student.name} (${formatStudentGradeDisplay(student.grade)})`)
    .join(" · ");
}

type ParentFilter = "all" | "active" | "pending" | "hold" | "suspended";

type NewParentDraft = {
  name: string;
  relationship: ParentRelationship;
  email: string;
  phone: string;
  password: string;
  address: string;
  linkedStudentIds: string;
};

const EMPTY_DRAFT: NewParentDraft = {
  name: "",
  relationship: "Guardian",
  email: "",
  phone: "",
  password: "Parent@123",
  address: "",
  linkedStudentIds: "",
};

function ParentsPage() {
  const notify = useAdminToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const { profileId } = useDemoProfile();
  const [rows, setRows] = useState<ParentDirectoryRecord[]>(() =>
    apiMode ? [] : loadParentDirectory(),
  );
  const [apiItems, setApiItems] = useState<ParentListItem[]>([]);
  const [listStatus, setListStatus] = useState<ParentsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveParentsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: ParentRow[] = apiMode ? listView.items : rows;
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ParentFilter>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NewParentDraft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ParentRow | null>(null);
  const students = useMemo(
    () => (apiMode ? [] : loadStudentDirectory()),
    [apiMode, profileId, rows],
  );
  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  useEffect(() => {
    if (apiMode) return;
    setRows(loadParentDirectory());
    setClassFilter("all");
    setSectionFilter("all");
  }, [apiMode, profileId]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadParentsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitParentsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
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
    reloadKey,
  ]);

  useEffect(() => {
    setQ("");
    setStatusFilter("all");
    setClassFilter("all");
    setSectionFilter("all");
    setOpen(false);
    setError("");
    setPendingDelete(null);
  }, [instituteCtx.activeInstituteId]);

  const persist = (next: ParentDirectoryRecord[]) => {
    setRows(next);
    saveParentDirectory(next);
  };

  const relationshipToApi = (
    label: ParentRelationship,
  ): GuardianRelationship => {
    if (label === "Mother") return "mother";
    if (label === "Father") return "father";
    return "guardian";
  };

  const setAccessStatus = (id: string, accessStatus: ParentAccessStatus) => {
    if (apiMode) {
      if (!writesEnabled) return;
      void updateParentApi(id, { accessStatus })
        .then(() => {
          setReloadKey((k) => k + 1);
          const action =
            accessStatus === "hold"
              ? "placed on hold"
              : accessStatus === "suspended"
                ? "suspended"
                : "reactivated";
          notify(`Parent ${action}`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to update parent");
        });
      return;
    }
    const target = rows.find((row) => row.id === id);
    persist(rows.map((row) => (row.id === id ? { ...row, accessStatus } : row)));
    const action =
      accessStatus === "hold" ? "placed on hold" : accessStatus === "suspended" ? "suspended" : "reactivated";
    notify(`${target?.name ?? "Parent"} ${action}`);
  };

  const removeParent = (id: string) => {
    if (apiMode) {
      if (!writesEnabled) return;
      void deleteParentApi(id)
        .then(() => {
          setPendingDelete(null);
          setReloadKey((k) => k + 1);
          notify("Parent deleted");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to delete parent");
        });
      return;
    }
    const target = rows.find((row) => row.id === id);
    if (target) {
      softDeleteToRecycleBin({
        module: "Parents",
        title: target.name,
        subtitle: target.id,
        deletedBy: user?.name ?? "Admin",
        snapshot: { ...target } as unknown as Record<string, unknown>,
      });
    }
    persist(rows.filter((row) => row.id !== id));
    setPendingDelete(null);
    notify(target ? `${target.name} moved to Recycle Bin` : "Parent moved to Recycle Bin");
  };

  const resendInvite = (id: string) => {
    if (apiMode) {
      if (!writesEnabled) return;
      void updateParentApi(id, { inviteStatus: "active" })
        .then(() => {
          setReloadKey((k) => k + 1);
          notify("Invite marked active");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to update invite");
        });
      return;
    }
    const target = rows.find((row) => row.id === id);
    persist(
      rows.map((row) => (row.id === id ? { ...row, inviteStatus: "active" as const } : row)),
    );
    notify(`Invite sent · ${target?.name ?? "Parent"} is now active`);
  };

  const list = useMemo(() => {
    const search = q.trim().toLowerCase();

    if (apiMode) {
      return displayItems
        .filter((parent) => {
          if (statusFilter === "pending" && parent.inviteStatus !== "pending") {
            return false;
          }
          if (
            statusFilter === "active" &&
            (parent.accessStatus !== "active" || parent.inviteStatus !== "active")
          ) {
            return false;
          }
          if (
            statusFilter !== "all" &&
            statusFilter !== "pending" &&
            statusFilter !== "active" &&
            parent.accessStatus !== statusFilter
          ) {
            return false;
          }
          if (!search) return true;
          const identity = parentIdentityCode(parent).toLowerCase();
          return (
            parent.name.toLowerCase().includes(search) ||
            parent.email.toLowerCase().includes(search) ||
            parent.phone.includes(search) ||
            identity.includes(search)
          );
        })
        .map((parent) => ({
          parent,
          visibleChildren: [] as StudentDirectoryRecord[],
        }));
    }

    return rows
      .map((parent) => {
        const children = parent.linkedStudentIds
          .map((id) => studentById.get(id))
          .filter((student): student is StudentDirectoryRecord => Boolean(student));
        const matchingChildren = children.filter((student) =>
          matchesClassSection(student.grade, classFilter, sectionFilter),
        );
        const classScoped = classFilter !== "all" || sectionFilter !== "all";
        return {
          parent,
          children,
          matchingChildren,
          visibleChildren: classScoped ? matchingChildren : children,
        };
      })
      .filter(({ parent, children, matchingChildren }) => {
        const classScoped = classFilter !== "all" || sectionFilter !== "all";
        if (classScoped && matchingChildren.length === 0) return false;
        if (statusFilter === "pending" && parent.inviteStatus !== "pending") {
          return false;
        }
        if (
          statusFilter === "active" &&
          (parent.accessStatus !== "active" || parent.inviteStatus !== "active")
        ) {
          return false;
        }
        if (
          statusFilter !== "all" &&
          statusFilter !== "pending" &&
          statusFilter !== "active" &&
          parent.accessStatus !== statusFilter
        ) {
          return false;
        }
        if (!search) return true;
        return (
          parent.name.toLowerCase().includes(search) ||
          parent.email.toLowerCase().includes(search) ||
          parent.phone.includes(search) ||
          parent.id.toLowerCase().includes(search) ||
          children.some(
            (student) =>
              student.name.toLowerCase().includes(search) ||
              student.id.toLowerCase().includes(search),
          )
        );
      })
      .map(({ parent, visibleChildren }) => ({ parent, visibleChildren }));
  }, [
    apiMode,
    displayItems,
    rows,
    q,
    statusFilter,
    classFilter,
    sectionFilter,
    studentById,
  ]);

  const createParent = () => {
    const email = draft.email.trim().toLowerCase();
    const phone = normalizeParentPhone(draft.phone);
    if (!draft.name.trim()) return setError("Full name is required.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Enter a valid email address.");
    }
    if (!/^\d{10}$/.test(phone)) return setError("Phone must contain exactly 10 digits.");

    if (apiMode) {
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute before creating a parent");
        return;
      }
      const linkIds = draft.linkedStudentIds
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const invalidLinks = linkIds.filter((id) => !isInstituteUuid(id));
      if (invalidLinks.length > 0) {
        return setError(
          `Student IDs must be UUIDs in API mode: ${invalidLinks.join(", ")}`,
        );
      }
      void createParentApi({
        instituteId,
        name: draft.name.trim(),
        phone,
        email: email || null,
        address: draft.address.trim() || null,
        inviteStatus: "pending",
        accessStatus: "active",
      })
        .then(async (created) => {
          const relationship = relationshipToApi(draft.relationship);
          for (const studentId of linkIds) {
            await createParentLinkApi(created.id, {
              studentId,
              relationship,
              isPrimary: true,
            });
          }
          setDraft(EMPTY_DRAFT);
          setError("");
          setOpen(false);
          setReloadKey((k) => k + 1);
          notify(`${created.name} created · invite pending`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to create parent");
        });
      return;
    }

    const linkedStudentIds = draft.linkedStudentIds
      .split(",")
      .map((id) => id.trim().toUpperCase())
      .filter(Boolean);
    if (draft.password.length < 8) return setError("Password must contain at least 8 characters.");
    const unknown = linkedStudentIds.filter((id) => !studentById.has(id));
    if (unknown.length > 0) return setError(`Student not found: ${unknown.join(", ")}`);

    const created: ParentDirectoryRecord = {
      id: nextParentId(rows),
      name: draft.name.trim(),
      relationship: draft.relationship,
      email,
      phone,
      password: draft.password,
      address: draft.address.trim() || "Address pending verification",
      linkedStudentIds,
      inviteStatus: "pending",
      accessStatus: "active",
    };
    persist([...rows, created]);
    setDraft(EMPTY_DRAFT);
    setError("");
    setOpen(false);
    notify(`${created.name} created · invite pending`);
  };

  const classScoped = !apiMode && (classFilter !== "all" || sectionFilter !== "all");
  const scopeLabel = classSectionLabel(classFilter, sectionFilter);

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const listHint =
    listView.status === "loading"
      ? "Loading guardians…"
      : listView.status === "needs_institute"
        ? "Select an active institute to load guardians"
        : listView.status === "forbidden"
          ? "You do not have access to guardians for this institute"
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load guardians"
            : listView.status === "empty"
              ? "No guardians yet"
              : null;

  const openParentDetail = (id: string) => {
    void navigate({ to: "/parents/$id", params: { id } });
  };

  const filterGroups = [
    {
      id: "status",
      label: "Status",
      value: statusFilter,
      onChange: (v: string) => setStatusFilter(v as typeof statusFilter),
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "Active" },
        { value: "pending", label: "Pending" },
        { value: "hold", label: "Hold" },
        { value: "suspended", label: "Suspended" },
      ],
    },
    ...(!apiMode
      ? [
          {
            id: "class",
            label: "Class",
            value: classFilter,
            onChange: (v: string) => setClassFilter(v as ClassFilter),
            options: [
              { value: "all", label: "All classes" },
              ...getClassFilterOptions().map((grade) => ({ value: grade, label: grade })),
            ],
          },
          {
            id: "section",
            label: "Section",
            value: sectionFilter,
            onChange: (v: string) => setSectionFilter(v as SectionFilter),
            options: [
              { value: "all", label: "All" },
              ...getSectionFilterOptions().map((section) => ({ value: section, label: section })),
            ],
          },
        ]
      : []),
  ];

  return (
    <AppShell
      title="Parent Directory"
      subtitle={
        apiMode
          ? `API mode · ${countLabel(list.length)} guardians`
          : `${list.length} guardians · ${scopeLabel}`
      }
      actions={
        writesEnabled ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> Add Parent
          </Button>
        ) : undefined
      }
    >
      <Card>
        <PageToolbar className="lx-people-toolbar">
          <SearchInput
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={
              apiMode
                ? "Search guardian, email, phone, or ID…"
                : "Search parent, ID, email, phone, or child…"
            }
            className="w-full min-w-0 flex-1"
          />
          <ToolbarGroup className="lx-people-filters">
            <CascadingFiltersMenu groups={filterGroups} />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>{countLabel(list.length)} results</ToolbarMeta>
        </PageToolbar>

        {!listView.rowsValid ? (
          <div className="py-12 text-sm text-muted-foreground text-center">
            {listHint ?? "Loading guardians…"}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No guardians found"
            hint={
              listHint ??
              (apiMode
                ? "Try another search or status filter."
                : "Try another search, class, section, or status.")
            }
          />
        ) : (
          <>
            <div className="lx-people-list sm:hidden">
              {list.map(({ parent, visibleChildren }) => (
                <PeopleDirectoryCard
                  key={parent.id}
                  name={parent.name}
                  id={`${parentIdentityCode(parent)} · ${parent.relationship}`}
                  status={<ParentStatusPill parent={parent} />}
                  meta={
                    <>
                      {parent.phone ? <span>{parent.phone}</span> : null}
                      {parent.email ? (
                        <span className="truncate max-w-[12rem]">{parent.email}</span>
                      ) : null}
                      <span>{parentLinkedChildrenText(parent, visibleChildren)}</span>
                    </>
                  }
                  menu={
                    writesEnabled ? (
                      <ParentRowMenu
                        parent={parent}
                        onView={() => openParentDetail(parent.id)}
                        onResendInvite={() => resendInvite(parent.id)}
                        onHold={() => setAccessStatus(parent.id, "hold")}
                        onSuspend={() => setAccessStatus(parent.id, "suspended")}
                        onReactivate={() => setAccessStatus(parent.id, "active")}
                        onDelete={() => setPendingDelete(parent)}
                      />
                    ) : null
                  }
                  onOpen={() => openParentDetail(parent.id)}
                />
              ))}
            </div>
            <div className="hidden sm:block">
          <DataTable>
            <thead>
              <tr>
                <Th>Guardian</Th>
                <Th>Contact</Th>
                <Th>Linked children{classScoped ? ` · ${scopeLabel}` : ""}</Th>
                <Th>Status</Th>
                {writesEnabled ? (
                  <Th className="w-12"><span className="sr-only">Actions</span></Th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(({ parent, visibleChildren }) => (
                <tr
                  key={parent.id}
                  role={writesEnabled ? "link" : undefined}
                  tabIndex={writesEnabled ? 0 : undefined}
                  className={
                    writesEnabled
                      ? "cursor-pointer transition-colors hover:bg-surface-hover"
                      : "transition-colors hover:bg-surface-hover"
                  }
                  onClick={
                    writesEnabled ? () => openParentDetail(parent.id) : undefined
                  }
                  onKeyDown={
                    writesEnabled
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openParentDetail(parent.id);
                          }
                        }
                      : undefined
                  }
                >
                  <td className="px-5 py-3">
                    <div className="text-xs font-medium">{parent.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {parentIdentityCode(parent)} · {parent.relationship}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3" /> {parent.email || "No email"}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3" /> {parent.phone || "No phone"}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {!apiMode ? (
                      <div
                        className="flex flex-wrap gap-1.5"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        {visibleChildren.length > 0 ? (
                          visibleChildren.map((student) => (
                            <Link
                              key={student.id}
                              to="/students/$id"
                              params={{ id: student.id }}
                              className="inline-flex items-center gap-1 rounded border border-border bg-accent px-2 py-0.5 text-[10px] hover:border-primary/30"
                            >
                              {student.name}
                              <span className="font-mono text-muted-foreground">
                                ({formatStudentGradeDisplay(student.grade)})
                              </span>
                            </Link>
                          ))
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            No linked children
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {parentLinkedChildrenText(parent, visibleChildren)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3"><ParentStatusPill parent={parent} /></td>
                  {writesEnabled ? (
                    <td
                      className="px-5 py-3"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <ParentRowMenu
                        parent={parent}
                        onView={() => openParentDetail(parent.id)}
                        onResendInvite={() => resendInvite(parent.id)}
                        onHold={() => setAccessStatus(parent.id, "hold")}
                        onSuspend={() => setAccessStatus(parent.id, "suspended")}
                        onReactivate={() => setAccessStatus(parent.id, "active")}
                        onDelete={() => setPendingDelete(parent)}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </DataTable>
            </div>
          </>
        )}
      </Card>

      {writesEnabled ? (
      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete parent account?"
        subtitle={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.name} (${pendingDelete.id}).`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDelete && removeParent(pendingDelete.id)}
            >
              Delete parent
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Linked student records will remain available; only this parent account and its links are
          removed. This action cannot be undone.
        </p>
      </Modal>
      ) : null}

      {writesEnabled ? (
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setError("");
        }}
        title="Add Guardian"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={createParent}>
              <Users className="size-3.5" /> Create & Link
            </Button>
          </>
        }
      >
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <TextInput
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Maya Robinson"
            />
          </Field>
          <Field label="Relationship">
            <Select
              value={draft.relationship}
              onChange={(event) =>
                setDraft({ ...draft, relationship: event.target.value as ParentRelationship })
              }
            >
              <option>Mother</option>
              <option>Father</option>
              <option>Guardian</option>
            </Select>
          </Field>
          <Field label="Email" hint="Optional · not used for Connect login">
            <TextInput
              type="email"
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              placeholder="parent@example.com"
            />
          </Field>
          <Field label="Phone" required hint="Exactly 10 digits · Connect login (mobile only)">
            <TextInput
              value={draft.phone}
              onChange={(event) =>
                setDraft({ ...draft, phone: normalizeParentPhone(event.target.value) })
              }
              inputMode="numeric"
              maxLength={10}
            />
          </Field>
          {!apiMode ? (
            <Field label="Account password" required hint="At least 8 characters">
              <TextInput
                value={draft.password}
                onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              />
            </Field>
          ) : null}
          <Field
            label="Link child IDs"
            hint={apiMode ? "Comma-separated student UUIDs" : "Comma-separated student IDs"}
          >
            <TextInput
              value={draft.linkedStudentIds}
              onChange={(event) => setDraft({ ...draft, linkedStudentIds: event.target.value })}
              placeholder={apiMode ? "uuid, uuid…" : "STU-1042, STU-1099"}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <TextArea
                value={draft.address}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              />
            </Field>
          </div>
        </div>
      </Modal>
      ) : null}
    </AppShell>
  );
}

function ParentStatusPill({
  parent,
}: {
  parent: Pick<ParentRow, "accessStatus" | "inviteStatus">;
}) {
  if (parent.accessStatus === "hold") return <Pill tone="warning">Hold</Pill>;
  if (parent.accessStatus === "suspended") return <Pill tone="danger">Suspended</Pill>;
  if (parent.inviteStatus === "pending") return <Pill tone="warning">Pending invite</Pill>;
  return <Pill tone="success">Active</Pill>;
}

function ParentRowMenu({
  parent,
  onView,
  onResendInvite,
  onHold,
  onSuspend,
  onReactivate,
  onDelete,
}: {
  parent: Pick<ParentRow, "inviteStatus" | "accessStatus">;
  onView: () => void;
  onResendInvite: () => void;
  onHold: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  const { open, coords, buttonRef, menuRef, run, toggle } = useAnchoredRowMenu({
    menuWidth: 176,
    menuHeight: 220,
  });

  const itemClass =
    "block w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground";

  const menu =
    open && coords
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[80] min-w-44 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-pop"
            style={{ top: coords.top, left: coords.left }}
          >
            <button type="button" className={itemClass} onClick={() => run(onView)}>
              View details
            </button>
            {parent.inviteStatus === "pending" && (
              <button type="button" className={itemClass} onClick={() => run(onResendInvite)}>
                Resend invite
              </button>
            )}
            {(parent.accessStatus === "hold" || parent.accessStatus === "suspended") && (
              <button type="button" className={itemClass} onClick={() => run(onReactivate)}>
                Reactivate
              </button>
            )}
            {parent.accessStatus === "active" && (
              <button type="button" className={itemClass} onClick={() => run(onHold)}>
                Hold
              </button>
            )}
            {parent.accessStatus !== "suspended" && (
              <button type="button" className={itemClass} onClick={() => run(onSuspend)}>
                Suspend
              </button>
            )}
            <div className="border-t border-border" />
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs text-destructive hover:bg-destructive/10"
              onClick={() => run(onDelete)}
            >
              Delete
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Parent actions"
        aria-expanded={open}
        onClick={toggle}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {menu}
    </div>
  );
}
