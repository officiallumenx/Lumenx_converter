import { ArrowLeft } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/constants";

/** Shared back control for More subpages. */
export function MoreBackButton() {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => void navigate({ to: ROUTES.more })}
    >
      <ArrowLeft aria-hidden />
      More
    </Button>
  );
}
