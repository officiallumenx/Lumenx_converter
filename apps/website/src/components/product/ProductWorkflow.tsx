import type { ReactNode } from "react";
import { Grid } from "../layout/Grid";
import { WorkflowStep } from "../visual/WorkflowStep";

export type WorkflowItem = {
  title: string;
  body?: ReactNode;
  points?: readonly string[];
};

export function ProductWorkflow({
  steps,
  columns = 3,
}: {
  steps: readonly WorkflowItem[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <Grid columns={columns} stagger>
      {steps.map((step, i) => (
        <WorkflowStep key={step.title} step={i + 1} title={step.title}>
          {step.body ? <p>{step.body}</p> : null}
          {step.points?.length ? (
            <ul className={step.body ? "mt-3 list-disc space-y-1.5 pl-4" : "list-disc space-y-1.5 pl-4"}>
              {step.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          ) : null}
        </WorkflowStep>
      ))}
    </Grid>
  );
}
