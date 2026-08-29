import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { IconChip } from "@/components/IconChip";
import { ClassSectionAudienceField } from "@/components/ClassSectionMultiPicker";
import { DateTimePicker12h, formatDateTime12h } from "@/components/DateTimePicker12h";
import {
  Card,
  CardHeader,
  Button,
  Pill,
  Modal,
  Field,
  Select,
  TextInput,
  TextArea,
} from "@lumenx/ui-admin";
import { Plus, Megaphone, Eye, Pin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import { examClassDisplayLabel } from "@/lib/exam-timetable-data";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  createAnnouncement,
  loadAnnouncementsList,
  resolveAnnouncementsListView,
  shouldCommitAnnouncementsLoad,
  updateAnnouncement,
  type AnnouncementAudienceScope,
  type AnnouncementListItem,
  type AnnouncementsListStatus,
} from "@/lib/announcements";

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "Announcements — LumenX Admin" }] }),
  component: AnnouncementsPage,
});

type Item = AnnouncementListItem;

function todayLocalInputValue(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatScheduleWhen(isoLocal: string): string {
  const label = formatDateTime12h(isoLocal);
  return label ? `Scheduled · ${label}` : "Scheduled";
}

const INITIAL: Item[] = [
  {
    id: "1",
    title: "Revised exam guidelines · 2026 cycle",
    audience: "Students · Parents",
    author: "Principal's Office",
    views: 2841,
    when: "2h ago",
    pinned: true,
    status: "published",
  },
  {
    id: "2",
    title: "Library extended hours during finals",
    audience: "All grades",
    author: "Library Admin",
    views: 612,
    when: "yesterday",
    pinned: false,
    status: "published",
  },
  {
    id: "3",
    title: "Cafeteria menu refresh — June",
    audience: "Institute-wide",
    author: "Operations",
    views: 1182,
    when: "2d ago",
    pinned: false,
    status: "published",
  },
  {
    id: "4",
    title: "Draft: New uniform supplier vendor",
    audience: "Parents",
    author: "Operations",
    views: 0,
    when: "—",
    pinned: false,
    status: "draft",
  },
];

const VISIBILITY_OPTIONS = ["All", "Students", "Parents", "Teachers", "Classes"] as const;
type VisibilityOption = (typeof VISIBILITY_OPTIONS)[number];

function AnnouncementsPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();

  const [items, setItems] = useState<Item[]>(() => (apiMode ? [] : INITIAL));
  const [listStatus, setListStatus] = useState<AnnouncementsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  /** Institute id for which `items` / `listStatus` were last committed (API mode). */
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<VisibilityOption>("All");
  const [classScope, setClassScope] = useState<"all" | "selected">("selected");
  const [classSectionKeys, setClassSectionKeys] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Render-time validity: never paint institute A's rows under institute B
  // (or under blocking institute context) before effects clear stored state.
  const listView = resolveAnnouncementsListView({
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
      setItems(INITIAL);
      setListStatus("demo");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    // Never flash demo INITIAL in API mode.
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
    // Keep prior items in state, but render-time view hides them until
    // resolvedForInstituteId matches the new active institute.
    void loadAnnouncementsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitAnnouncementsLoad({
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
    reloadKey,
  ]);

  const classesValid =
    visibility !== "Classes" || classScope === "all" || classSectionKeys.length > 0;
  const willSchedule = scheduleAt.trim().length > 0;
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });

  const mapAudienceScope = (): AnnouncementAudienceScope => {
    switch (visibility) {
      case "Students":
        return "students";
      case "Parents":
        return "parents";
      case "Teachers":
        return "teachers";
      case "Classes":
        return "classes";
      default:
        return "all";
    }
  };

  const audienceLabel = () => {
    if (visibility !== "Classes") return visibility;
    if (classScope === "all") return "Classes · All";
    return `Classes · ${examClassDisplayLabel("selected", classSectionKeys)}`;
  };

  const resetForm = () => {
    setTitle("");
    setBody("");
    setVisibility("All");
    setClassScope("selected");
    setClassSectionKeys([]);
    setScheduleAt("");
    setEditingId(null);
  };

  const publish = (asDraft = false) => {
    if (!writesEnabled) return;
    if (!title.trim() || !classesValid) return;
    const audience = audienceLabel();
    const scheduled = !asDraft && willSchedule;
    if (apiMode) {
      const instituteId = instituteCtx.activeInstituteId;
      if (!instituteId) {
        notify("Select an institute before publishing");
        return;
      }
      const scheduledAt =
        scheduled && scheduleAt.trim()
          ? new Date(scheduleAt).toISOString()
          : null;
      const done = () => {
        resetForm();
        setOpen(false);
        setReloadKey((k) => k + 1);
      };
      if (editingId) {
        void updateAnnouncement(editingId, {
          title: title.trim(),
          body: body.trim() || null,
          audienceScope: mapAudienceScope(),
          audienceLabel: audience,
          scheduledAt,
        })
          .then(() => {
            done();
            notify("Announcement updated");
          })
          .catch((err) => {
            notify(err instanceof Error ? err.message : "Failed to update announcement");
          });
        return;
      }
      void createAnnouncement({
        instituteId,
        title: title.trim(),
        body: body.trim() || null,
        audienceScope: mapAudienceScope(),
        audienceLabel: audience,
        scheduledAt,
        publishNow: !asDraft && !scheduled,
      })
        .then((created) => {
          done();
          if (asDraft) notify("Announcement saved as draft");
          else if (scheduled) notify(`"${created.title}" scheduled · ${audience}`);
          else notify(`"${created.title}" published immediately · ${audience}`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to create announcement");
        });
      return;
    }
    if (editingId) {
      setItems((prev) =>
        prev.map((a) =>
          a.id === editingId
            ? {
                ...a,
                title: title.trim(),
                body: body.trim() || undefined,
                audience,
                when: asDraft ? a.when : scheduled ? formatScheduleWhen(scheduleAt) : "Just now",
                status: asDraft ? "draft" : scheduled ? "scheduled" : "published",
              }
            : a,
        ),
      );
      resetForm();
      setOpen(false);
      notify("Announcement updated");
      return;
    }
    const entry: Item = {
      id: String(Date.now()),
      title: title.trim(),
      audience,
      author: "Principal's Office",
      views: 0,
      when: asDraft ? "—" : scheduled ? formatScheduleWhen(scheduleAt) : "Just now",
      pinned: false,
      status: asDraft ? "draft" : scheduled ? "scheduled" : "published",
    };
    setItems((prev) => [entry, ...prev]);
    resetForm();
    setOpen(false);
    if (asDraft) {
      notify("Announcement saved as draft");
    } else if (scheduled) {
      notify(`"${entry.title}" scheduled · ${audience}`);
    } else {
      notify(`"${entry.title}" published immediately · ${audience}`);
    }
  };

  const togglePin = (id: string) => {
    if (!writesEnabled) return;
    if (apiMode) {
      const current = displayItems.find((a) => a.id === id);
      void updateAnnouncement(id, { pinned: !current?.pinned })
        .then(() => {
          setReloadKey((k) => k + 1);
          notify("Pin status updated");
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to update pin");
        });
      return;
    }
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)));
    notify("Pin status updated");
  };

  const listHint =
    displayStatus === "loading"
      ? "Loading announcements…"
      : displayStatus === "needs_institute"
        ? "Select an active institute to load announcements"
        : displayStatus === "forbidden"
          ? "You do not have access to announcements for this institute"
          : displayStatus === "error"
            ? displayError ?? "Failed to load announcements"
            : displayStatus === "empty"
              ? "No announcements yet"
              : "Drafts, scheduled and published";

  return (
    <AppShell
      title="Announcements"
      subtitle="Long-form institute notices, pinnable to portals"
      actions={
        writesEnabled ? (
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> New announcement
          </Button>
        ) : null
      }
    >
      <Card>
        <CardHeader title="Recent" hint={listHint} />
        <div className="divide-y divide-border">
          {displayStatus === "loading" ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">Loading…</div>
          ) : displayItems.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">{listHint}</div>
          ) : (
            displayItems.map((a) => (
              <div
                key={a.id}
                className="px-5 py-4 flex flex-wrap items-center gap-4 hover:bg-surface-hover transition-colors"
              >
                <IconChip icon={a.pinned ? Pin : Megaphone} size="md" />
                <div className="flex-1 min-w-[220px]">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {a.author} · {a.audience}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3" />
                    {a.views.toLocaleString()}
                  </span>
                  <span className="font-mono">{a.when}</span>
                  {a.status === "draft" ? (
                    <Pill tone="warning">Draft</Pill>
                  ) : a.status === "scheduled" ? (
                    <Pill tone="info">Scheduled</Pill>
                  ) : (
                    <Pill tone="success">Published</Pill>
                  )}
                </div>
                {writesEnabled ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEditingId(a.id);
                        setTitle(a.title);
                        setBody(a.body ?? "");
                        setOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="primary" onClick={() => togglePin(a.id)}>
                      {a.pinned ? "Unpin" : "Pin"}
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </Card>

      {writesEnabled ? (
        <Modal
          open={open}
          onClose={() => {
            resetForm();
            setOpen(false);
          }}
          title="Compose announcement"
          size="lg"
          footer={
            <>
              <Button onClick={() => publish(true)} disabled={!title.trim() || !classesValid}>
                Save draft
              </Button>
              <Button
                variant="primary"
                onClick={() => publish(false)}
                disabled={!title.trim() || !classesValid}
              >
                {willSchedule ? "Schedule" : "Publish now"}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Title" required>
                <TextInput
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Subject"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Visibility" required>
                <Select
                  value={visibility}
                  onChange={(e) => {
                    const next = e.target.value as VisibilityOption;
                    setVisibility(next);
                    if (next !== "Classes") {
                      setClassSectionKeys([]);
                      setClassScope("selected");
                    }
                  }}
                >
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            {visibility === "Classes" ? (
              <div className="sm:col-span-2">
                <ClassSectionAudienceField
                  scope={classScope}
                  selectedKeys={classSectionKeys}
                  onScopeChange={setClassScope}
                  onSelectedKeysChange={setClassSectionKeys}
                  required
                  hint="Choose which classes and sections can see this announcement"
                />
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <Field label="Body" required>
                <TextArea
                  className="min-h-[160px]"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write the announcement…"
                />
              </Field>
            </div>
            <Field label="Pin to top">
              <Select defaultValue="No">
                <option>No</option>
                <option>Pin for 1 day</option>
                <option>Pin for 1 week</option>
              </Select>
            </Field>
            <Field label="Schedule" hint="Leave empty to publish immediately · 12-hour AM/PM">
              <DateTimePicker12h
                value={scheduleAt}
                onChange={setScheduleAt}
                min={todayLocalInputValue()}
                placeholder="Publish now (no schedule)"
              />
            </Field>
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}
