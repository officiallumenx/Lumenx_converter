import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { AnnouncementSendForm } from "@/components/send/AnnouncementSendForm";
import { AlertSendForm } from "@/components/send/AlertSendForm";
import { HolidaySendForm } from "@/components/send/HolidaySendForm";
import { EventSendForm } from "@/components/send/EventSendForm";
import { Card, CardHeader, Field, Select } from "@lumenx/ui-admin";
import { Send as SendIcon } from "lucide-react";
import {
  parseSendCategory,
  sendApiContractForCategory,
  sendCategoryLabel,
  SEND_CATEGORIES,
  type SendCategory,
} from "@/lib/communications/send-category";
import { ADMIN_MODULE_LABELS as M } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/send")({
  head: () => ({ meta: [{ title: "Send — LumenX Admin" }] }),
  validateSearch: (search: Record<string, unknown>): { category?: SendCategory } => {
    const parsed = parseSendCategory(search.category);
    if (
      search.category === "alerts" ||
      search.category === "alert" ||
      search.category === "announcements" ||
      search.category === "holidays" ||
      search.category === "holiday" ||
      search.category === "events" ||
      search.category === "event"
    ) {
      return { category: parsed };
    }
    return {};
  },
  component: SendPage,
});

function categoryHint(category: SendCategory): string {
  switch (category) {
    case "alerts":
      return "Uses school alert broadcast (Connect red alert inbox)";
    case "holidays":
      return "Uses calendar holiday create (kind=holiday, source=calendar)";
    case "events":
      return "Uses events create + publish (source=events)";
    default:
      return "Uses announcement create/publish";
  }
}

function historyLink(category: SendCategory) {
  switch (category) {
    case "alerts":
      return (
        <Link to="/alerts" className="underline underline-offset-2">
          Alerts
        </Link>
      );
    case "holidays":
      return (
        <Link to="/calendar" className="underline underline-offset-2">
          Calendar
        </Link>
      );
    case "events":
      return (
        <Link to="/events" className="underline underline-offset-2">
          Events
        </Link>
      );
    default:
      return (
        <Link to="/announcements" className="underline underline-offset-2">
          Announcements
        </Link>
      );
  }
}

function SendPage() {
  const { category: categoryFromSearch } = Route.useSearch();
  const navigate = Route.useNavigate();
  const category = parseSendCategory(categoryFromSearch);
  const contract = sendApiContractForCategory(category);

  const setCategory = (next: SendCategory) => {
    void navigate({ search: { category: next } });
  };

  return (
    <AppShell
      title={M.send}
      subtitle="Publish announcements, alerts, holidays, or events"
    >
      <div className="flex flex-col gap-4">
        <ModuleHero
          eyebrow="Communications"
          title={M.send}
          subtitle="Choose a category, then title, message, audience, and send"
          helpKey="send"
        />

        <Card>
          <CardHeader
            title="Compose"
            hint={categoryHint(category)}
            action={
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                {contract.kind}
              </span>
            }
          />
          <div className="px-5 pb-5 space-y-4">
            <Field label="Category" required>
              <Select
                value={category}
                onChange={(e) => setCategory(parseSendCategory(e.target.value))}
              >
                {SEND_CATEGORIES.map((value) => (
                  <option key={value} value={value}>
                    {sendCategoryLabel(value)}
                  </option>
                ))}
              </Select>
            </Field>

            {category === "announcements" ? (
              <AnnouncementSendForm />
            ) : category === "alerts" ? (
              <AlertSendForm />
            ) : category === "holidays" ? (
              <HolidaySendForm />
            ) : (
              <EventSendForm />
            )}

            <p className="text-[11px] text-muted-foreground">
              History: {historyLink(category)}. Inbox stays under{" "}
              <Link to="/notifications" className="underline underline-offset-2">
                Notifications
              </Link>
              .
            </p>
          </div>
        </Card>

        <p className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <SendIcon className="size-3.5" />
          Category-specific validation and delivery are preserved — Send only
          chooses which existing contract to call.
        </p>
      </div>
    </AppShell>
  );
}
