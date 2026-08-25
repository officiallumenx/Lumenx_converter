import type { ReactNode } from "react";
import { Grid } from "../layout/Grid";
import { WorkflowStep } from "../visual/WorkflowStep";

export type WorkflowItem = {
  title: string;
  body: ReactNode;
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
          {step.body}
        </WorkflowStep>
      ))}
    </Grid>
  );
}
