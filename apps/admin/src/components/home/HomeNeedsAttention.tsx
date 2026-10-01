import type { CSSProperties } from "react";
import type { AttentionItem, AttentionSeverity } from "@/lib/dashboard";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Pill } from "@lumenx/ui-admin";

function severityTone(severity: AttentionSeverity): "danger" | "warning" | "info" | "neutral" {
  if (severity === "critical" || severity === "urgent") return "danger";
  if (severity === "attention") return "warning";
  return "info";
}

function severityDotClass(severity: AttentionSeverity): string {
  if (severity === "critical") return "lx-home-dot lx-home-dot--critical";
  if (severity === "urgent") return "lx-home-dot lx-home-dot--urgent";
  if (severity === "attention") return "lx-home-dot lx-home-dot--attention";
  return "lx-home-dot lx-home-dot--info";
}

export function HomeNeedsAttention({
  items,
  loading,
}: {
  items: AttentionItem[];
  loading?: boolean;
}) {
  if (loading && items.length === 0) {
    return (
      <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 2 } as CSSProperties}>
        <div className="lx-home-panel__head">
          <h2 className="lx-home-panel__title">Needs Attention</h2>
        </div>
        <div className="space-y-2 px-1">
          <div className="skeleton h-10 rounded-lg" />
          <div className="skeleton h-10 rounded-lg" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        className="lx-home-section lx-home-healthy"
        style={{ "--lx-home-i": 2 } as CSSProperties}
        aria-live="polite"
      >
        <CheckCircle2 className="size-4 text-success shrink-0" aria-hidden />
        <p className="text-sm text-muted-foreground">
          All clear — nothing needs attention right now.
        </p>
      </section>
    );
  }

  const total = items.reduce((s, i) => s + i.count, 0);

  return (
    <section className="lx-home-section lx-home-panel" style={{ "--lx-home-i": 2 } as CSSProperties}>
      <div className="lx-home-panel__head">
        <h2 className="lx-home-panel__title">Needs Attention</h2>
        <Pill tone="warning">{total}</Pill>
      </div>
      <ul className="lx-home-attention-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={item.to}
              search={item.search}
              className="lx-home-attention-row"
            >
              <span className={severityDotClass(item.severity)} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground leading-snug">
                  {item.label}
                </span>
              </span>
              <Pill tone={severityTone(item.severity)}>{item.count}</Pill>
              <span className="lx-home-attention-action">
                {item.actionLabel}
                <ArrowUpRight className="size-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
