import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Pill, Modal, Field, Select, TextInput, TextArea } from "@/components/ui-kit";
import { Plus, Megaphone, Eye, Pin } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "Announcements — LumenX Admin" }] }),
  component: AnnouncementsPage,
});

const items = [
  { title: "Revised exam guidelines · 2026 cycle", audience: "Students · Parents", author: "Principal's Office", views: 2841, when: "2h ago", pinned: true, status: "published" },
  { title: "Library extended hours during finals", audience: "All grades", author: "Library Admin", views: 612, when: "yesterday", pinned: false, status: "published" },
  { title: "Cafeteria menu refresh — June", audience: "Institute-wide", author: "Operations", views: 1182, when: "2d ago", pinned: false, status: "published" },
  { title: "Draft: New uniform supplier vendor", audience: "Parents", author: "Operations", views: 0, when: "—", pinned: false, status: "draft" },
];

function AnnouncementsPage() {
  const [open, setOpen] = useState(false);
  return (
    <AppShell title="Announcements" subtitle="Long-form institute notices, pinnable to portals"
      actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus className="size-3.5" /> New announcement</Button>}
    >
      <Card>
        <CardHeader title="Recent" hint="Drafts, scheduled and published" />
        <div className="divide-y divide-border">
          {items.map((a) => (
            <div key={a.title} className="px-5 py-4 flex flex-wrap items-center gap-4 hover:bg-surface-hover transition-colors">
              <div className={`size-10 rounded-md flex items-center justify-center ${a.pinned ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"}`}>
                {a.pinned ? <Pin className="size-4" /> : <Megaphone className="size-4" />}
              </div>
              <div className="flex-1 min-w-[220px]">
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{a.author} · {a.audience}</div>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Eye className="size-3" />{a.views.toLocaleString()}</span>
                <span className="font-mono">{a.when}</span>
                {a.status === "draft" ? <Pill tone="warning">Draft</Pill> : <Pill tone="success">Published</Pill>}
              </div>
              <div className="flex gap-2">
                <Button>Edit</Button>
                <Button variant="primary">Pin</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Compose announcement" size="lg"
        footer={<><Button onClick={() => setOpen(false)}>Save draft</Button><Button variant="primary" onClick={() => setOpen(false)}>Publish</Button></>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Field label="Title" required><TextInput placeholder="Subject" /></Field></div>
          <Field label="Audience" required><Select><option>Institute-wide</option><option>Students</option><option>Parents</option><option>Teachers</option><option>Specific grades</option></Select></Field>
          <Field label="Visibility"><Select><option>All portals</option><option>Web only</option><option>Mobile only</option></Select></Field>
          <div className="sm:col-span-2"><Field label="Body" required><TextArea className="min-h-[160px]" placeholder="Write the announcement…" /></Field></div>
          <Field label="Pin to top"><Select><option>No</option><option>Pin for 1 day</option><option>Pin for 1 week</option></Select></Field>
          <Field label="Schedule"><TextInput type="datetime-local" /></Field>
        </div>
      </Modal>
    </AppShell>
  );
}
