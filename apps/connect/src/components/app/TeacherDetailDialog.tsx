import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  cn,
} from "@lumenx/ui";
import { Crown, Mail, MapPin, Clock, Phone, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { teachers } from "@/lib/mock-data";

export type TeacherRecord = (typeof teachers)[number];

export function TeacherDetailDialog({
  teacherId,
  open,
  onOpenChange,
}: {
  teacherId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = teachers.find((x) => x.id === teacherId);
  if (!t) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
            {t.name}
            {t.isClassTeacher && (
              <Badge className="gap-1 border-0 bg-gradient-primary text-primary-foreground">
                <Crown className="size-3" /> Class Teacher
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Profile and contact details for {t.name}, {t.subject}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="grid size-14 place-items-center rounded-2xl bg-primary/15 font-display text-lg font-semibold text-primary">
              {t.initials}
            </div>
            <div>
              <div className="font-medium">{t.subject}</div>
              {"qualification" in t && t.qualification && (
                <div className="text-sm text-muted-foreground">{t.qualification}</div>
              )}
              {"experienceYears" in t && t.experienceYears && (
                <div className="text-xs text-muted-foreground">
                  {t.experienceYears} years teaching
                </div>
              )}
            </div>
          </div>

          {"bio" in t && t.bio && (
            <p className="text-sm leading-relaxed text-muted-foreground">{t.bio}</p>
          )}

          <ul className="space-y-2 text-sm">
            {"email" in t && t.email && (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="break-all">{t.email}</span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {t.phone}
            </li>
            {"room" in t && t.room && (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                {t.room}
              </li>
            )}
            {"availability" in t && t.availability && (
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                Office hours: {t.availability}
              </li>
            )}
          </ul>

          {"languages" in t && t.languages && t.languages.length > 0 && (
            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Languages
              </div>
              <div className="flex flex-wrap gap-1.5">
                {t.languages.map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" className="flex-1 rounded-xl gap-1.5">
              <Link to="/messages" onClick={() => onOpenChange(false)}>
                <MessageSquare className="size-4" /> Message
              </Link>
            </Button>
            <Button variant="outline" className="rounded-xl" aria-label="Call teacher">
              <Phone className="size-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeacherCard({
  teacher,
  onSelect,
}: {
  teacher: TeacherRecord;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(teacher.id)}
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl border bg-card p-4 text-left shadow-soft transition-all sm:p-5",
        "hover:border-primary/40 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        teacher.isClassTeacher ? "border-primary/40" : "border-border",
      )}
    >
      {teacher.isClassTeacher && (
        <>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />
          <Badge className="absolute right-3 top-3 max-w-[calc(100%-1.5rem)] gap-1 truncate border-0 bg-gradient-primary text-primary-foreground">
            <Crown className="size-3 shrink-0" /> Class Teacher
          </Badge>
        </>
      )}
      <div className="grid size-14 place-items-center rounded-full bg-primary/15 font-display text-lg font-semibold text-primary ring-4 ring-primary/10">
        {teacher.initials}
      </div>
      <h3 className="mt-3 line-clamp-2 font-semibold leading-snug">{teacher.name}</h3>
      <div className="truncate text-sm text-muted-foreground">{teacher.subject}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{teacher.phone}</div>
      <div className="mt-3 text-xs font-medium text-primary">View profile →</div>
    </button>
  );
}
