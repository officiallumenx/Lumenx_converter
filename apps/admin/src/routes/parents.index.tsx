import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
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
import { loadStudentDirectory } from "@/lib/student-directory-store";
import { PeopleDirectoryCard } from "@/components/people/PeopleDirectoryCard";

export const Route = createFileRoute("/parents/")({
  head: () => ({ meta: [{ title: "Parents — LumenX Admin" }] }),
  component: ParentsPage,
});

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
  const { profileId } = useDemoProfile();
  const [rows, setRows] = useState<ParentDirectoryRecord[]>(() => loadParentDirectory());
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<ParentFilter>("all");
  const [classFilter, setClassFilter] = useState<ClassFilter>("all");
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NewParentDraft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ParentDirectoryRecord | null>(null);
  const students = useMemo(() => loadStudentDirectory(), [profileId, rows]);
  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  useEffect(() => {
    setRows(loadParentDirectory());
    setClassFilter("all");
    setSectionFilter("all");
  }, [profileId]);

  const persist = (next: ParentDirectoryRecord[]) => {
    setRows(next);
    saveParentDirectory(next);
  };

  const setAccessStatus = (id: string, accessStatus: ParentAccessStatus) => {
    const target = rows.find((row) => row.id === id);
    persist(rows.map((row) => (row.id === id ? { ...row, accessStatus } : row)));
    const action =
      accessStatus === "hold" ? "placed on hold" : accessStatus === "suspended" ? "suspended" : "reactivated";
    notify(`${target?.name ?? "Parent"} ${action}`);
  };

  const removeParent = (id: string) => {
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
    const target = rows.find((row) => row.id === id);
    persist(
      rows.map((row) => (row.id === id ? { ...row, inviteStatus: "active" as const } : row)),
    );
    notify(`Invite sent · ${target?.name ?? "Parent"} is now active`);
  };

  const list = useMemo(() => {
    const search = q.trim().toLowerCase();
    return rows
      .map((parent) => {
        const children = parent.linkedStudentIds
          .map((id) => studentById.get(id))
          .filter((student) => Boolean(student));
        const matchingChildren = children.filter((student) =>
          student
            ? matchesClassSection(student.grade, classFilter, sectionFilter)
            : false,
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
        if (statusFilter === "pending" && parent.inviteStatus !== "pending") return false;
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
              student?.name.toLowerCase().includes(search) ||
              student?.id.toLowerCase().includes(search),
          )
        );
      });
  }, [rows, q, statusFilter, classFilter, sectionFilter, studentById]);

  const createParent = () => {
    const email = draft.email.trim().toLowerCase();
    const phone = normalizeParentPhone(draft.phone);
    const linkedStudentIds = draft.linkedStudentIds
      .split(",")
      .map((id) => id.trim().toUpperCase())
      .filter(Boolean);
    if (!draft.name.trim()) return setError("Full name is required.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setError("Enter a valid email address.");
    }
    if (!/^\d{10}$/.test(phone)) return setError("Phone must contain exactly 10 digits.");
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

  const classScoped = classFilter !== "all" || sectionFilter !== "all";
  const scopeLabel = classSectionLabel(classFilter, sectionFilter);

  return (
    <AppShell
      title="Parent Directory"
      subtitle={`${list.length} guardians · ${scopeLabel}`}
      actions={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add Parent
        </Button>
      }
    >
      <Card>
        <PageToolbar className="lx-people-toolbar">
          <SearchInput
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search parent, ID, email, phone, or child…"
            className="w-full min-w-0 flex-1"
          />
          <ToolbarGroup className="lx-people-filters">
            <CascadingFiltersMenu
              groups={[
                {
                  id: "status",
                  label: "Status",
                  value: statusFilter,
                  onChange: (v) => setStatusFilter(v as typeof statusFilter),
                  options: [
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "pending", label: "Pending" },
                    { value: "hold", label: "Hold" },
                    { value: "suspended", label: "Suspended" },
                  ],
                },
                {
                  id: "class",
                  label: "Class",
                  value: classFilter,
                  onChange: (v) => setClassFilter(v as ClassFilter),
                  options: [
                    { value: "all", label: "All classes" },
                    ...getClassFilterOptions().map((grade) => ({ value: grade, label: grade })),
                  ],
                },
                {
                  id: "section",
                  label: "Section",
                  value: sectionFilter,
                  onChange: (v) => setSectionFilter(v as SectionFilter),
                  options: [
                    { value: "all", label: "All" },
                    ...getSectionFilterOptions().map((section) => ({ value: section, label: section })),
                  ],
                },
              ]}
            />
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>{list.length} results</ToolbarMeta>
        </PageToolbar>

        {list.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No guardians found"
            hint="Try another search, class, section, or status."
          />
        ) : (
          <>
            <div className="lx-people-list sm:hidden">
              {list.map(({ parent, visibleChildren }) => (
                <PeopleDirectoryCard
                  key={parent.id}
                  name={parent.name}
                  id={`${parent.id} · ${parent.relationship}`}
                  status={<ParentStatusPill parent={parent} />}
                  meta={
                    <>
                      {parent.phone ? <span>{parent.phone}</span> : null}
                      {parent.email ? <span className="truncate max-w-[12rem]">{parent.email}</span> : null}
                      {visibleChildren.length > 0 ? (
                        <span>
                          {visibleChildren
                            .map((student) =>
                              student
                                ? `${student.name} (${formatStudentGradeDisplay(student.grade)})`
                                : null,
                            )
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : (
                        <span>No linked children</span>
                      )}
                    </>
                  }
                  menu={
                    <ParentRowMenu
                      parent={parent}
                      onView={() => navigate({ to: "/parents/$id", params: { id: parent.id } })}
                      onResendInvite={() => resendInvite(parent.id)}
                      onHold={() => setAccessStatus(parent.id, "hold")}
                      onSuspend={() => setAccessStatus(parent.id, "suspended")}
                      onReactivate={() => setAccessStatus(parent.id, "active")}
                      onDelete={() => setPendingDelete(parent)}
                    />
                  }
                  onOpen={() => navigate({ to: "/parents/$id", params: { id: parent.id } })}
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
                <Th className="w-12"><span className="sr-only">Actions</span></Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map(({ parent, visibleChildren }) => (
                <tr
                  key={parent.id}
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer transition-colors hover:bg-surface-hover"
                  onClick={() => navigate({ to: "/parents/$id", params: { id: parent.id } })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate({ to: "/parents/$id", params: { id: parent.id } });
                    }
                  }}
                >
                  <td className="px-5 py-3">
                    <div className="text-xs font-medium">{parent.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">
                      {parent.id} · {parent.relationship}
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
                  <td
                    className="px-5 py-3"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {visibleChildren.length > 0 ? (
                        visibleChildren.map((student) =>
                          student ? (
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
                          ) : null,
                        )
                      ) : (
                        <span className="text-[10px] text-muted-foreground">No linked children</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3"><ParentStatusPill parent={parent} /></td>
                  <td
                    className="px-5 py-3"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <ParentRowMenu
                      parent={parent}
                      onView={() => navigate({ to: "/parents/$id", params: { id: parent.id } })}
                      onResendInvite={() => resendInvite(parent.id)}
                      onHold={() => setAccessStatus(parent.id, "hold")}
                      onSuspend={() => setAccessStatus(parent.id, "suspended")}
                      onReactivate={() => setAccessStatus(parent.id, "active")}
                      onDelete={() => setPendingDelete(parent)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
            </div>
          </>
        )}
      </Card>

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
          <Field label="Account password" required hint="At least 8 characters">
            <TextInput
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </Field>
          <Field label="Link child IDs" hint="Comma-separated student IDs">
            <TextInput
              value={draft.linkedStudentIds}
              onChange={(event) => setDraft({ ...draft, linkedStudentIds: event.target.value })}
              placeholder="STU-1042, STU-1099"
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
    </AppShell>
  );
}

function ParentStatusPill({ parent }: { parent: ParentDirectoryRecord }) {
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
  parent: ParentDirectoryRecord;
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
