import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ADMIN_STORAGE_KEYS } from "@lumenx/config";
import {
  Card,
  Button,
  Modal,
  Field,
  TextInput,
  TextArea,
  Select,
  SearchInput,
  SegmentedControl,
  PageToolbar,
  ToolbarSpacer,
  ToolbarMeta,
  EmptyState,
} from "@lumenx/ui-admin";
import {
  Plus,
  Mail,
  KeyRound,
  UserPlus,
  Edit3,
  Eye,
  EyeOff,
  Send,
} from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  loadTeachersList,
  resolveTeachersListView,
  shouldCommitTeachersLoad,
  createTeacher as createTeacherApi,
  updateTeacher as updateTeacherApi,
  deleteTeacher as deleteTeacherApi,
  roleToTeachingScope,
  portalAccessLabelToLevel,
  teacherStatusToApi,
  type TeacherListItem,
  type TeachersListStatus,
} from "@/lib/teachers";
import {
  assignSubjectsToTeacher,
  getAssignedSubjectIdsForTeacher,
  getAssignedSubjectNamesForTeacher,
  getSubjectCatalog,
} from "@/lib/subjects-data";
import { TEACHERS_CHANGED_EVENT } from "@/lib/career-to-teacher";
import {
  TEACHER_ROLES,
  TeacherAvatar,
  TeacherChip,
  TeacherDetailRow,
  TeacherRolePill,
  TeacherStatTile,
  TeacherStatusPill,
  teacherRoleLabel,
  type Teacher,
  type TeacherRole,
  type TeacherStatus,
} from "@/components/teachers/TeacherDisplay";
import { TeacherStaffCard } from "@/components/teachers/TeacherStaffCard";
import { TeacherProfileReadonly } from "@/components/teachers/TeacherProfileReadonly";
import { coerceSelectValue } from "@lumenx/utils";

export const Route = createFileRoute("/teachers")({
  head: () => ({ meta: [{ title: "Teachers — LumenX Admin" }] }),
  component: TeachersPage,
});

type TeacherRow = Teacher | TeacherListItem;

function teacherIdentityCode(teacher: TeacherRow): string {
  if ("identityLabel" in teacher && teacher.identityLabel) {
    return teacher.identityLabel;
  }
  return teacher.employeeId || teacher.id;
}

const INITIAL: Teacher[] = [
  {
    id: "T-001",
    name: "Sarah Jenkins",
    role: "subject-teacher",
    dept: "Mathematics",
    email: "s.jenkins@institute.edu",
    phone: "+1 555 010 2201",
    password: "Teach@Sarah1",
    employeeId: "EMP-1041",
    joined: "Aug 2019",
    dateOfBirth: "1985-08-18",
    classes: 6,
    assignedSections: ["10-A", "10-B", "11-A"],
    status: "active",
    subjects: ["Mathematics", "Algebra"],
    portalAccess: "Faculty + Grading",
    qualification: "M.Sc Mathematics · B.Ed",
    lastLogin: "12 min ago",
    credentialsSentAt: "Jan 2026",
  },
  {
    id: "T-002",
    name: "David Koal",
    role: "subject-teacher",
    dept: "Physics",
    email: "d.koal@institute.edu",
    phone: "+1 555 010 2202",
    password: "Teach@David1",
    employeeId: "EMP-1042",
    joined: "Jun 2020",
    dateOfBirth: "1988-08-20",
    classes: 5,
    assignedSections: ["11-A", "11-B", "12-A"],
    status: "active",
    subjects: ["Physics"],
    portalAccess: "Faculty + Grading",
    qualification: "Ph.D Physics",
    lastLogin: "2 h ago",
    credentialsSentAt: "Feb 2026",
  },
  {
    id: "T-003",
    name: "Priya Iyer",
    role: "activity-coordinator",
    dept: "Biology",
    email: "p.iyer@institute.edu",
    phone: "+91 98220 44102",
    password: "Teach@Priya1",
    employeeId: "EMP-1043",
    joined: "Apr 2021",
    dateOfBirth: "1990-08-22",
    classes: 4,
    assignedSections: ["9-A", "9-B"],
    status: "active",
    subjects: ["Biology", "Environmental Science"],
    portalAccess: "Faculty + Grading",
    qualification: "M.Sc Biology · B.Ed",
    lastLogin: "45 min ago",
    credentialsSentAt: "Mar 2026",
  },
  {
    id: "T-004",
    name: "Marcus Whitfield",
    role: "subject-teacher",
    dept: "English",
    email: "m.whitfield@institute.edu",
    phone: "+44 7700 900441",
    password: "Teach@Marcus1",
    employeeId: "EMP-1044",
    joined: "Jan 2018",
    dateOfBirth: "1982-03-15",
    classes: 7,
    assignedSections: ["10-A", "10-C", "12-B"],
    status: "on-leave",
    subjects: ["English", "Literature"],
    portalAccess: "Faculty only",
    qualification: "M.A English Literature",
    lastLogin: "14 d ago",
    credentialsSentAt: "Dec 2025",
  },
  {
    id: "T-005",
    name: "Hana Suzuki",
    role: "subject-teacher",
    dept: "Chemistry",
    email: "h.suzuki@institute.edu",
    phone: "+81 90 1234 5678",
    password: "Teach@Hana12",
    employeeId: "EMP-1045",
    joined: "Jul 2022",
    dateOfBirth: "1991-08-19",
    classes: 5,
    assignedSections: ["11-C", "12-A"],
    status: "active",
    subjects: ["Chemistry"],
    portalAccess: "Faculty + Grading",
    qualification: "M.Sc Chemistry",
    lastLogin: "1 h ago",
    credentialsSentAt: "Jan 2026",
  },
  {
    id: "T-006",
    name: "Omar Faris",
    role: "activity-coordinator",
    dept: "History",
    email: "o.faris@institute.edu",
    phone: "+971 50 882 1100",
    password: "Teach@Omar12",
    employeeId: "EMP-1046",
    joined: "Sep 2023",
    dateOfBirth: "1987-11-02",
    classes: 3,
    assignedSections: ["9-A"],
    status: "pending",
    subjects: ["History"],
    portalAccess: "Faculty only",
    qualification: "M.A History",
    lastLogin: "Never",
    credentialsSentAt: null,
  },
  {
    id: "T-007",
    name: "Coach Arjun Patel",
    role: "subject-teacher",
    dept: "Physical Education",
    email: "a.patel@institute.edu",
    phone: "+971 50 771 2200",
    password: "Teach@Arjun7",
    employeeId: "EMP-1047",
    joined: "Aug 2022",
    dateOfBirth: "1993-08-24",
    classes: 8,
    assignedSections: ["10-A", "10-B", "11-A"],
    status: "active",
    subjects: ["Sports"],
    portalAccess: "Faculty only",
    qualification: "M.P.Ed · Athletics Coach",
    lastLogin: "Today",
    credentialsSentAt: "Aug 2022",
  },
  {
    id: "T-008",
    name: "Dr. Anita Verma",
    role: "subject-teacher",
    dept: "Computer Science",
    email: "a.verma@institute.edu",
    phone: "+971 50 661 3300",
    password: "Teach@Anita8",
    employeeId: "EMP-1048",
    joined: "Jan 2021",
    dateOfBirth: "1984-06-10",
    classes: 6,
    assignedSections: ["10-A", "11-A", "12-A"],
    status: "active",
    subjects: ["Computer Lab"],
    portalAccess: "Faculty + Grading",
    qualification: "M.Tech Computer Science",
    lastLogin: "Yesterday",
    credentialsSentAt: "Jan 2021",
  },
  {
    id: "T-009",
    name: "Priya Iyer",
    role: "subject-teacher",
    dept: "Biology",
    email: "p.iyer.bio@institute.edu",
    phone: "+971 50 441 4400",
    password: "Teach@Priya9",
    employeeId: "EMP-1049",
    joined: "Mar 2020",
    dateOfBirth: "1989-08-21",
    classes: 5,
    assignedSections: ["10-A", "11-B"],
    status: "active",
    subjects: ["Biology"],
    portalAccess: "Faculty + Grading",
    qualification: "M.Sc Biology · B.Ed",
    lastLogin: "2 h ago",
    credentialsSentAt: "Mar 2020",
  },
  {
    id: "T-010",
    name: "Omar Faris",
    role: "subject-teacher",
    dept: "History",
    email: "o.faris.hist@institute.edu",
    phone: "+971 50 882 1101",
    password: "Teach@Omar10",
    employeeId: "EMP-1050",
    joined: "Sep 2023",
    dateOfBirth: "1992-01-08",
    classes: 4,
    assignedSections: ["9-A", "10-A"],
    status: "active",
    subjects: ["History"],
    portalAccess: "Faculty only",
    qualification: "M.A History · B.Ed",
    lastLogin: "Today",
    credentialsSentAt: "Sep 2023",
  },
];

const DEPARTMENTS = [
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "English",
  "History",
  "Physical Education",
  "Computer Science",
] as const;
const TEACHER_ROLE_VALUES = TEACHER_ROLES.map((r) => r.value);
const TEACHER_STATUS_VALUES = ["active", "on-leave", "pending"] as const satisfies readonly TeacherStatus[];
const STATUS_FILTERS = ["all", ...TEACHER_STATUS_VALUES] as const;
const TEACHER_STATUS_LABELS: Record<TeacherStatus, string> = {
  active: "Active",
  "on-leave": "On leave",
  pending: "Pending",
};
const TEACHERS_STORAGE_KEY = ADMIN_STORAGE_KEYS.teachers;

function loadTeachers(): Teacher[] {
  try {
    const raw = localStorage.getItem(TEACHERS_STORAGE_KEY);
    if (raw) {
      const stored = (JSON.parse(raw) as Array<Teacher & { role?: TeacherRole; password?: string }>).map(
        (teacher) => ({
          ...teacher,
          role: teacher.role ?? "subject-teacher",
          password: teacher.password ?? `Teach@${teacher.id.replace(/\D/g, "").slice(-4) || "1234"}`,
          subjects: getAssignedSubjectNamesForTeacher(teacher.id),
        }),
      );
      const byId = new Map(stored.map((teacher) => [teacher.id, teacher]));
      for (const fallback of INITIAL) {
        const existing = byId.get(fallback.id);
        if (!existing) {
          byId.set(fallback.id, {
            ...fallback,
            subjects: getAssignedSubjectNamesForTeacher(fallback.id),
          });
        } else if (!existing.dateOfBirth && fallback.dateOfBirth) {
          byId.set(fallback.id, { ...existing, dateOfBirth: fallback.dateOfBirth });
        }
      }
      return [...byId.values()];
    }
  } catch {
    // Use demo records when storage is unavailable.
  }
  return INITIAL.map((teacher) => ({
    ...teacher,
    subjects: getAssignedSubjectNamesForTeacher(teacher.id),
  }));
}

type TeacherEditForm = Partial<Teacher> & {
  subjectIds?: string[];
  sectionsText?: string;
};

function TeachersPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const [rows, setRows] = useState<Teacher[]>(() =>
    apiMode ? [] : loadTeachers(),
  );
  const [apiItems, setApiItems] = useState<TeacherListItem[]>([]);
  const [listStatus, setListStatus] = useState<TeachersListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<TeacherRow | null>(null);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveTeachersListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const displayItems: TeacherRow[] = apiMode ? listView.items : rows;
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("all");
  const [roleFilter, setRoleFilter] = useState<"all" | TeacherRole>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<TeacherEditForm>({});
  const [resetTarget, setResetTarget] = useState<Teacher | null>(null);
  const [messageTarget, setMessageTarget] = useState<Teacher | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [messageError, setMessageError] = useState("");

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<TeacherRole>("subject-teacher");
  const [newDept, setNewDept] = useState("Mathematics");
  const [newEmail, setNewEmail] = useState("");
  const [newDateOfBirth, setNewDateOfBirth] = useState("");
  const [newPassword, setNewPassword] = useState("Teacher@123");
  const [newSubjectIds, setNewSubjectIds] = useState<string[]>([]);
  const [showProfilePassword, setShowProfilePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const subjectCatalog = useMemo(
    () => getSubjectCatalog().filter((subject) => subject.status === "active"),
    [],
  );

  const selected = useMemo(
    () => displayItems.find((t) => t.id === selectedId) ?? null,
    [displayItems, selectedId],
  );

  useEffect(() => {
    if (apiMode) return;
    try {
      localStorage.setItem(TEACHERS_STORAGE_KEY, JSON.stringify(rows));
      window.dispatchEvent(new Event(TEACHERS_CHANGED_EVENT));
    } catch {
      // Keep current page state when storage is unavailable.
    }
  }, [apiMode, rows]);

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
    void loadTeachersList(requestInstituteId).then((next) => {
      if (
        !shouldCommitTeachersLoad({
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
    setSearchQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
    setSelectedId(null);
    setEditing(false);
    setEditForm({});
    setResetTarget(null);
    setMessageTarget(null);
    setCreateDialogOpen(false);
    setShowProfilePassword(false);
    setShowEditPassword(false);
    setShowNewPassword(false);
    setPendingDelete(null);
  }, [instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!selectedId) return;
    if (!displayItems.some((teacher) => teacher.id === selectedId)) {
      setSelectedId(null);
      setEditing(false);
      setEditForm({});
      setShowProfilePassword(false);
      setShowEditPassword(false);
    }
  }, [displayItems, selectedId]);

  const list = useMemo(() => {
    return displayItems.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (roleFilter !== "all" && t.role !== roleFilter) return false;
      if (!searchQuery) return true;
      const normalizedQuery = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(normalizedQuery) ||
        t.dept.toLowerCase().includes(normalizedQuery) ||
        t.email.toLowerCase().includes(normalizedQuery) ||
        teacherRoleLabel(t.role).toLowerCase().includes(normalizedQuery)
      );
    });
  }, [displayItems, searchQuery, statusFilter, roleFilter]);

  const departmentCount = useMemo(() => {
    const departments = new Set(
      displayItems.map((teacher) => teacher.dept).filter(Boolean),
    );
    return departments.size;
  }, [displayItems]);

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const listHint =
    listView.status === "loading"
      ? "Loading teachers…"
      : listView.status === "needs_institute"
        ? "Select an active institute to load teachers"
        : listView.status === "forbidden"
          ? "You do not have access to teachers for this institute"
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load teachers"
            : listView.status === "empty"
              ? "No teachers yet"
              : null;

  const guardWrite = (message = "Teacher write failed") => {
    if (!writesEnabled) {
      notify(message);
      return false;
    }
    return true;
  };

  const openDetail = useCallback((t: TeacherRow) => {
    setSelectedId(t.id);
    setEditing(false);
    setEditForm({});
  }, []);

  const closeDetail = () => {
    setSelectedId(null);
    setEditing(false);
    setEditForm({});
    setShowProfilePassword(false);
    setShowEditPassword(false);
  };

  const openMessage = useCallback((teacher: TeacherRow) => {
    if (apiMode) {
      notify("Messaging is not available in API mode");
      return;
    }
    if (!guardWrite()) return;
    setSelectedId(null);
    setEditing(false);
    setEditForm({});
    setShowProfilePassword(false);
    setShowEditPassword(false);
    setMessageTarget(teacher);
    setMessageSubject("");
    setMessageBody("");
    setMessageError("");
  }, [apiMode, writesEnabled]);

  const closeMessage = () => {
    setMessageTarget(null);
    setMessageSubject("");
    setMessageBody("");
    setMessageError("");
  };

  const sendMessage = () => {
    if (!guardWrite()) return;
    if (!messageTarget) return;
    if (messageSubject.trim().length < 3) {
      setMessageError("Subject must be at least 3 characters.");
      return;
    }
    if (messageBody.trim().length < 8) {
      setMessageError("Message must be at least 8 characters.");
      return;
    }
    notify(`Message sent to ${messageTarget.name} · ${messageTarget.email || "teacher portal"}`);
    closeMessage();
  };

  const startEdit = () => {
    if (!guardWrite()) return;
    if (!selected) return;
    setEditForm({
      ...selected,
      subjectIds: apiMode ? [] : getAssignedSubjectIdsForTeacher(selected.id),
      subjects: selected.subjects,
      sectionsText: selected.assignedSections.join(", "),
    });
    setShowEditPassword(false);
    setEditing(true);
  };

  const saveEdit = () => {
    if (!guardWrite()) return;
    if (!selected || !editForm.name?.trim()) return;
    const nextRole = editForm.role ?? selected.role;
    const assignedSections = editForm.sectionsText
      ? editForm.sectionsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : selected.assignedSections;

    if (apiMode) {
      void updateTeacherApi(selected.id, {
        displayName: editForm.name.trim(),
        department: editForm.dept ?? selected.dept,
        teachingScope: roleToTeachingScope(nextRole),
        portalAccessLevel: portalAccessLabelToLevel(
          editForm.portalAccess ?? selected.portalAccess,
        ),
        status: teacherStatusToApi(editForm.status ?? selected.status),
        email: (editForm.email ?? selected.email) || null,
        phone: (editForm.phone ?? selected.phone) || null,
        qualification: (editForm.qualification ?? selected.qualification) || null,
        dateOfBirth: editForm.dateOfBirth?.trim() || null,
        assignedSectionLabels: assignedSections,
        subjects:
          nextRole === "activity-coordinator"
            ? []
            : editForm.subjects ?? selected.subjects,
      })
        .then((updated) => {
          setEditing(false);
          setEditForm({});
          setReloadKey((k) => k + 1);
          notify(`${updated.displayName} updated successfully`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to update teacher");
        });
      return;
    }

    const subjectIds =
      nextRole === "activity-coordinator"
        ? []
        : (editForm.subjectIds ?? getAssignedSubjectIdsForTeacher(selected.id));
    assignSubjectsToTeacher(selected.id, subjectIds);
    const subjects = getAssignedSubjectNamesForTeacher(selected.id);

    setRows((prev) =>
      prev.map((t) =>
        t.id === selected.id
          ? {
              ...t,
              name: editForm.name!.trim(),
              role: editForm.role ?? t.role,
              dept: editForm.dept ?? t.dept,
              email: editForm.email ?? t.email,
              phone: editForm.phone ?? t.phone,
              password: editForm.password?.trim() || t.password,
              status: editForm.status ?? t.status,
              portalAccess: editForm.portalAccess ?? t.portalAccess,
              qualification: editForm.qualification ?? t.qualification,
              dateOfBirth: editForm.dateOfBirth?.trim() || undefined,
              subjects,
              assignedSections,
              classes: assignedSections.length || t.classes,
            }
          : t,
      ),
    );
    setEditing(false);
    setEditForm({});
    notify(`${editForm.name.trim()} updated successfully`);
  };

  const confirmReset = () => {
    if (apiMode) {
      notify("Credential reset is not available in API mode");
      setResetTarget(null);
      return;
    }
    if (!guardWrite()) return;
    if (!resetTarget) return;
    const sentAt = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
    setRows((prev) =>
      prev.map((t) => (t.id === resetTarget.id ? { ...t, credentialsSentAt: sentAt } : t)),
    );
    notify(`Password reset link sent to ${resetTarget.email}`);
    setResetTarget(null);
  };

  const removeTeacher = (id: string) => {
    if (apiMode) {
      void deleteTeacherApi(id)
        .then(() => {
          setPendingDelete(null);
          closeDetail();
          setReloadKey((k) => k + 1);
          notify("Teacher deleted");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to delete teacher");
        });
      return;
    }
    setRows((prev) => prev.filter((t) => t.id !== id));
    setPendingDelete(null);
    closeDetail();
    notify("Teacher removed");
  };

  const onboard = () => {
    if (!guardWrite()) return;
    if (!newName.trim()) return;

    if (apiMode) {
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute before creating a teacher");
        return;
      }
      const subjects =
        newRole === "activity-coordinator"
          ? []
          : subjectCatalog
              .filter((subject) => newSubjectIds.includes(subject.id))
              .map((subject) => subject.name);
      void createTeacherApi({
        instituteId,
        displayName: newName.trim(),
        department: newDept,
        teachingScope: roleToTeachingScope(newRole),
        portalAccessLevel: "faculty_grading",
        status: "pending",
        email: newEmail.trim() || null,
        dateOfBirth: newDateOfBirth.trim() || null,
        subjects,
      })
        .then((created) => {
          setNewName("");
          setNewRole("subject-teacher");
          setNewEmail("");
          setNewDateOfBirth("");
          setNewPassword("Teacher@123");
          setNewSubjectIds([]);
          setShowNewPassword(false);
          setCreateDialogOpen(false);
          setReloadKey((k) => k + 1);
          notify(`${created.displayName} onboarded`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to create teacher");
        });
      return;
    }

    const id = `T-${String(rows.length + 1).padStart(3, "0")}`;
    setRows((p) => [
      ...p,
      {
        id,
        name: newName.trim(),
        role: newRole,
        dept: newDept,
        email: newEmail.trim() || `${newName.trim().split(" ")[0].toLowerCase()}@institute.edu`,
        phone: "",
        password: newPassword.trim() || "Teacher@123",
        employeeId: `EMP-${1040 + p.length + 1}`,
        joined: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        dateOfBirth: newDateOfBirth.trim() || undefined,
        classes: 0,
        assignedSections: [],
        status: "pending",
        subjects:
          newRole === "activity-coordinator"
            ? []
            : subjectCatalog
                .filter((subject) => newSubjectIds.includes(subject.id))
                .map((subject) => subject.name),
        portalAccess: "Faculty + Grading",
        qualification: "",
        lastLogin: "Never",
        credentialsSentAt: null,
      },
    ]);
    assignSubjectsToTeacher(
      id,
      newRole === "activity-coordinator" ? [] : newSubjectIds,
    );
    setNewName("");
    setNewRole("subject-teacher");
    setNewEmail("");
    setNewDateOfBirth("");
    setNewPassword("Teacher@123");
    setNewSubjectIds([]);
    setShowNewPassword(false);
    setCreateDialogOpen(false);
    notify(`${newName.trim()} onboarded · portal invite sent`);
  };

  return (
    <AppShell
      title="Academic Staff"
      subtitle={
        apiMode
          ? `API mode · ${countLabel(list.length)} teachers · ${departmentCount} departments`
          : `${list.length} teachers · ${departmentCount || 12} departments`
      }
      actions={
        writesEnabled ? (
          <Button variant="primary" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-3.5" /> Add Teacher
          </Button>
        ) : undefined
      }
    >
      <Card className="mb-4">
        <PageToolbar className="lx-people-toolbar">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, department, or role…"
            className="w-full min-w-0 flex-1"
          />
          <SegmentedControl
            value={statusFilter}
            onChange={setStatusFilter}
            options={STATUS_FILTERS.map((f) => ({
              value: f,
              label: f === "all" ? "All" : TEACHER_STATUS_LABELS[f],
            }))}
          />
          <Select
            fieldSize="compact"
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value as "all" | TeacherRole)
            }
            className="w-44"
            aria-label="Filter by teacher role"
          >
            <option value="all">All roles</option>
            {TEACHER_ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </Select>
          <ToolbarSpacer />
          <ToolbarMeta>{countLabel(list.length)} results</ToolbarMeta>
        </PageToolbar>
      </Card>

      {!listView.rowsValid ? (
        <Card className="p-5">
          <div className="py-12 text-sm text-muted-foreground text-center">
            {listHint ?? "Loading teachers…"}
          </div>
        </Card>
      ) : list.length === 0 ? (
        <EmptyState
          title="No teachers found"
          hint={
            apiMode
              ? "Try another search or status filter."
              : "Try another search, or onboard a teacher to get started."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {list.map((t) => (
              <TeacherStaffCard
                key={t.id}
                teacher={t as Teacher}
                onOpen={(teacher) => openDetail(teacher)}
                onMessage={(teacher) => openMessage(teacher)}
                onReset={(teacher) => {
                  if (apiMode) {
                    notify("Credential reset is not available in API mode");
                    return;
                  }
                  if (!guardWrite()) return;
                  setResetTarget(teacher as Teacher);
                }}
              />
            ))}
        </div>
      )}

      {/* Teacher detail / edit */}
      <Modal
        open={!!selected}
        onClose={closeDetail}
        title={editing ? "Edit teacher profile" : "Teacher profile"}
        subtitle={
          selected
            ? `${selected.name} · ${teacherIdentityCode(selected)} · ${selected.employeeId}`
            : undefined
        }
        size="lg"
        footer={
          editing ? (
            <>
              <Button
                onClick={() => {
                  setEditing(false);
                  setEditForm({});
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={saveEdit} disabled={!editForm.name?.trim()}>
                Save changes
              </Button>
            </>
          ) : writesEnabled ? (
            <>
              <Button onClick={closeDetail}>Close</Button>
              {!apiMode ? (
                <Button
                  onClick={() => {
                    if (selected) openMessage(selected);
                  }}
                >
                  <Mail className="size-3.5" /> Message
                </Button>
              ) : null}
              {!apiMode ? (
                <Button onClick={() => selected && setResetTarget(selected as Teacher)}>
                  <KeyRound className="size-3.5" /> Reset credentials
                </Button>
              ) : null}
              <Button
                onClick={() => selected && setPendingDelete(selected)}
                className="text-destructive hover:bg-destructive/10"
              >
                Delete
              </Button>
              <Button variant="primary" onClick={startEdit}>
                <Edit3 className="size-3.5" /> Edit profile
              </Button>
            </>
          ) : (
            <Button onClick={closeDetail}>Close</Button>
          )
        }
      >
        {selected && !editing && writesEnabled ? (
          apiMode ? (
            <ApiTeacherProfileSummary teacher={selected} />
          ) : (
            <TeacherProfileReadonly
              teacher={selected as Teacher}
              showPassword={showProfilePassword}
              onTogglePassword={() => setShowProfilePassword((visible) => !visible)}
            />
          )
        ) : null}
        {selected && !editing && !writesEnabled ? (
          <ApiTeacherProfileSummary teacher={selected} />
        ) : null}

        {selected && editing && writesEnabled ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full name" required>
              <TextInput
                value={editForm.name ?? ""}
                onChange={(e) => setEditForm((d) => ({ ...d, name: e.target.value }))}
              />
            </Field>
            <Field
              label="Teacher role"
              required
              hint="Both Roles will enable role switching in Connect later"
            >
              <Select
                value={editForm.role ?? "subject-teacher"}
                onChange={(e) =>
                  setEditForm((d) => ({
                    ...d,
                    role: coerceSelectValue(e.target.value, TEACHER_ROLE_VALUES, d.role ?? "subject-teacher"),
                  }))
                }
              >
                {TEACHER_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Department" required>
              <Select
                value={editForm.dept ?? "Mathematics"}
                onChange={(e) => setEditForm((d) => ({ ...d, dept: e.target.value }))}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="Email">
              <TextInput
                type="email"
                value={editForm.email ?? ""}
                onChange={(e) => setEditForm((d) => ({ ...d, email: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={editForm.phone ?? ""}
                onChange={(e) => setEditForm((d) => ({ ...d, phone: e.target.value }))}
              />
            </Field>
            <Field label="Date of birth">
              <TextInput
                type="date"
                value={editForm.dateOfBirth ?? ""}
                onChange={(e) => setEditForm((d) => ({ ...d, dateOfBirth: e.target.value }))}
              />
            </Field>
            {!apiMode ? (
            <Field label="Account password" required hint="Admin can always view this password">
              <div className="relative">
                <TextInput
                  type={showEditPassword ? "text" : "password"}
                  value={editForm.password ?? ""}
                  onChange={(e) => setEditForm((d) => ({ ...d, password: e.target.value }))}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
                  aria-label={showEditPassword ? "Hide password" : "Show password"}
                >
                  {showEditPassword ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
              </div>
            </Field>
            ) : null}
            <Field label="Status">
              <Select
                value={editForm.status ?? "active"}
                onChange={(e) =>
                  setEditForm((d) => ({
                    ...d,
                    status: coerceSelectValue(
                      e.target.value,
                      TEACHER_STATUS_VALUES,
                      d.status ?? "active",
                    ),
                  }))
                }
              >
                {TEACHER_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>
                    {TEACHER_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Portal access">
              <Select
                value={editForm.portalAccess ?? "Faculty + Grading"}
                onChange={(e) => setEditForm((d) => ({ ...d, portalAccess: e.target.value }))}
              >
                <option>Faculty + Grading</option>
                <option>Faculty only</option>
                <option>Read-only</option>
              </Select>
            </Field>
            <Field label="Qualification" hint="Degrees & certifications">
              <TextInput
                value={editForm.qualification ?? ""}
                onChange={(e) => setEditForm((d) => ({ ...d, qualification: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Assigned subjects"
                hint={
                  (editForm.role ?? selected.role) === "activity-coordinator"
                    ? "Subject assignment is available for Subject Teacher or Both Roles"
                    : apiMode
                      ? "Comma-separated subject names"
                      : "Select subjects from the institute catalog"
                }
              >
                {(editForm.role ?? selected.role) === "activity-coordinator" ? (
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                    Change the teacher role to Subject Teacher or Both Roles to assign subjects.
                  </div>
                ) : apiMode ? (
                  <TextInput
                    value={(editForm.subjects ?? []).join(", ")}
                    onChange={(e) =>
                      setEditForm((d) => ({
                        ...d,
                        subjects: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="Mathematics, Algebra"
                  />
                ) : (
                  <div className="mt-1 grid gap-2 sm:grid-cols-2">
                    {subjectCatalog.map((subject) => {
                      const checked = (editForm.subjectIds ?? []).includes(subject.id);
                      return (
                        <label
                          key={subject.id}
                          className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                            checked ? "border-primary bg-primary/5" : "border-border"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditForm((current) => {
                                const ids = current.subjectIds ?? [];
                                return {
                                  ...current,
                                  subjectIds: checked
                                    ? ids.filter((id) => id !== subject.id)
                                    : [...ids, subject.id],
                                };
                              })
                            }
                          />
                          <span className="min-w-0">
                            <span className="block font-medium">{subject.name}</span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {subject.code}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Assigned sections" hint="e.g. 10-A, 11-B">
                <TextInput
                  value={editForm.sectionsText ?? ""}
                  onChange={(e) => setEditForm((d) => ({ ...d, sectionsText: e.target.value }))}
                  placeholder="10-A, 10-B, 11-A"
                />
              </Field>
            </div>
            <div className="sm:col-span-2 text-[11px] text-muted-foreground">
              Employee ID {selected.employeeId} · Teacher ID {selected.id} (read-only)
            </div>
          </div>
        ) : null}
      </Modal>

      {writesEnabled ? (
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title="Reset credentials"
        subtitle={`Send a secure password reset link to ${resetTarget?.email ?? ""}`}
        footer={
          <>
            <Button onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmReset}>
              <KeyRound className="size-3.5" /> Send reset link
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            This will email <span className="text-foreground font-medium">{resetTarget?.name}</span>{" "}
            a one-time link to set a new password.
          </p>
          <div className="p-3 rounded-md border border-border bg-background/40 text-xs space-y-1">
            <div>
              <span className="text-muted-foreground">Portal:</span> {resetTarget?.portalAccess}
            </div>
            <div>
              <span className="text-muted-foreground">Last credentials sent:</span>{" "}
              {resetTarget?.credentialsSentAt ?? "Never"}
            </div>
          </div>
        </div>
      </Modal>
      ) : null}

      {writesEnabled ? (
      <Modal
        open={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        title="Delete teacher?"
        subtitle={
          pendingDelete
            ? `This will permanently remove ${pendingDelete.name}.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button
              variant="primary"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDelete && removeTeacher(pendingDelete.id)}
            >
              Delete teacher
            </Button>
          </>
        }
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          This removes the teacher directory record. Related assignments may need separate cleanup.
        </p>
      </Modal>
      ) : null}

      {writesEnabled ? (
      <Modal
        open={!!messageTarget}
        onClose={closeMessage}
        title="Send message"
        subtitle={
          messageTarget
            ? `To ${messageTarget.name} · ${messageTarget.email || "No email on file"}`
            : undefined
        }
        footer={
          <>
            <Button onClick={closeMessage}>Cancel</Button>
            <Button variant="primary" onClick={sendMessage}>
              <Send className="size-3.5" /> Send message
            </Button>
          </>
        }
      >
        {messageTarget && (
          <div className="space-y-4">
            {messageError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {messageError}
              </div>
            )}
            <div className="rounded-lg border border-border bg-background/40 p-3 text-xs">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Recipient
              </div>
              <div className="mt-1 font-medium">{messageTarget.name}</div>
              <div className="mt-0.5 text-muted-foreground">
                {messageTarget.email || "No email"} · {messageTarget.phone || "No phone"}
              </div>
            </div>
            <Field label="Subject" required>
              <TextInput
                value={messageSubject}
                onChange={(e) => {
                  setMessageSubject(e.target.value);
                  setMessageError("");
                }}
                placeholder="e.g. Timetable update for next week"
                autoFocus
              />
            </Field>
            <Field label="Message" required hint="At least 8 characters">
              <TextArea
                rows={5}
                value={messageBody}
                onChange={(e) => {
                  setMessageBody(e.target.value);
                  setMessageError("");
                }}
                placeholder="Write your message to this teacher…"
              />
            </Field>
          </div>
        )}
      </Modal>
      ) : null}

      {writesEnabled ? (
      <Modal
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Onboard teacher"
        subtitle="Create faculty record, portal access and timetable assignment"
        size="lg"
        footer={
          <>
            <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={onboard} disabled={!newName.trim()}>
              <UserPlus className="size-3.5" /> Onboard
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" required>
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Dr. Maya Robinson"
            />
          </Field>
          <Field
            label="Teacher role"
            required
            hint="Both Roles will enable role switching in Connect later"
          >
            <Select
              value={newRole}
              onChange={(e) =>
                setNewRole(coerceSelectValue(e.target.value, TEACHER_ROLE_VALUES, "subject-teacher"))
              }
            >
              {TEACHER_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department" required>
            <Select value={newDept} onChange={(e) => setNewDept(e.target.value)}>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="faculty@institute.edu"
            />
          </Field>
          <Field label="Date of birth">
            <TextInput
              type="date"
              value={newDateOfBirth}
              onChange={(e) => setNewDateOfBirth(e.target.value)}
            />
          </Field>
          {!apiMode ? (
          <Field label="Account password" required hint="Admin can always view this password">
            <div className="relative">
              <TextInput
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Teacher@123"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((visible) => !visible)}
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
            </div>
          </Field>
          ) : null}
          <div className="sm:col-span-2">
            <Field
              label="Assigned subjects"
              hint={
                newRole === "activity-coordinator"
                  ? "Subject assignment is available for Subject Teacher or Both Roles"
                  : "Select subjects from the institute catalog"
              }
            >
              {newRole === "activity-coordinator" ? (
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  Choose Subject Teacher or Both Roles to assign subjects.
                </div>
              ) : (
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  {subjectCatalog.map((subject) => {
                    const checked = newSubjectIds.includes(subject.id);
                    return (
                      <label
                        key={subject.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs ${
                          checked ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setNewSubjectIds((ids) =>
                              checked
                                ? ids.filter((id) => id !== subject.id)
                                : [...ids, subject.id],
                            )
                          }
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{subject.name}</span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {subject.code}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </Field>
          </div>
          <Field label="Portal access">
            <Select>
              <option>Faculty + Grading</option>
              <option>Faculty only</option>
            </Select>
          </Field>
          <Field label="Credentials">
            <Select>
              <option>Email invite</option>
              <option>Generate temp password</option>
            </Select>
          </Field>
        </div>
      </Modal>
      ) : null}
    </AppShell>
  );
}

function TeacherDirectoryCard({
  teacher,
  onOpen,
}: {
  teacher: TeacherRow;
  onOpen: (teacher: TeacherRow) => void;
}) {
  return (
    <Card
      interactive
      role="button"
      tabIndex={0}
      aria-label={`View ${teacher.name} profile`}
      onClick={() => onOpen(teacher)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(teacher);
        }
      }}
      className="p-4 sm:p-5 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <TeacherAvatar name={teacher.name} />
          <div>
            <div className="text-sm font-medium">{teacher.name}</div>
            <div className="text-[11px] text-muted-foreground">{teacher.dept}</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
              {teacherIdentityCode(teacher)}
            </div>
          </div>
        </div>
        <TeacherStatusPill status={teacher.status} />
      </div>
      <div className="mt-3">
        <TeacherRolePill role={teacher.role} />
      </div>
      <div className="mt-3 sm:mt-5">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Sections
        </div>
        <div className="text-base font-semibold mt-1">{teacher.classes}</div>
      </div>
      <div className="mt-3 sm:mt-4 flex flex-wrap gap-1">
        {teacher.subjects.slice(0, 2).map((subject) => (
          <span
            key={subject}
            className="px-2 py-0.5 rounded text-[10px] bg-accent border border-border"
          >
            {subject}
          </span>
        ))}
        {teacher.subjects.length > 2 ? (
          <span className="text-[10px] text-muted-foreground">
            +{teacher.subjects.length - 2}
          </span>
        ) : null}
      </div>
    </Card>
  );
}

function ApiTeacherProfileSummary({ teacher }: { teacher: TeacherRow }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <TeacherAvatar name={teacher.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold">{teacher.name}</div>
          <div className="text-sm text-muted-foreground">{teacher.dept}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TeacherRolePill role={teacher.role} />
            <TeacherStatusPill status={teacher.status} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <TeacherDetailRow
          label="Teacher role"
          value={teacherRoleLabel(teacher.role)}
        />
        <TeacherDetailRow label="Email" value={teacher.email || "—"} />
        <TeacherDetailRow label="Phone" value={teacher.phone || "—"} />
        <TeacherDetailRow label="Employee ID" value={teacher.employeeId} />
        <TeacherDetailRow label="Joined" value={teacher.joined} />
        <TeacherDetailRow
          label="Date of birth"
          value={teacher.dateOfBirth || "—"}
        />
        <TeacherDetailRow label="Portal access" value={teacher.portalAccess} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <TeacherStatTile label="Sections" value={String(teacher.classes)} />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Qualification
        </div>
        <div className="text-xs">{teacher.qualification || "—"}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Subjects
        </div>
        <div className="flex flex-wrap gap-1.5">
          {teacher.subjects.length > 0 ? (
            teacher.subjects.map((subject) => (
              <TeacherChip key={subject}>{subject}</TeacherChip>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>
      </div>
      {teacher.assignedSections.length > 0 ? (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Assigned sections
          </div>
          <div className="flex flex-wrap gap-1.5">
            {teacher.assignedSections.map((section) => (
              <TeacherChip key={section} mono>
                {section}
              </TeacherChip>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
