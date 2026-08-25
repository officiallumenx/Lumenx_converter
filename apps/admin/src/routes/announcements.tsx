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
import { useState } from "react";
import { useAdminToast } from "@/components/AdminActionToast";
import { examClassDisplayLabel } from "@/lib/exam-timetable-data";

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "Announcements — LumenX Admin" }] }),
  component: AnnouncementsPage,
});

type Item = {
  id: string;
  title: string;
  body?: string;
  audience: string;
  author: string;
  views: number;
  when: string;
  pinned: boolean;
  status: "published" | "draft" | "scheduled";
};

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
  const [items, setItems] = useState(INITIAL);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<VisibilityOption>("All");
  const [classScope, setClassScope] = useState<"all" | "selected">("selected");
  const [classSectionKeys, setClassSectionKeys] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const classesValid =
    visibility !== "Classes" || classScope === "all" || classSectionKeys.length > 0;
  const willSchedule = scheduleAt.trim().length > 0;

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
    if (!title.trim() || !classesValid) return;
    const audience = audienceLabel();
    const scheduled = !asDraft && willSchedule;
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
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a)));
    notify("Pin status updated");
  };

  return (
    <AppShell
      title="Announcements"
      subtitle="Long-form institute notices, pinnable to portals"
      actions={
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> New announcement
        </Button>
      }
    >
      <Card>
        <CardHeader title="Recent" hint="Drafts, scheduled and published" />
        <div className="divide-y divide-border">
          {items.map((a) => (
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
            </div>
          ))}
        </div>
      </Card>

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
    </AppShell>
  );
}
