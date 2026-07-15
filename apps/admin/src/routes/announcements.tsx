import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { IconChip } from "@/components/IconChip";
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

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "Announcements — LumenX Admin" }] }),
  component: AnnouncementsPage,
});

type Item = {
  id: string;
  title: string;
  audience: string;
  author: string;
  views: number;
  when: string;
  pinned: boolean;
  status: "published" | "draft";
};

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

function AnnouncementsPage() {
  const notify = useAdminToast();
  const [items, setItems] = useState(INITIAL);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("Institute-wide");

  const publish = (asDraft = false) => {
    if (!title.trim()) return;
    const entry: Item = {
      id: String(Date.now()),
      title: title.trim(),
      audience,
      author: "Principal's Office",
      views: 0,
      when: asDraft ? "—" : "Just now",
      pinned: false,
      status: asDraft ? "draft" : "published",
    };
    setItems((prev) => [entry, ...prev]);
    setTitle("");
    setBody("");
    setOpen(false);
    notify(asDraft ? "Announcement saved as draft" : `"${entry.title}" published to ${audience}`);
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
                ) : (
                  <Pill tone="success">Published</Pill>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => notify("Edit mode — update title and body")}>Edit</Button>
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
        onClose={() => setOpen(false)}
        title="Compose announcement"
        size="lg"
        footer={
          <>
            <Button onClick={() => publish(true)} disabled={!title.trim()}>
              Save draft
            </Button>
            <Button variant="primary" onClick={() => publish(false)} disabled={!title.trim()}>
              Publish
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
          <Field label="Audience" required>
            <Select value={audience} onChange={(e) => setAudience(e.target.value)}>
              <option>Institute-wide</option>
              <option>Students</option>
              <option>Parents</option>
              <option>Teachers</option>
              <option>Specific grades</option>
            </Select>
          </Field>
          <Field label="Visibility">
            <Select defaultValue="All portals">
              <option>All portals</option>
              <option>Web only</option>
              <option>Mobile only</option>
            </Select>
          </Field>
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
          <Field label="Schedule">
            <TextInput type="datetime-local" />
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
