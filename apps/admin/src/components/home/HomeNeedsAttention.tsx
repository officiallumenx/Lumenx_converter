import type { CSSProperties } from "react";
import type { AttentionItem, AttentionSeverity } from "@/lib/dashboard";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BookMarked,
  Briefcase,
  Bus,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  GraduationCap,
  MessageSquareWarning,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

function iconFor(id: string): LucideIcon {
  switch (id) {
    case "transport-sos":
    case "transport-stops":
    case "transport-assignments":
      return Bus;
    case "marks-review":
      return FileCheck2;
    case "leave":
      return ClipboardList;
    case "complaints":
      return MessageSquareWarning;
    case "diary-missing":
      return BookMarked;
    case "attendance-drafts":
      return ClipboardList;
    case "admissions":
      return UserPlus;
    case "careers":
      return Briefcase;
    default:
      return GraduationCap;
  }
}

function chipClass(id: string, severity: AttentionSeverity): string {
  if (id === "diary-missing") return "lx-home-att-chip lx-home-att-chip--orange";
  if (id === "attendance-drafts") return "lx-home-att-chip lx-home-att-chip--info";
  if (id === "marks-review") return "lx-home-att-chip lx-home-att-chip--purple";
  if (id === "leave") return "lx-home-att-chip lx-home-att-chip--info";
  if (severity === "critical" || severity === "urgent") return "lx-home-att-chip lx-home-att-chip--critical";
  if (severity === "attention") return "lx-home-att-chip lx-home-att-chip--attention";
  return "lx-home-att-chip lx-home-att-chip--info";
}

function badgeClass(id: string, severity: AttentionSeverity): string {
  if (id === "diary-missing") return "lx-home-att-badge lx-home-att-badge--orange";
  if (id === "attendance-drafts") return "lx-home-att-badge lx-home-att-badge--blue";
  if (id === "marks-review") return "lx-home-att-badge lx-home-att-badge--purple";
  if (id === "leave") return "lx-home-att-badge lx-home-att-badge--blue";
  if (severity === "critical" || severity === "urgent") return "lx-home-att-badge lx-home-att-badge--red";
  return "lx-home-att-badge lx-home-att-badge--amber";
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
      <section className="lx-home-section lx-home-panel lx-home-attention" style={{ "--lx-home-i": 3 } as CSSProperties}>
        <div className="lx-home-attention__head">
          <div className="skeleton h-5 w-36 rounded-md" />
          <div className="skeleton h-5 w-8 rounded-full" />
        </div>
        <div className="space-y-2 px-0.5">
          <div className="skeleton h-11 rounded-xl" />
          <div className="skeleton h-11 rounded-xl" />
          <div className="skeleton h-11 rounded-xl" />
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section
        className="lx-home-section lx-home-healthy"
        style={{ "--lx-home-i": 3 } as CSSProperties}
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
    <section className="lx-home-section lx-home-panel lx-home-attention" style={{ "--lx-home-i": 3 } as CSSProperties}>
      <div className="lx-home-attention__head">
        <div className="lx-home-attention__title-row">
          <span className="lx-home-attention__warn" aria-hidden>
            <AlertTriangle className="size-3.5" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="lx-home-panel__title">Needs Attention</h2>
              <span className="lx-home-att-badge lx-home-att-badge--red">{total}</span>
            </div>
            <p className="lx-home-panel__hint mt-0.5">Items that need your action</p>
          </div>
        </div>
      </div>
      <ul className="lx-home-attention-list">
        {items.map((item) => {
          const Icon = iconFor(item.id);
          return (
            <li key={item.id}>
              <Link
                to={item.to}
                search={item.search}
                className="lx-home-attention-row"
              >
                <span className={chipClass(item.id, item.severity)} aria-hidden>
                  <Icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground leading-snug">
                    {item.label}
                  </span>
                </span>
                <span className={badgeClass(item.id, item.severity)}>{item.count}</span>
                <span className="lx-home-attention-action" aria-hidden>
                  →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
