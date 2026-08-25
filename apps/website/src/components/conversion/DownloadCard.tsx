import type { ReactNode } from "react";
import type { ProductId } from "@/theme/products";
import { SiteCard } from "../SiteCard";

export function DownloadCard({
  product,
  id,
  title,
  note,
  children,
}: {
  product: ProductId;
  id?: string;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <SiteCard id={id} product={product} className="scroll-mt-24">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {note ? <p className="mt-1 text-sm text-muted-foreground">{note}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </SiteCard>
  );
}
