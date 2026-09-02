import { createFileRoute } from "@tanstack/react-router";
import { CareersHomePage } from "@/careers-portal/features/home/CareersHomePage";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Careers — LumenX Connect" }] }),
  component: CareersHomePage,
});
