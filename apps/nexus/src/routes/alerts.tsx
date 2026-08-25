import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy Admin-clone alerts — platform policies live at /policies. */
export const Route = createFileRoute("/alerts")({
  beforeLoad: () => {
    throw redirect({ to: "/policies" });
  },
});
