import {
  BookOpen,
  Calendar,
  Download,
  FileText,
  GraduationCap,
  User,
} from "lucide-react";
import type { StudentAssignmentDetail } from "@/lib/assignment-details";
import { downloadAssignmentAttachment } from "@/lib/assignment-details";
import {
  getAssignmentVisualStatus,
  ASSIGNMENT_CARD_STYLES,
} from "@/lib/assignment-status";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  cn,
} from "@lumenx/ui";

export function AssignmentDetailDialog({
  assignment,
  open,
  onOpenChange,
  footer,
}: {
  assignment: StudentAssignmentDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footer?: React.ReactNode;
}) {
  if (!assignment) return null;

  const visual = getAssignmentVisualStatus(assignment);
  const styles = ASSIGNMENT_CARD_STYLES[visual];
  const typeLabel = assignment.type === "homework" ? "Homework" : "Assignment";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <Badge variant="outline" className="text-[10px] capitalize">
              {typeLabel}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", styles.badge)}>
              {styles.label}
            </Badge>
          </div>
          <DialogTitle className="text-left text-lg leading-snug">{assignment.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MetaRow icon={GraduationCap} label="Subject" value={assignment.subject} />
            <MetaRow icon={User} label="Teacher" value={assignment.teacherName} />
            <MetaRow icon={BookOpen} label="Class" value={assignment.class} />
            <MetaRow
              icon={Calendar}
              label="Due"
              value={
                visual === "submitted"
                  ? "Submitted"
                  : visual === "overdue"
                    ? `Overdue · was due ${assignment.due}`
                    : assignment.due
              }
            />
          </div>

          {assignment.publishedAt && (
            <p className="text-xs text-muted-foreground">Posted {assignment.publishedAt}</p>
          )}

          <section className="rounded-xl border border-border bg-muted/20 p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </h4>
            <p className="mt-2 leading-relaxed">{assignment.description}</p>
          </section>

          <section className="rounded-xl border border-border bg-card p-3.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Teacher instructions
            </h4>
            <p className="mt-2 leading-relaxed whitespace-pre-wrap">{assignment.instructions}</p>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Teacher materials
            </h4>
            {assignment.attachments.length > 0 ? (
              <ul className="space-y-2">
                {assignment.attachments.map((file) => (
                  <li
                    key={file.id}
                    className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5"
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sm">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground">{file.fileSize}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-lg gap-1.5"
                      onClick={() => downloadAssignmentAttachment(file)}
                    >
                      <Download className="size-3.5" />
                      Download
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                No files attached — follow the written instructions above.
              </p>
            )}
          </section>
        </div>

        {footer ? <DialogFooter className="gap-2 sm:gap-0">{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
      <Icon className="size-4 shrink-0 text-primary mt-0.5" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
