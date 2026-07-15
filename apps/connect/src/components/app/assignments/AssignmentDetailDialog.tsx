import { BookOpen, Calendar, Download, ExternalLink, FileText, GraduationCap, User } from "lucide-react";
import type { StudentAssignmentDetail } from "@/lib/assignment-details";
import {
  downloadAssignmentAttachment,
  openAssignmentAttachment,
} from "@/lib/assignment-details";
import { getAssignmentVisualStatus, ASSIGNMENT_CARD_STYLES } from "@/lib/assignment-status";
import { toast } from "sonner";
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
      <DialogContent className="connect-assignment-detail flex max-h-[90dvh] w-[calc(100vw-1.25rem)] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <Badge variant="outline" className="text-[10px] capitalize">
              {typeLabel}
            </Badge>
            <Badge variant="outline" className={cn("text-[10px]", styles.badge)}>
              {styles.label}
            </Badge>
          </div>
          <DialogTitle className="text-left text-base leading-snug break-words sm:text-lg">
            {assignment.title}
          </DialogTitle>
        </DialogHeader>

        <div className="connect-assignment-detail-body min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-4 sm:px-5">
          <div className="min-w-0 space-y-4 text-sm">
            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
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

            <section className="min-w-0 rounded-xl border border-border bg-muted/20 p-3.5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </h4>
              <p className="mt-2 break-words leading-relaxed">{assignment.description}</p>
            </section>

            <section className="min-w-0 rounded-xl border border-border bg-card p-3.5">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Teacher instructions
              </h4>
              <p className="mt-2 break-words leading-relaxed whitespace-pre-wrap">
                {assignment.instructions}
              </p>
            </section>

            <section className="min-w-0">
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Teacher materials
              </h4>
              {assignment.attachments.length > 0 ? (
                <ul className="space-y-2">
                  {assignment.attachments.map((file) => (
                    <li
                      key={file.id}
                      className="min-w-0 rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="break-words font-medium text-sm leading-snug">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">{file.fileSize}</p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="w-full rounded-lg gap-1.5"
                          onClick={() => openAssignmentAttachment(file)}
                        >
                          <ExternalLink className="size-3.5 shrink-0" />
                          Open
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full rounded-lg gap-1.5"
                          onClick={() => {
                            downloadAssignmentAttachment(file);
                            toast.success("Download started", { description: file.fileName });
                          }}
                        >
                          <Download className="size-3.5 shrink-0" />
                          Download
                        </Button>
                      </div>
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
        </div>

        {footer ? (
          <DialogFooter className="shrink-0 gap-2 border-t border-border px-4 py-3 sm:px-5">
            {footer}
          </DialogFooter>
        ) : null}
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
    <div className="flex min-w-0 items-start gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}
