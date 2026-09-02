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
import { Crown, Mail, Phone } from "lucide-react";
import { teachers } from "@/lib/mock-data";
import type { LearnerTeacherCard } from "@/lib/teachers/types";

export type TeacherRecord = (typeof teachers)[number] | LearnerTeacherCard;

export function TeacherDetailDialog({
  teacher,
  teacherId,
  open,
  onOpenChange,
}: {
  teacher?: TeacherRecord | null;
  teacherId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = teacher ?? teachers.find((entry) => entry.id === teacherId);
  if (!t) return null;

  const qualification =
    "qualification" in t && t.qualification ? t.qualification : undefined;
  const department = "department" in t && t.department ? t.department : undefined;

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
              {department ? (
                <div className="text-sm text-muted-foreground">{department}</div>
              ) : null}
              {qualification ? (
                <div className="text-sm text-muted-foreground">{qualification}</div>
              ) : null}
              {"experienceYears" in t && t.experienceYears ? (
                <div className="text-xs text-muted-foreground">
                  {t.experienceYears} years teaching
                </div>
              ) : null}
            </div>
          </div>

          {"bio" in t && t.bio ? (
            <p className="text-sm leading-relaxed text-muted-foreground">{t.bio}</p>
          ) : null}

          <ul className="space-y-2 text-sm">
            {"email" in t && t.email ? (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="break-all">{t.email}</span>
              </li>
            ) : null}
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-muted-foreground" />
              {t.phone}
            </li>
            {"room" in t && t.room ? (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">Room</span>
                {t.room}
              </li>
            ) : null}
            {"availability" in t && t.availability ? (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-muted-foreground">Office hours</span>
                {t.availability}
              </li>
            ) : null}
          </ul>

          {"languages" in t && t.languages && t.languages.length > 0 ? (
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
          ) : null}
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
