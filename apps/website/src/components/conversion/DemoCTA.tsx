import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";
import type { DemoFlowId } from "@/content/demos";
import { DEMO_FLOWS } from "@/content/demos";
import { CTAButton } from "./CTAButton";

export function DemoCTA({
  product,
  demo,
  children,
  variant = "secondary",
}: {
  product?: ProductId;
  demo?: DemoFlowId;
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const label =
    children ??
    (demo ? DEMO_FLOWS.find((item) => item.id === demo)?.title : null) ??
    (product ? `View ${PRODUCT_FAMILY[product].shortName} preview` : "View preview");
  const search = {
    ...(demo ? { demo } : {}),
    ...(product ? { product } : {}),
  };
  return (
    <CTAButton asChild variant={variant} size="md">
      <Link to="/demo" search={search}>
        {label}
      </Link>
    </CTAButton>
  );
}
