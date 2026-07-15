import { GripVertical } from "lucide-react";
import {
  subjectTheme,
  writeTimetableDrag,
  type TimetableDragPayload,
} from "@/components/timetable/timetable-theme";

export function TimetableSubjectPalette({
  subjects,
}: {
  subjects: { id: string; name: string; code: string }[];
}) {
  if (subjects.length === 0) return null;

  return (
    <div className="lx-timetable-palette">
      <span className="lx-timetable-palette__label">Drag subjects onto empty periods</span>
      <div className="lx-timetable-palette__items">
        {subjects.map((sub) => {
          const theme = subjectTheme(sub.code);
          const payload: TimetableDragPayload = {
            kind: "subject",
            subjectId: sub.id,
            code: sub.code,
            name: sub.name,
          };
          return (
            <div
              key={sub.id}
              draggable
              onDragStart={(e) => writeTimetableDrag(e.dataTransfer, payload)}
              className={`lx-timetable-palette__chip ${theme.bg} ${theme.border}`}
              title={`Drag ${sub.name} to a period`}
            >
              <GripVertical className="size-3 shrink-0 opacity-50" aria-hidden />
              <span className="truncate">{sub.name}</span>
              <span className="text-[10px] font-mono opacity-70">{sub.code}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
