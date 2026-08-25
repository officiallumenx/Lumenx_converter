import { useState } from "react";
import { cn } from "@lumenx/ui";
import { DEMO_STUDENT } from "@/content/demos";
import { DemoNotice, DemoPhone, DemoScene } from "./DemoUI";

type Mark = "P" | "A" | "L" | "";

const ROSTER: { id: string; name: string }[] = [
  { id: "aanya", name: DEMO_STUDENT.name },
  { id: "vihaan", name: "Vihaan" },
  { id: "sana", name: "Sana" },
];

function statusLabel(mark: Mark) {
  if (mark === "P") return "Present";
  if (mark === "A") return "Absent";
  if (mark === "L") return "Late";
  return "Not marked";
}

export function AttendanceDemo() {
  const [marks, setMarks] = useState<Record<string, Mark>>({
    aanya: "",
    vihaan: "P",
    sana: "",
  });
  const [focus, setFocus] = useState("aanya");
  const mark = marks[focus] ?? "";
  const student = ROSTER.find((row) => row.id === focus) ?? ROSTER[0];

  function setMark(id: string, next: Mark) {
    setFocus(id);
    setMarks((prev) => ({ ...prev, [id]: next }));
  }

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Mark the class in Connect. The office would read the same day in Admin. Absence sends a parent notice;
        presence updates the family view without inventing a “present” template.
      </p>
      <DemoScene bridged>
        <DemoPhone product="connect" title="Teacher · Connect">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {DEMO_STUDENT.classLabel}
          </p>
          <ul className="mt-3 space-y-2">
            {ROSTER.map((row) => (
              <li key={row.id} className="rounded-lg border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{row.name}</span>
                  <span className="text-[11px] text-muted-foreground">{statusLabel(marks[row.id] ?? "")}</span>
                </div>
                <div className="mt-2 flex gap-1">
                  {(["P", "A", "L"] as const).map((code) => (
                    <button
                      key={code}
                      type="button"
                      className={cn(
                        "min-h-10 min-w-10 rounded-full text-xs font-semibold",
                        marks[row.id] === code ? "bg-foreground text-background" : "bg-muted",
                      )}
                      onClick={() => setMark(row.id, code)}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </DemoPhone>
        <DemoPhone product="connect" title="Parent · Connect">
          <p className="text-sm font-medium">{student.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{DEMO_STUDENT.classLabel} · today</p>
          <p className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
            Attendance · {statusLabel(mark)}
          </p>
          <div className="mt-3">
            {mark === "A" ? (
              <DemoNotice
                title={`Absence recorded · ${student.name}`}
                body={`${student.name} was marked absent (Morning) today for class 8-A.`}
                priority="important"
                category="attendance"
                href="/attendance"
              />
            ) : mark === "P" || mark === "L" ? (
              <p className="text-xs text-muted-foreground">
                Status is on the child’s home. Absence alerts are parent-only — no extra present notification.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Mark {student.name} to see the family view update.</p>
            )}
          </div>
        </DemoPhone>
      </DemoScene>
    </div>
  );
}
