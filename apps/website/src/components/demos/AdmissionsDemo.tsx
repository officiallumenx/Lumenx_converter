import { useState } from "react";
import { DEMO_STUDENT } from "@/content/demos";
import { DemoPhone, DemoScene, DemoStepper } from "./DemoUI";

const STEPS = [
  {
    id: "discover",
    label: "Discover",
    title: "Test1School · Grade 8",
    body: "4 seats open for 2026–27. Programs and openings before apply.",
  },
  {
    id: "apply",
    label: "Apply",
    title: "Application started",
    body: `${DEMO_STUDENT.name} · Grade 8 · details in progress.`,
  },
  {
    id: "document",
    label: "Documents",
    title: "Documents attached",
    body: "Birth certificate and prior report · 2 files on the application.",
  },
  {
    id: "review",
    label: "Review",
    title: "In review",
    body: "Office reads the same file in the Admissions portal.",
  },
  {
    id: "interview",
    label: "Interview",
    title: "Verification",
    body: "Interview outcome is recorded on the application. This release does not ship a separate interview calendar.",
  },
  {
    id: "decision",
    label: "Decision",
    title: "Approved",
    body: "Parent confirmation can follow. Waitlisted and rejected are other stages on the same file.",
  },
  {
    id: "admission",
    label: "Admission",
    title: "Convert to student",
    body: "Admin writes the student record. The family then uses Connect — Admissions does not stay their app.",
  },
] as const;

export function AdmissionsDemo() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Admissions is a Connect portal. The pipeline stays on one application until Admin converts it to a student.
      </p>
      <DemoStepper steps={STEPS} index={index} onIndex={setIndex} onReset={() => setIndex(0)} />
      <div className="mt-6">
        <DemoScene bridged>
          <DemoPhone product="admissions" title="Applicant · portal">
            <ol className="space-y-2 text-sm">
              {STEPS.map((item, i) => (
                <li
                  key={item.id}
                  className={
                    i === index
                      ? "rounded-lg border border-foreground bg-foreground text-background px-3 py-2"
                      : i < index
                        ? "rounded-lg border bg-muted/40 px-3 py-2"
                        : "rounded-lg border px-3 py-2 text-muted-foreground"
                  }
                >
                  {i + 1}. {item.label}
                </li>
              ))}
            </ol>
          </DemoPhone>
          <DemoPhone product="admin" title="Office · Admin">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {DEMO_STUDENT.name} · Grade 8
            </p>
            <p className="mt-2 text-base font-semibold">{step.title}</p>
            <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
          </DemoPhone>
        </DemoScene>
      </div>
    </div>
  );
}
