import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone — exams belong in Admin. */
export const Route = createFileRoute("/exams")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
