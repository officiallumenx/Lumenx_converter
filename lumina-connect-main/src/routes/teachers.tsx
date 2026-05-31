import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { teachers } from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Phone, Crown } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/teachers")({
  head: () => ({ meta: [{ title: "Teachers — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <TeachersPage />
    </AppShell>
  ),
});

function TeachersPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const sorted = [...teachers].sort((a, b) => Number(b.isClassTeacher) - Number(a.isClassTeacher));
  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Teachers"
        subtitle={
          snap ? `Faculty for ${snap.child.name} (${snap.classTag})` : "Class 10-B • Faculty"
        }
      />
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((t) => (
          <div
            key={t.id}
            className={`relative min-w-0 overflow-hidden rounded-2xl border bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated sm:p-5 ${t.isClassTeacher ? "border-primary/40" : "border-border"}`}
          >
            {t.isClassTeacher && (
              <>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />
                <Badge className="absolute right-3 top-3 max-w-[calc(100%-1.5rem)] gap-1 border-0 bg-gradient-primary text-primary-foreground truncate sm:right-3">
                  <Crown className="size-3 shrink-0" /> Class Teacher
                </Badge>
              </>
            )}
            <Avatar className="size-14 ring-4 ring-primary/10">
              <AvatarFallback className="bg-primary/15 text-primary font-display font-semibold">
                {t.initials}
              </AvatarFallback>
            </Avatar>
            <h3 className="mt-3 line-clamp-2 font-semibold leading-snug break-words">{t.name}</h3>
            <div className="truncate text-sm text-muted-foreground">{t.subject}</div>
            <div className="mt-1 truncate text-xs text-muted-foreground">{t.phone}</div>
            <div className="flex gap-2 mt-4">
              <Link to="/messages" className="flex-1">
                <Button variant="outline" size="sm" className="w-full gap-1.5 rounded-lg">
                  <MessageSquare className="size-3.5" /> Message
                </Button>
              </Link>
              <Button variant="outline" size="sm" className="rounded-lg" aria-label="Call">
                <Phone className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
