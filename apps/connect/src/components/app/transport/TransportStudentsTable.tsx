import { Users } from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import type { RouteStudentRow } from "@/lib/transport/types";
import { Badge, cn } from "@lumenx/ui";

const STATUS_LABEL: Record<RouteStudentRow["status"], string> = {
  waiting: "Waiting",
  picked_up: "Picked up",
  on_bus: "On bus",
  dropped_school: "At school",
  absent: "Absent",
};

const STATUS_TONE: Record<RouteStudentRow["status"], string> = {
  waiting: "border-warning/40 text-warning-foreground bg-warning/5",
  picked_up: "border-primary/40 text-primary bg-primary/5",
  on_bus: "border-primary/40 text-primary bg-primary/5",
  dropped_school: "border-success/40 text-success bg-success/5",
  absent: "border-border text-muted-foreground bg-muted/30",
};

export function TransportStudentsTable({ students }: { students: RouteStudentRow[] }) {
  const onBus = students.filter((s) => s.status === "picked_up" || s.status === "on_bus").length;
  const waiting = students.filter((s) => s.status === "waiting").length;

  return (
    <SectionCard
      title="Students on route"
      action={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="size-3.5" />
          {onBus} on bus · {waiting} waiting
        </div>
      }
    >
      <div className="overflow-x-auto -mx-1">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="p-2 font-medium">Student</th>
              <th className="p-2 font-medium">Class</th>
              <th className="p-2 font-medium">Roll</th>
              <th className="p-2 font-medium">Pickup stop</th>
              <th className="p-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.studentId} className="border-b border-border/60 last:border-0">
                <td className="p-2 font-medium">{student.studentName}</td>
                <td className="p-2 text-muted-foreground">{student.className}</td>
                <td className="p-2 tabular-nums">{student.rollNo}</td>
                <td className="p-2 text-muted-foreground">{student.pickupStop}</td>
                <td className="p-2">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px]", STATUS_TONE[student.status])}
                  >
                    {STATUS_LABEL[student.status]}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
